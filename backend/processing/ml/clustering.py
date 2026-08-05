"""Discover listening "modes" by clustering sessions on behavioral features.

Each session becomes a feature vector (length, time of day, skip/shuffle rates, artist
diversity, completion, offline mix). KMeans groups them into modes which are named
heuristically (e.g. Focus Deep-Dive, Shuffle Party, Discovery, Background).

Ported from `scripts/ml/clustering.py`; plotting stripped.
"""

from __future__ import annotations

import logging

import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

N_MODES = 5

_FEATURE_COLS = [
    "n_plays",
    "mean_min_played",
    "skip_rate",
    "shuffle_rate",
    "offline_rate",
    "artist_diversity",
    "start_hour",
    "weekend",
    "is_night",
]


def _session_features(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("session_id")
    feats = pd.DataFrame(
        {
            "n_plays": g.size(),
            "hours": g["hours_played"].sum(),
            "mean_min_played": g["minutes_played"].mean(),
            "skip_rate": g["skipped"].mean(),
            "shuffle_rate": g["shuffle"].mean(),
            "offline_rate": g["offline"].mean(),
            "artist_diversity": g["artist_name"].nunique() / g.size(),
            "start_hour": g["hour"].median(),
            "weekend": g["is_weekend"].mean(),
        }
    )
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


def run(df: pd.DataFrame) -> dict:
    feats = _session_features(df)
    n_modes = min(N_MODES, len(feats))
    if n_modes < 2:
        return {"error": "not enough sessions to cluster"}

    x = StandardScaler().fit_transform(feats[_FEATURE_COLS])
    km = KMeans(n_clusters=n_modes, n_init=10, random_state=42).fit(x)
    feats["mode"] = km.labels_

    modes = []
    for c in range(n_modes):
        sub = feats[feats["mode"] == c]
        profile = {col: float(sub[col].mean()) for col in _FEATURE_COLS}
        modes.append(
            {
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
            }
        )
    modes.sort(key=lambda m: m["total_hours"], reverse=True)

    # Defensive: disambiguate any duplicate names (II, III, …)
    seen: dict[str, int] = {}
    for m in modes:
        base = m["name"]
        seen[base] = seen.get(base, 0) + 1
        if seen[base] > 1:
            m["name"] = f"{base} ({'I' * seen[base]})"

    return {"n_sessions": int(len(feats)), "modes": modes}
