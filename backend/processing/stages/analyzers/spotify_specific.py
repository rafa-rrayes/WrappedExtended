"""Spotify-specific analyzers (reasons, offline, incognito, completion)."""

import polars as pl

from .helpers import has_column, safe_div


def compute_spotify_specific(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Enhanced reason analysis ──────────────────────────────────────────────
    reason_result: dict = {}
    for col_name, key in [("reason_start", "start"), ("reason_end", "end")]:
        if has_column(df, col_name):
            reasons = (
                df.filter(pl.col(col_name).is_not_null())
                .group_by(col_name)
                .agg(
                    pl.len().alias("count"),
                    pl.col("ms_played").mean().round(0).alias("avg_ms"),
                )
                .sort("count", descending=True)
            )
            total_reasons = reasons["count"].sum()
            r_dicts = reasons.to_dicts()
            for r in r_dicts:
                r["reason"] = r.pop(col_name)
                r["pct"] = round(safe_div(r["count"], total_reasons) * 100, 1)
            reason_result[key] = r_dicts
    if reason_result:
        stats["reason_analysis"] = reason_result

    # ── Offline analysis ──────────────────────────────────────────────────────
    if has_column(df, "offline"):
        offline_df = df.filter(pl.col("offline") == True)  # noqa: E712
        offline_hours = round(offline_df["hours_played"].sum(), 2)
        total_hours = df["hours_played"].sum()
        top_offline = (
            offline_df.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
            .head(10)
        )
        stats["offline_analysis"] = {
            "offline_hours": offline_hours,
            "offline_pct": round(safe_div(offline_hours, total_hours) * 100, 1),
            "top_offline_artists": top_offline.to_dicts(),
        }

    # ── Incognito analysis ────────────────────────────────────────────────────
    if has_column(df, "incognito_mode"):
        incog_df = df.filter(pl.col("incognito_mode") == True)  # noqa: E712
        incog_hours = round(incog_df["hours_played"].sum(), 2)
        total_hours = df["hours_played"].sum()
        top_incog = (
            incog_df.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
            .head(10)
        )
        stats["incognito_analysis"] = {
            "incognito_hours": incog_hours,
            "incognito_pct": round(safe_div(incog_hours, total_hours) * 100, 1),
            "top_incognito_artists": top_incog.to_dicts(),
        }

    # ── Track completion rates ────────────────────────────────────────────────
    if has_column(df, "ms_played") and has_column(df, "track_name"):
        # Use median ms_played per track as a proxy for track duration
        track_stats = (
            df.filter(pl.col("track_name").is_not_null() & (pl.col("ms_played") > 0))
            .group_by("track_name", "artist_name")
            .agg(
                pl.len().alias("plays"),
                pl.col("ms_played").mean().round(0).alias("avg_ms"),
                pl.col("ms_played").max().alias("max_ms"),
            )
            .filter(pl.col("plays") >= 5)
        )
        # Estimate completion as avg_ms / max_ms (best proxy without track duration metadata).
        # Sorted by completion, not by plays — a list titled "completion rates" that runs
        # 36%, 27%, 34%, 31% reads as broken. The `plays >= 5` floor above is what keeps a
        # single fluke play from claiming 100%.
        completion = (
            track_stats.with_columns(
                (pl.col("avg_ms") / pl.col("max_ms") * 100).round(1).alias("avg_completion_pct")
            )
            .sort("avg_completion_pct", descending=True)
            .head(50)
        )

        stats["track_completion_rates"] = completion.select(
            "track_name", "artist_name", "plays", "avg_completion_pct"
        ).to_dicts()

    return stats
