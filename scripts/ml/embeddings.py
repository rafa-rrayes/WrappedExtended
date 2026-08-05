"""Neural-style embeddings of your listening via PPMI + Truncated SVD.

Treats each listening session as a "sentence" of artists. We build a windowed
co-occurrence matrix, weight it with Positive Pointwise Mutual Information, and
factorize it with Truncated SVD. Levy & Goldberg (2014) showed this factorizes
the same matrix skip-gram word2vec implicitly does — so the resulting vectors
capture YOUR personal notion of artist similarity (artists you play together end
up close), with no fragile native build step.

Outputs: personal similar-artist graph, auto-discovered "scenes" (KMeans on the
embedding space), and a t-SNE taste map (taste_map.png).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import scipy.sparse as sp
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.manifold import TSNE  # fallback if UMAP is unavailable

VECTOR_SIZE = 96
WINDOW = 8
MIN_COUNT = 8          # token must appear >= this many times to get a vector
N_SCENES = 12          # auto-discovered clusters
MAP_ARTISTS = 600      # how many top artists to place on the t-SNE map


class Embeddings:
    """Tiny gensim-like wrapper around L2-normalized SVD vectors."""

    def __init__(self, vectors: np.ndarray, index_to_key: list[str]):
        self.index_to_key = index_to_key
        self._stoi = {k: i for i, k in enumerate(index_to_key)}
        norms = np.linalg.norm(vectors, axis=1, keepdims=True) + 1e-9
        self.unit = vectors / norms
        self.raw = vectors

    def __contains__(self, key):
        return key in self._stoi

    def __getitem__(self, key):
        return self.raw[self._stoi[key]]

    def most_similar(self, key, topn=6):
        v = self.unit[self._stoi[key]]
        sims = self.unit @ v
        order = np.argsort(-sims)
        out = []
        for i in order:
            if self.index_to_key[i] == key:
                continue
            out.append((self.index_to_key[i], float(sims[i])))
            if len(out) >= topn:
                break
        return out


def _embed(df: pd.DataFrame, col: str, min_count: int) -> Embeddings | None:
    counts = df[col].value_counts()
    vocab = [k for k, c in counts.items() if c >= min_count]
    if len(vocab) < 5:
        return None
    stoi = {k: i for i, k in enumerate(vocab)}
    V = len(vocab)

    # Collect windowed co-occurrence pairs, session by session
    rows, cols = [], []
    for _, seq in df.dropna(subset=[col]).groupby("session_id")[col]:
        toks = np.fromiter((stoi[a] for a in seq if a in stoi), dtype=np.int64)
        if toks.size < 2:
            continue
        for d in range(1, WINDOW + 1):
            if toks.size <= d:
                break
            rows.append(toks[:-d]); cols.append(toks[d:])
    if not rows:
        return None
    r = np.concatenate(rows); c = np.concatenate(cols)
    data = np.ones(r.size, dtype=np.float64)
    C = sp.coo_matrix((data, (r, c)), shape=(V, V)).tocsr()
    C = C + C.T  # symmetric

    # PPMI weighting on the nonzero entries
    total = C.sum()
    word = np.asarray(C.sum(axis=1)).ravel() + 1e-9
    C = C.tocoo()
    pmi = np.log((C.data * total) / (word[C.row] * word[C.col]) + 1e-12)
    ppmi = np.maximum(pmi, 0.0)
    M = sp.csr_matrix((ppmi, (C.row, C.col)), shape=(V, V))

    k = min(VECTOR_SIZE, V - 1)
    vectors = TruncatedSVD(n_components=k, random_state=42).fit_transform(M)
    return Embeddings(vectors, vocab)


def run(df: pd.DataFrame, outdir) -> dict:
    plays = df["artist_name"].value_counts()

    a_emb = _embed(df, "artist_name", MIN_COUNT)
    t_emb = _embed(df, "track_name", max(MIN_COUNT, 10))
    if a_emb is None:
        return {"error": "not enough data to embed artists"}

    vocab = a_emb.index_to_key
    n_sessions = int(df["session_id"].nunique())

    # ── Personal similar-artist graph for your top artists ──────────────────
    top_artists = [a for a in plays.index if a in a_emb][:20]
    similar = {
        a: [{"artist": s, "score": round(v, 3)} for s, v in a_emb.most_similar(a, topn=6)]
        for a in top_artists
    }

    # ── Auto-discovered scenes (KMeans over the embedding space) ────────────
    scene_pool = [a for a in vocab if plays.get(a, 0) >= 15]
    Xn = a_emb.unit[[a_emb._stoi[a] for a in scene_pool]]
    k = min(N_SCENES, max(2, len(scene_pool) // 20))
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(Xn)

    scenes = []
    for c in range(k):
        members = [scene_pool[i] for i in range(len(scene_pool)) if km.labels_[i] == c]
        members.sort(key=lambda a: plays.get(a, 0), reverse=True)
        hours = float(df[df["artist_name"].isin(members)]["hours_played"].sum())
        scenes.append({"scene": c, "size": len(members), "hours": round(hours, 1),
                       "top_artists": members[:8]})
    scenes.sort(key=lambda s: s["hours"], reverse=True)

    # ── Similar tracks to your most-played track ────────────────────────────
    track_plays = df["track_name"].value_counts()
    similar_tracks, top_track = [], None
    if t_emb is not None:
        top_track = next((t for t in track_plays.index if t in t_emb), None)
        if top_track:
            similar_tracks = [{"track": s, "score": round(v, 3)}
                              for s, v in t_emb.most_similar(top_track, topn=8)]

    # ── Taste map (UMAP, t-SNE fallback): static PNG + interactive HTML ──────
    hours_by_artist = df.groupby("artist_name")["hours_played"].sum()
    scene_names = {sc["scene"]: ", ".join(sc["top_artists"][:2]) for sc in scenes}

    map_artists = [a for a in plays.index if a in a_emb]   # all embedded, top-played first
    Mn = a_emb.unit[[a_emb._stoi[a] for a in map_artists]]
    labels = km.predict(Mn)

    # 2-D projection → static PNG for the report (top artists, kept legible)
    n_png = min(MAP_ARTISTS, len(map_artists))
    coords2d, projection = _project(Mn[:n_png], n_components=2)
    _plot_map(coords2d, labels[:n_png], map_artists[:n_png], plays, projection,
              outdir / "taste_map.png")

    # 3-D projection → interactive Plotly map (all embedded artists)
    coords3d, _ = _project(Mn, n_components=3)
    _plot_interactive(coords3d, labels, map_artists, plays, hours_by_artist, scene_names,
                      projection, outdir / "taste_map.html")

    return {
        "method": "PPMI + Truncated SVD (word2vec-equivalent)",
        "projection": projection,
        "interactive_map": "taste_map.html",
        "artists_plotted": len(map_artists),
        "model": {
            "artists_embedded": len(vocab),
            "tracks_embedded": (len(t_emb.index_to_key) if t_emb else 0),
            "vector_size": VECTOR_SIZE,
            "sessions_used": n_sessions,
        },
        "similar_artists": similar,
        "scenes": scenes,
        "similar_to_top_track": {"track": top_track, "neighbors": similar_tracks},
    }


def _project(Mn: np.ndarray, n_components: int = 2) -> tuple[np.ndarray, str]:
    """Project the embedding space to n_components. UMAP (cosine) w/ t-SNE fallback."""
    try:
        import umap  # umap-learn
        n_neighbors = min(15, max(5, len(Mn) // 10))
        reducer = umap.UMAP(
            n_components=n_components, n_neighbors=n_neighbors, min_dist=0.1,
            metric="cosine", random_state=42,
        )
        return reducer.fit_transform(Mn), "UMAP"
    except Exception:
        perp = min(30, max(5, len(Mn) // 4))
        coords = TSNE(n_components=n_components, perplexity=perp, init="pca",
                      learning_rate="auto", random_state=42).fit_transform(Mn)
        return coords, "t-SNE"


def _plot_interactive(coords, labels, artists, plays, hours, scene_names, projection, path):
    """Self-contained interactive 3-D Plotly taste map — drag to rotate, hover for names."""
    import plotly.express as px
    import plotly.io as pio

    n_play = np.array([int(plays.get(a, 0)) for a in artists])
    # Always-on labels for the 15 most-played artists; the rest reveal on hover.
    big = set(np.argsort(-n_play)[:15].tolist())
    dfp = pd.DataFrame({
        "x": coords[:, 0],
        "y": coords[:, 1],
        "z": coords[:, 2],
        "artist": artists,
        "plays": n_play,
        "hours": [round(float(hours.get(a, 0)), 1) for a in artists],
        "scene": [scene_names.get(int(l), f"Scene {int(l)}") for l in labels],
        "size": np.log1p(n_play),
        "label": [a if i in big else "" for i, a in enumerate(artists)],
    })
    # Order legend by total hours per scene (most-listened first)
    scene_order = (
        dfp.groupby("scene")["hours"].sum().sort_values(ascending=False).index.tolist()
    )

    fig = px.scatter_3d(
        dfp, x="x", y="y", z="z", color="scene", size="size", size_max=24,
        text="label", hover_name="artist",
        hover_data={"plays": True, "hours": ":.1f", "scene": True,
                    "x": False, "y": False, "z": False, "size": False, "label": False},
        category_orders={"scene": scene_order},
        color_discrete_sequence=px.colors.qualitative.Light24,
        title=(f"Your Taste Map in 3-D — {len(artists):,} artists · embeddings (PPMI-SVD) → "
               f"{projection} · drag to rotate · scroll to zoom · hover for names"),
    )
    fig.update_traces(
        marker=dict(line=dict(width=0), opacity=0.8),
        textfont=dict(size=9, color="white"),
    )
    hidden = dict(showbackground=False, showgrid=False, zeroline=False,
                  showticklabels=False, title="")
    fig.update_layout(
        template="plotly_dark",
        paper_bgcolor="#0b0b0d",
        legend=dict(title="Auto-discovered scene", itemsizing="constant"),
        margin=dict(l=0, r=0, t=60, b=0), height=860,
        scene=dict(xaxis=hidden, yaxis=hidden, zaxis=hidden, bgcolor="#0b0b0d"),
    )
    pio.write_html(fig, str(path), include_plotlyjs=True, full_html=True)


def _plot_map(coords, labels, artists, plays, projection, path):
    sizes = np.array([np.log1p(plays.get(a, 1)) for a in artists])
    sizes = 12 + 90 * (sizes - sizes.min()) / (np.ptp(sizes) + 1e-9)

    fig, ax = plt.subplots(figsize=(15, 11))
    fig.patch.set_facecolor("#0b0b0d")
    ax.set_facecolor("#0b0b0d")
    ax.scatter(coords[:, 0], coords[:, 1], c=labels, s=sizes,
               cmap="turbo", alpha=0.82, edgecolors="none")
    order = np.argsort([-plays.get(a, 0) for a in artists])[:28]
    for i in order:
        ax.annotate(artists[i], (coords[i, 0], coords[i, 1]),
                    fontsize=8.5, color="white", weight="bold",
                    xytext=(4, 4), textcoords="offset points")
    ax.set_title(
        f"Your Taste Map — artist embeddings (PPMI-SVD, {projection} projection)\n"
        "proximity = you play them in the same sessions · color = auto-discovered scene · size = play count",
        color="white", fontsize=13, pad=16,
    )
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    plt.tight_layout()
    fig.savefig(path, dpi=130, facecolor=fig.get_facecolor())
    plt.close(fig)
