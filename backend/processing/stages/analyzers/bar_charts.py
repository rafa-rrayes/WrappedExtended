"""Bar chart analyzers."""

import polars as pl

from .helpers import has_column


def compute_bar_charts(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Top tracks by total listening time ────────────────────────────────────
    top_by_time = (
        df.filter(pl.col("track_name").is_not_null())
        .group_by("track_name", "artist_name")
        .agg(
            (pl.col("ms_played").sum() / 60_000).round(1).alias("minutes"),
            (pl.col("hours_played").sum()).round(2).alias("hours"),
        )
        .sort("hours", descending=True)
        .head(20)
    )
    stats["top_tracks_by_time"] = top_by_time.to_dicts()

    # ── Skip rate by artist (top 20 most-played artists) ─────────────────────
    if has_column(df, "skipped"):
        artist_plays = (
            df.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(
                pl.len().alias("plays"),
                (pl.col("skipped").is_not_null() & (pl.col("skipped") != 0)).sum().alias("skips"),
            )
            # Ranked by the metric the chart is named after, not by volume. The 10-play
            # floor is what keeps a single skipped one-off from taking the top slot now
            # that rate, rather than play count, decides the order.
            .filter(pl.col("plays") >= 10)
            .with_columns((pl.col("skips") / pl.col("plays") * 100).round(1).alias("skip_rate"))
            .sort("skip_rate", descending=True)
            .head(20)
        )
        stats["skip_rate_by_artist"] = artist_plays.to_dicts()

    return stats
