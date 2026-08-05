"""Forecast future listening and flag anomalous days.

  - Monthly listening hours -> Holt-Winters exponential smoothing -> 6-month forecast
  - Daily features -> IsolationForest -> the most unusual listening days (binges / droughts)

Ported from `scripts/ml/forecast.py`; plotting stripped. The offline version computed the
95% confidence band only to shade it on a chart — here it is emitted per forecast point
(`lower`/`upper`), along with the monthly `history` series the frontend plots.
"""

from __future__ import annotations

import logging

import pandas as pd
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

HORIZON = 6  # months to forecast
N_ANOMALIES = 12
CONTAMINATION = 0.02


def run(df: pd.DataFrame) -> dict:
    # ── Monthly series ───────────────────────────────────────────────────────
    monthly = df.set_index("ts")["hours_played"].resample("MS").sum().rename("hours")
    # Drop the final partial month if the export ends mid-month
    monthly = monthly.iloc[:-1] if len(monthly) > 2 else monthly

    forecast_vals, (lower, upper) = _forecast(monthly)

    # ── Daily anomaly detection ──────────────────────────────────────────────
    daily = df.groupby("date").agg(
        hours=("hours_played", "sum"),
        plays=("track_name", "size"),
        artists=("artist_name", "nunique"),
        skip_rate=("skipped", "mean"),
        night=("hour", lambda s: float(((s >= 0) & (s <= 5)).mean())),
    )
    feats = daily[["hours", "plays", "artists", "skip_rate", "night"]].fillna(0)
    iso = IsolationForest(contamination=CONTAMINATION, random_state=42).fit(feats)
    daily["anomaly_score"] = -iso.score_samples(feats)
    anomalies = daily.sort_values("anomaly_score", ascending=False).head(N_ANOMALIES).reset_index()
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

    return {
        "history_months": int(len(monthly)),
        "avg_monthly_hours_last_year": round(float(monthly.tail(12).mean()), 1),
        "history": [
            {"month": str(idx.date()), "hours": round(float(v), 1)} for idx, v in monthly.items()
        ],
        "forecast_next_6_months": [
            {
                "month": str(idx.date()),
                "hours": round(float(v), 1),
                "lower": round(float(lower.loc[idx]), 1),
                "upper": round(float(upper.loc[idx]), 1),
            }
            for idx, v in forecast_vals.items()
        ],
        "anomalous_days": anom_list,
    }


def _forecast(monthly: pd.Series):
    """Holt-Winters forecast + 95% band, falling back to a seasonal-naive mean."""
    try:
        from statsmodels.tsa.holtwinters import ExponentialSmoothing

        seasonal = "add" if len(monthly) >= 24 else None
        periods = 12 if seasonal else None
        fit = ExponentialSmoothing(
            monthly,
            trend="add",
            seasonal=seasonal,
            seasonal_periods=periods,
            initialization_method="estimated",
        ).fit()
        fc = fit.forecast(HORIZON)
        resid = (monthly - fit.fittedvalues).std()
    except Exception as exc:
        logger.info("Holt-Winters failed (%s) — falling back to a 12-month mean", exc)
        last = monthly.tail(12).mean()
        idx = pd.date_range(
            monthly.index[-1] + pd.offsets.MonthBegin(), periods=HORIZON, freq="MS"
        )
        fc = pd.Series([last] * HORIZON, index=idx)
        resid = monthly.tail(12).std()

    fc = fc.clip(lower=0)
    resid = 0.0 if pd.isna(resid) else float(resid)
    return fc, ((fc - 1.96 * resid).clip(lower=0), fc + 1.96 * resid)
