"""Neural-style embeddings of a listening history via PPMI + Truncated SVD.

Treats each listening session as a "sentence" of artists. We build a windowed
co-occurrence matrix, weight it with Positive Pointwise Mutual Information, and factorize
it with Truncated SVD. Levy & Goldberg (2014) showed this factorizes the same matrix
skip-gram word2vec implicitly does — so the resulting vectors capture the *user's* personal
notion of artist similarity (artists played together end up close), with no native build.

Emits JSON only: a similar-artist graph, auto-discovered "scenes" (KMeans over the
embedding space), and the 2-D projected coordinates of the taste map (the frontend draws
the scatter). The projection uses UMAP when `umap-learn` is installed and falls back to
t-SNE otherwise — the default backend image ships without UMAP, so t-SNE is the norm.

Ported from `scripts/ml/embeddings.py`; plotting stripped, `points` added.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
import scipy.sparse as sp
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.manifold import TSNE  # fallback when UMAP is unavailable

logger = logging.getLogger(__name__)

VECTOR_SIZE = 96
WINDOW = 8
MIN_COUNT = 8  # token must appear >= this many times to get a vector
N_SCENES = 12  # auto-discovered clusters
MAX_POINTS = 3000  # cap on artists returned as map coordinates (payload size)


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

    def index(self, key) -> int:
        return self._stoi[key]

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
    n_vocab = len(vocab)

    # Collect windowed co-occurrence pairs, session by session
    rows, cols = [], []
    for _, seq in df.dropna(subset=[col]).groupby("session_id")[col]:
        toks = np.fromiter((stoi[a] for a in seq if a in stoi), dtype=np.int64)
        if toks.size < 2:
            continue
        for d in range(1, WINDOW + 1):
            if toks.size <= d:
                break
            rows.append(toks[:-d])
            cols.append(toks[d:])
    if not rows:
        return None
    r = np.concatenate(rows)
    c = np.concatenate(cols)
    data = np.ones(r.size, dtype=np.float64)
    cooc = sp.coo_matrix((data, (r, c)), shape=(n_vocab, n_vocab)).tocsr()
    cooc = cooc + cooc.T  # symmetric

    # PPMI weighting on the nonzero entries
    total = cooc.sum()
    word = np.asarray(cooc.sum(axis=1)).ravel() + 1e-9
    cooc = cooc.tocoo()
    pmi = np.log((cooc.data * total) / (word[cooc.row] * word[cooc.col]) + 1e-12)
    ppmi = np.maximum(pmi, 0.0)
    matrix = sp.csr_matrix((ppmi, (cooc.row, cooc.col)), shape=(n_vocab, n_vocab))

    k = min(VECTOR_SIZE, n_vocab - 1)
    vectors = TruncatedSVD(n_components=k, random_state=42).fit_transform(matrix)
    return Embeddings(vectors, vocab)


def run(df: pd.DataFrame) -> dict:
    plays = df["artist_name"].value_counts()

    a_emb = _embed(df, "artist_name", MIN_COUNT)
    t_emb = _embed(df, "track_name", max(MIN_COUNT, 10))
    if a_emb is None:
        return {"error": "not enough data to embed artists"}

    vocab = a_emb.index_to_key
    n_sessions = int(df["session_id"].nunique())
    hours_by_artist = df.groupby("artist_name")["hours_played"].sum()

    # ── Personal similar-artist graph for the top artists ────────────────────
    top_artists = [a for a in plays.index if a in a_emb][:20]
    similar = {
        a: [{"artist": s, "score": round(v, 3)} for s, v in a_emb.most_similar(a, topn=6)]
        for a in top_artists
    }

    # ── Auto-discovered scenes (KMeans over the embedding space) ─────────────
    scene_pool = [a for a in vocab if plays.get(a, 0) >= 15]
    if len(scene_pool) < 2:
        scene_pool = vocab
    scene_matrix = a_emb.unit[[a_emb.index(a) for a in scene_pool]]
    k = min(N_SCENES, max(2, len(scene_pool) // 20))
    km = KMeans(n_clusters=k, n_init=10, random_state=42).fit(scene_matrix)

    scenes = []
    for c in range(k):
        members = [scene_pool[i] for i in range(len(scene_pool)) if km.labels_[i] == c]
        members.sort(key=lambda a: plays.get(a, 0), reverse=True)
        hours = float(df[df["artist_name"].isin(members)]["hours_played"].sum())
        scenes.append(
            {
                "scene": c,
                "label": ", ".join(members[:2]) or f"Scene {c}",
                "artists": members[:8],
                "size": len(members),
                "hours": round(hours, 1),
            }
        )
    scenes.sort(key=lambda s: s["hours"], reverse=True)

    # ── Similar tracks to the most-played track ──────────────────────────────
    track_plays = df["track_name"].value_counts()
    similar_tracks, top_track = [], None
    if t_emb is not None:
        top_track = next((t for t in track_plays.index if t in t_emb), None)
        if top_track:
            similar_tracks = [
                {"track": s, "score": round(v, 3)}
                for s, v in t_emb.most_similar(top_track, topn=8)
            ]

    # ── Taste map: 2-D coordinates for the frontend scatter ──────────────────
    # Ordered by play count, so the cap keeps the artists a user actually recognises.
    map_artists = [a for a in plays.index if a in a_emb][:MAX_POINTS]
    map_matrix = a_emb.unit[[a_emb.index(a) for a in map_artists]]
    labels = km.predict(map_matrix)
    coords, projection = _project(map_matrix, n_components=2)

    points = [
        {
            "artist": a,
            "x": round(float(coords[i, 0]), 3),
            "y": round(float(coords[i, 1]), 3),
            "scene": int(labels[i]),
            "hours": round(float(hours_by_artist.get(a, 0.0)), 2),
        }
        for i, a in enumerate(map_artists)
    ]

    return {
        "method": "PPMI + Truncated SVD (word2vec-equivalent)",
        "projection": projection,
        "artists_plotted": len(points),
        "points": points,
        "scenes": scenes,
        "similar_artists": similar,
        "model": {
            "artists_embedded": len(vocab),
            "tracks_embedded": (len(t_emb.index_to_key) if t_emb else 0),
            "vector_size": VECTOR_SIZE,
            "sessions_used": n_sessions,
        },
        "similar_to_top_track": {"track": top_track, "neighbors": similar_tracks},
    }


def _project(matrix: np.ndarray, n_components: int = 2) -> tuple[np.ndarray, str]:
    """Project the embedding space down. UMAP (cosine) when available, else t-SNE.

    `umap-learn` is not in the default backend install (see the `ml-deep` extra), so the
    t-SNE branch is the one that normally runs. Both are seeded for determinism.
    """
    try:
        import umap  # umap-learn

        n_neighbors = min(15, max(5, len(matrix) // 10))
        reducer = umap.UMAP(
            n_components=n_components,
            n_neighbors=n_neighbors,
            min_dist=0.1,
            metric="cosine",
            random_state=42,
        )
        return reducer.fit_transform(matrix), "UMAP"
    except Exception as exc:
        logger.info("UMAP unavailable (%s) — projecting with t-SNE", exc)
        perp = min(30, max(5, len(matrix) // 4))
        coords = TSNE(
            n_components=n_components,
            perplexity=perp,
            init="pca",
            learning_rate="auto",
            random_state=42,
        ).fit_transform(matrix)
        return coords, "t-SNE"
