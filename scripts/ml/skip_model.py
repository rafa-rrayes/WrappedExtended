"""Predict whether you'll skip a track, then explain what drives your skips.

Two models on the same features:
  - GradientBoostingClassifier (sklearn) — strong tabular baseline + permutation importance
  - a small PyTorch MLP — the deep-learning counterpart, compared on AUC

Features are purely contextual (no leakage from ms_played / reason_end, which
trivially encode the skip): hour, weekday, shuffle, offline, platform, start
reason, artist familiarity, track familiarity, position in session.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler


def _features(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    d = df.copy()
    d["artist_plays"] = d.groupby("artist_name")["artist_name"].transform("size")
    d["track_plays"] = d.groupby("track_name")["track_name"].transform("size")
    d["pos_in_session"] = d.groupby("session_id").cumcount()
    d["artist_familiarity"] = np.log1p(d["artist_plays"])
    d["track_familiarity"] = np.log1p(d["track_plays"])

    feat = pd.DataFrame({
        "hour": d["hour"],
        "weekday": d["weekday"],
        "is_weekend": d["is_weekend"].astype(int),
        "shuffle": d["shuffle"].astype(int),
        "offline": d["offline"].astype(int),
        "pos_in_session": d["pos_in_session"].clip(upper=50),
        "artist_familiarity": d["artist_familiarity"],
        "track_familiarity": d["track_familiarity"],
        "start_click": (d["reason_start"] == "clickrow").astype(int),
        "start_fwdbtn": (d["reason_start"] == "fwdbtn").astype(int),
        "start_trackdone": (d["reason_start"] == "trackdone").astype(int),
        "is_mobile": d["platform"].str.contains("ios|android", case=False, na=False).astype(int),
    })
    return feat, d["skipped"].astype(int)


def _train_mlp(Xtr, ytr, Xte, yte):
    try:
        import torch
        import torch.nn as nn
    except Exception as e:  # torch missing — skip gracefully
        return {"available": False, "error": str(e)}

    torch.manual_seed(42)
    Xtr_t = torch.tensor(Xtr, dtype=torch.float32)
    ytr_t = torch.tensor(ytr.values, dtype=torch.float32).unsqueeze(1)
    Xte_t = torch.tensor(Xte, dtype=torch.float32)

    pos_weight = torch.tensor([(ytr == 0).sum() / max((ytr == 1).sum(), 1)], dtype=torch.float32)
    model = nn.Sequential(
        nn.Linear(Xtr.shape[1], 64), nn.ReLU(), nn.Dropout(0.2),
        nn.Linear(64, 32), nn.ReLU(),
        nn.Linear(32, 1),
    )
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    n = len(Xtr_t)
    for epoch in range(8):
        model.train()
        perm = torch.randperm(n)
        for i in range(0, n, 4096):
            idx = perm[i:i + 4096]
            opt.zero_grad()
            out = model(Xtr_t[idx])
            loss = loss_fn(out, ytr_t[idx])
            loss.backward()
            opt.step()

    model.eval()
    with torch.no_grad():
        prob = torch.sigmoid(model(Xte_t)).numpy().ravel()
    return {"available": True, "auc": round(float(roc_auc_score(yte, prob)), 4), "epochs": 8}


def run(df: pd.DataFrame, outdir) -> dict:
    X, y = _features(df)
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    scaler = StandardScaler().fit(Xtr)
    Xtr_s, Xte_s = scaler.transform(Xtr), scaler.transform(Xte)

    gb = GradientBoostingClassifier(n_estimators=200, max_depth=3, random_state=42)
    gb.fit(Xtr, ytr)
    gb_prob = gb.predict_proba(Xte)[:, 1]
    gb_auc = round(float(roc_auc_score(yte, gb_prob)), 4)

    # Permutation importance on a sample (faster, model-agnostic)
    samp = min(20000, len(Xte))
    perm = permutation_importance(
        gb, Xte.iloc[:samp], yte.iloc[:samp],
        scoring="roc_auc", n_repeats=5, random_state=42, n_jobs=-1,
    )
    drivers = sorted(
        ({"feature": f, "importance": round(float(m), 4)}
         for f, m in zip(X.columns, perm.importances_mean)),
        key=lambda d: d["importance"], reverse=True,
    )

    mlp = _train_mlp(Xtr_s, ytr, Xte_s, yte)

    _plot(drivers, gb_auc, mlp, float(y.mean()), outdir / "skip_drivers.png")
    return {
        "baseline_skip_rate": round(float(y.mean()), 4),
        "gradient_boosting_auc": gb_auc,
        "pytorch_mlp": mlp,
        "drivers": drivers,
    }


def _plot(drivers, gb_auc, mlp, base, path):
    top = drivers[:10][::-1]
    names = [d["feature"] for d in top]
    vals = [d["importance"] for d in top]

    fig, ax = plt.subplots(figsize=(11, 7))
    fig.patch.set_facecolor("#0b0b0d")
    ax.set_facecolor("#0b0b0d")
    bars = ax.barh(names, vals, color="#F5A623")
    mlp_txt = f"{mlp['auc']}" if mlp.get("available") else "n/a"
    ax.set_title(
        f"What drives your skips — permutation importance (AUC drop)\n"
        f"GradientBoosting AUC={gb_auc}  ·  PyTorch MLP AUC={mlp_txt}  ·  base skip rate={base:.1%}",
        color="white", fontsize=12, pad=14,
    )
    ax.tick_params(colors="white")
    for b, v in zip(bars, vals):
        ax.text(b.get_width(), b.get_y() + b.get_height() / 2, f"  {v:.3f}",
                va="center", color="white", fontsize=9)
    for s in ax.spines.values():
        s.set_visible(False)
    plt.tight_layout()
    fig.savefig(path, dpi=130, facecolor=fig.get_facecolor())
    plt.close(fig)
