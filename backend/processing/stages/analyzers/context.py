"""Context analyzers — weekend vs weekday, late-night."""

import polars as pl

from .helpers import safe_div


def compute_context(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Weekend vs weekday ────────────────────────────────────────────────────
    # Polars weekday(): Mon=1 .. Sun=7. Weekend = Sat(6), Sun(7).
    weekday_df = df.filter(pl.col("weekday").is_in([1, 2, 3, 4, 5]))
    weekend_df = df.filter(pl.col("weekday").is_in([6, 7]))

    def _top_artists(sub: pl.DataFrame, n: int = 5) -> list[dict]:
        return (
            sub.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
            .head(n)
            .to_dicts()
        )

    stats["weekend_vs_weekday"] = {
        "weekday": {
            "hours": round(weekday_df["hours_played"].sum(), 2),
            "streams": weekday_df.height,
            "top_artists": _top_artists(weekday_df),
        },
        "weekend": {
            "hours": round(weekend_df["hours_played"].sum(), 2),
            "streams": weekend_df.height,
            "top_artists": _top_artists(weekend_df),
        },
    }

    # ── Late-night analysis (00:00–05:00) ─────────────────────────────────────
    late = df.filter(pl.col("hour").is_in([0, 1, 2, 3, 4, 5]))
    late_hours = round(late["hours_played"].sum(), 2)
    total_hours = df["hours_played"].sum()

    stats["late_night_analysis"] = {
        "hours": late_hours,
        "pct": round(safe_div(late_hours, total_hours) * 100, 1),
        "streams": late.height,
        "top_artists": (
            late.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
            .head(10)
            .to_dicts()
        ),
    }

    return stats
