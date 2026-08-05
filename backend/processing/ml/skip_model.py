"""Predict whether a track will be skipped, then explain what drives the skips.

Two models on the same features:
  - GradientBoostingClassifier (sklearn) — strong tabular baseline + permutation importance
  - a small PyTorch MLP — the deep-learning counterpart, compared on AUC

Features are purely contextual (no leakage from ms_played / reason_end, which trivially
encode the skip): hour, weekday, shuffle, offline, platform, start reason, artist
familiarity, track familiarity, position in session.

Ported from `scripts/ml/skip_model.py`; plotting stripped. The MLP half reports
`{"available": false, "error": ...}` when torch is absent — which is the default in the
backend image (see the `ml-deep` extra in pyproject.toml).
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Rows sampled for the (quadratic-ish) permutation importance pass.
PERM_SAMPLE = 20_000
PERM_REPEATS = 5


def _features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    d = df.copy()
    d["artist_plays"] = d.groupby("artist_name")["artist_name"].transform("size")
    d["track_plays"] = d.groupby("track_name")["track_name"].transform("size")
    d["pos_in_session"] = d.groupby("session_id").cumcount()
    d["artist_familiarity"] = np.log1p(d["artist_plays"])
    d["track_familiarity"] = np.log1p(d["track_plays"])

    feat = pd.DataFrame(
        {
            "hour": d["hour"],
            "weekday": d["weekday"],  # 0 = Monday, normalised in features.py
            "is_weekend": d["is_weekend"].astype(int),
            "shuffle": d["shuffle"].astype(int),
            "offline": d["offline"].astype(int),
            "pos_in_session": d["pos_in_session"].clip(upper=50),
            "artist_familiarity": d["artist_familiarity"],
            "track_familiarity": d["track_familiarity"],
            "start_click": (d["reason_start"] == "clickrow").astype(int),
            "start_fwdbtn": (d["reason_start"] == "fwdbtn").astype(int),
            "start_trackdone": (d["reason_start"] == "trackdone").astype(int),
            "is_mobile": d["platform"]
            .str.contains("ios|android|iphone", case=False, na=False)
            .astype(int),
        }
    )
    return feat, d["skipped"].astype(int)


def _train_mlp(x_train, y_train, x_test, y_test) -> dict:
    try:
        import torch
        import torch.nn as nn
    except Exception as exc:  # torch missing — skip gracefully
        return {"available": False, "error": str(exc)}

    torch.manual_seed(42)
    xtr = torch.tensor(x_train, dtype=torch.float32)
    ytr = torch.tensor(y_train.values, dtype=torch.float32).unsqueeze(1)
    xte = torch.tensor(x_test, dtype=torch.float32)

    pos_weight = torch.tensor(
        [(y_train == 0).sum() / max((y_train == 1).sum(), 1)], dtype=torch.float32
    )
    model = nn.Sequential(
        nn.Linear(x_train.shape[1], 64),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(64, 32),
        nn.ReLU(),
        nn.Linear(32, 1),
    )
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    n = len(xtr)
    for _epoch in range(8):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, 4096):
            idx = perm[i : i + 4096]
            opt.zero_grad()
            loss = loss_fn(model(xtr[idx]), ytr[idx])
            loss.backward()
            opt.step()

    model.eval()
    with torch.no_grad():
        prob = torch.sigmoid(model(xte)).numpy().ravel()
    return {"available": True, "auc": round(float(roc_auc_score(y_test, prob)), 4), "epochs": 8}


def run(df: pd.DataFrame) -> dict:
    x, y = _features(df)
    if y.nunique() < 2:
        return {"error": "skip flag has a single value — nothing to learn"}

    x_train, x_test, y_train, y_test = train_test_split(
        x, y, test_size=0.25, random_state=42, stratify=y
    )

    scaler = StandardScaler().fit(x_train)
    x_train_s, x_test_s = scaler.transform(x_train), scaler.transform(x_test)

    gb = GradientBoostingClassifier(n_estimators=200, max_depth=3, random_state=42)
    gb.fit(x_train, y_train)
    gb_prob = gb.predict_proba(x_test)[:, 1]
    gb_auc = round(float(roc_auc_score(y_test, gb_prob)), 4)

    # Permutation importance on a sample (faster, model-agnostic). Single-threaded on
    # purpose: this runs inside a Celery worker that is already one process per core,
    # and joblib fan-out there just oversubscribes the container.
    samp = min(PERM_SAMPLE, len(x_test))
    perm = permutation_importance(
        gb,
        x_test.iloc[:samp],
        y_test.iloc[:samp],
        scoring="roc_auc",
        n_repeats=PERM_REPEATS,
        random_state=42,
        n_jobs=1,
    )
    drivers = sorted(
        (
            {"feature": f, "importance": round(float(m), 4)}
            for f, m in zip(x.columns, perm.importances_mean, strict=True)
        ),
        key=lambda d: d["importance"],
        reverse=True,
    )

    mlp = _train_mlp(x_train_s, y_train, x_test_s, y_test)

    return {
        "baseline_skip_rate": round(float(y.mean()), 4),
        "gradient_boosting_auc": gb_auc,
        "pytorch_mlp": mlp,
        "drivers": drivers,
    }
