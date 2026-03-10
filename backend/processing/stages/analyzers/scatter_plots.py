"""Scatter plot analyzers — capped at 500 items to keep JSON size sane."""

import polars as pl

from .helpers import has_column

SCATTER_CAP = 500


def compute_scatter_plots(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Track popularity scatter (plays vs hours) ─────────────────────────────
    pop = (
        df.filter(pl.col("track_name").is_not_null())
        .group_by("track_name", "artist_name")
        .agg(
            pl.len().alias("plays"),
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.col("ms_played").mean().round(0).alias("avg_ms"),
        )
        .filter(pl.col("plays") >= 3)
        .sort("plays", descending=True)
        .head(SCATTER_CAP)
    )
    stats["track_popularity_scatter"] = pop.to_dicts()

    # ── Skip rate scatter (plays vs skip_rate per track) ──────────────────────
    if has_column(df, "skipped"):
        skip_scatter = (
            df.filter(pl.col("track_name").is_not_null())
            .group_by("track_name", "artist_name")
            .agg(
                pl.len().alias("plays"),
                (pl.col("skipped").is_not_null() & (pl.col("skipped") != 0))
                .sum()
                .alias("skips"),
            )
            .filter(pl.col("plays") >= 5)
            .sort("plays", descending=True)
            .head(SCATTER_CAP)
        )
        sr_dicts = skip_scatter.to_dicts()
        for d in sr_dicts:
            d["skip_rate"] = round(d.pop("skips") / d["plays"] * 100, 1) if d["plays"] else 0
        stats["skip_rate_scatter"] = sr_dicts

    return stats
