"""Discover your listening "modes" by clustering sessions on behavioral features.

Each session becomes a feature vector (length, time of day, skip/shuffle rates,
artist diversity, completion, platform mix). KMeans groups them into modes which
we name heuristically (e.g. Focus Deep-Dive, Shuffle Party, Discovery, Background).
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

N_MODES = 5


def _session_features(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("session_id")
    feats = pd.DataFrame({
        "n_plays": g.size(),
        "hours": g["hours_played"].sum(),
        "mean_min_played": g["minutes_played"].mean(),
        "skip_rate": g["skipped"].mean(),
        "shuffle_rate": g["shuffle"].mean(),
        "offline_rate": g["offline"].mean(),
        "artist_diversity": g["artist_name"].nunique() / g.size(),
        "start_hour": g["hour"].median(),
        "weekend": g["is_weekend"].mean(),
    })
    feats["repeat_ratio"] = 1 - feats["artist_diversity"]
    feats["is_night"] = ((feats["start_hour"] >= 22) | (feats["start_hour"] <= 5)).astype(float)
    return feats.dropna()


def _name_mode(p: dict) -> str:
    """Heuristic label from a mode's average profile (checked most-specific first)."""
    if p["is_night"] > 0.5:
        return "Late-Night Listening"
    if p["skip_rate"] > 0.35:
        return "Restless Skipping"
    if p["shuffle_rate"] > 0.6 and p["artist_diversity"] > 0.55:
        return "Shuffle Party"
    if p["artist_diversity"] > 0.85 and p["mean_min_played"] < 2.5:
        return "Discovery / Sampling"
    if p["shuffle_rate"] < 0.25 and p["skip_rate"] < 0.15:
        return "Focus / Album Listening"
    if p["n_plays"] <= 6:
        return "Quick Hit"
    return "Background Flow"


def run(df: pd.DataFrame, outdir) -> dict:
    feats = _session_features(df)
    cols = [
        "n_plays", "mean_min_played", "skip_rate", "shuffle_rate", "offline_rate",
        "artist_diversity", "start_hour", "weekend", "is_night",
    ]
    X = StandardScaler().fit_transform(feats[cols])
    km = KMeans(n_clusters=N_MODES, n_init=10, random_state=42).fit(X)
    feats["mode"] = km.labels_

    modes = []
    for c in range(N_MODES):
        sub = feats[feats["mode"] == c]
        profile = {col: float(sub[col].mean()) for col in cols}
        modes.append({
            "mode": c,
            "name": _name_mode(profile),
            "n_sessions": int(len(sub)),
            "pct_sessions": round(100 * len(sub) / len(feats), 1),
            "total_hours": round(float(sub["hours"].sum()), 1),
            "avg_plays": round(profile["n_plays"], 1),
            "avg_min_per_track": round(profile["mean_min_played"], 2),
            "skip_rate": round(profile["skip_rate"], 3),
            "shuffle_rate": round(profile["shuffle_rate"], 3),
            "artist_diversity": round(profile["artist_diversity"], 3),
            "median_start_hour": round(profile["start_hour"], 1),
        })
    modes.sort(key=lambda m: m["total_hours"], reverse=True)

    # Defensive: disambiguate any duplicate names (II, III, …)
    seen: dict[str, int] = {}
    for m in modes:
        base = m["name"]
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            m["name"] = f"{base} ({'I' * seen[base]})"

    _plot(X, km.labels_, feats, modes, outdir / "listening_modes.png")
    return {"n_sessions": int(len(feats)), "modes": modes}


def _plot(X, labels, feats, modes, path):
    coords = PCA(n_components=2, random_state=42).fit_transform(X)
    name_by_mode = {m["mode"]: m["name"] for m in modes}

    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 7))
    for ax in (ax1, ax2):
        ax.set_facecolor("#0b0b0d")
    fig.patch.set_facecolor("#0b0b0d")

    for c in sorted(set(labels)):
        m = coords[labels == c]
        ax1.scatter(m[:, 0], m[:, 1], s=10, alpha=0.45, label=name_by_mode[c])
    ax1.set_title("Listening sessions clustered into modes (PCA view)", color="white", fontsize=12)
    ax1.set_xticks([]); ax1.set_yticks([])
    leg = ax1.legend(loc="upper right", fontsize=9, framealpha=0.2)
    for t in leg.get_texts():
        t.set_color("white")

    ordered = sorted(modes, key=lambda m: m["total_hours"])
    names = [m["name"] for m in ordered]
    hours = [m["total_hours"] for m in ordered]
    bars = ax2.barh(names, hours, color="#1DB954")
    ax2.set_title("Hours spent in each listening mode", color="white", fontsize=12)
    ax2.tick_params(colors="white")
    for s in ax2.spines.values():
        s.set_color("#333")
    for b, m in zip(bars, ordered):
        ax2.text(b.get_width(), b.get_y() + b.get_height() / 2,
                 f"  {m['total_hours']:.0f}h · {m['pct_sessions']}% of sessions",
                 va="center", color="white", fontsize=9)
    for ax in (ax1, ax2):
        for s in ax.spines.values():
            s.set_visible(False)
    plt.tight_layout()
    fig.savefig(path, dpi=130, facecolor=fig.get_facecolor())
    plt.close(fig)
