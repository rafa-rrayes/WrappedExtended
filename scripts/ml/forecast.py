"""Forecast future listening and flag anomalous days.

  - Monthly listening hours -> Holt-Winters exponential smoothing -> 6-month forecast
  - Daily features -> IsolationForest -> the most unusual listening days (binges / droughts)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.ensemble import IsolationForest

HORIZON = 6  # months to forecast


def run(df: pd.DataFrame, outdir) -> dict:
    # ── Monthly series ──────────────────────────────────────────────────────
    m = (
        df.set_index("ts")["hours_played"]
        .resample("MS").sum()
        .rename("hours")
    )
    # Drop the final partial month if the export ends mid-month
    m = m.iloc[:-1] if len(m) > 2 else m

    forecast_vals, ci = _forecast(m)

    # ── Daily anomaly detection ─────────────────────────────────────────────
    daily = df.groupby("date").agg(
        hours=("hours_played", "sum"),
        plays=("track_name", "size"),
        artists=("artist_name", "nunique"),
        skip_rate=("skipped", "mean"),
        night=("hour", lambda s: float(((s >= 0) & (s <= 5)).mean())),
    )
    feats = daily[["hours", "plays", "artists", "skip_rate", "night"]].fillna(0)
    iso = IsolationForest(contamination=0.02, random_state=42).fit(feats)
    daily["anomaly_score"] = -iso.score_samples(feats)
    anomalies = (
        daily.sort_values("anomaly_score", ascending=False)
        .head(12)
        .reset_index()
    )
    anom_list = [
        {
            "date": str(r["date"]),
            "hours": round(float(r["hours"]), 1),
            "plays": int(r["plays"]),
            "unique_artists": int(r["artists"]),
            "skip_rate": round(float(r["skip_rate"]), 3),
        }
        for _, r in anomalies.iterrows()
    ]

    _plot(m, forecast_vals, ci, daily, outdir / "forecast.png")

    return {
        "history_months": int(len(m)),
        "avg_monthly_hours_last_year": round(float(m.tail(12).mean()), 1),
        "forecast_next_6_months": [
            {"month": str(idx.date()), "hours": round(float(v), 1)}
            for idx, v in forecast_vals.items()
        ],
        "anomalous_days": anom_list,
    }


def _forecast(m: pd.Series):
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing
        seasonal = "add" if len(m) >= 24 else None
        periods = 12 if seasonal else None
        fit = ExponentialSmoothing(
            m, trend="add", seasonal=seasonal, seasonal_periods=periods,
            initialization_method="estimated",
        ).fit()
        fc = fit.forecast(HORIZON)
        resid = (m - fit.fittedvalues).std()
    except Exception:
        # Fallback: seasonal-naive on last 12 months mean
        last = m.tail(12).mean()
        idx = pd.date_range(m.index[-1] + pd.offsets.MonthBegin(), periods=HORIZON, freq="MS")
        fc = pd.Series([last] * HORIZON, index=idx)
        resid = m.tail(12).std()
    fc = fc.clip(lower=0)
    ci = (fc - 1.96 * resid).clip(lower=0), fc + 1.96 * resid
    return fc, ci


def _plot(m, fc, ci, daily, path):
    fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(14, 10))
    fig.patch.set_facecolor("#0b0b0d")
    for ax in (ax1, ax2):
        ax.set_facecolor("#0b0b0d")
        ax.tick_params(colors="white")
        for s in ax.spines.values():
            s.set_color("#333")

    ax1.plot(m.index, m.values, color="#1DB954", label="actual")
    ax1.plot(fc.index, fc.values, "--", color="#F5A623", label="forecast")
    ax1.fill_between(fc.index, ci[0].values, ci[1].values, color="#F5A623", alpha=0.18)
    ax1.set_title("Monthly listening hours — history + 6-month forecast (Holt-Winters)",
                  color="white", fontsize=12)
    leg = ax1.legend(framealpha=0.2)
    for t in leg.get_texts():
        t.set_color("white")

    ax2.plot(pd.to_datetime(daily.index), daily["hours"].values, color="#555", lw=0.7)
    top = daily.sort_values("anomaly_score", ascending=False).head(12)
    ax2.scatter(pd.to_datetime(top.index), top["hours"].values, color="#ff4d6d",
                s=40, zorder=5, label="anomalous days")
    ax2.set_title("Daily hours with anomaly days flagged (IsolationForest)",
                  color="white", fontsize=12)
    leg2 = ax2.legend(framealpha=0.2)
    for t in leg2.get_texts():
        t.set_color("white")

    plt.tight_layout()
    fig.savefig(path, dpi=130, facecolor=fig.get_facecolor())
    plt.close(fig)
