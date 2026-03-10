"""Distribution analyzers."""

import polars as pl

from .helpers import has_column, safe_div


def compute_distributions(df: pl.DataFrame) -> dict:
    stats: dict = {}
    total = len(df)

    # ── Content type distribution (music vs podcast/episode) ──────────────────
    has_episode = has_column(df, "episode_name")
    if has_episode:
        music = df.filter(pl.col("episode_name").is_null())
        podcast = df.filter(pl.col("episode_name").is_not_null())
        stats["content_type_distribution"] = [
            {
                "type": "Music",
                "count": music.height,
                "hours": round(music["hours_played"].sum(), 2),
                "pct": round(safe_div(music.height, total) * 100, 1),
            },
            {
                "type": "Podcast",
                "count": podcast.height,
                "hours": round(podcast["hours_played"].sum(), 2),
                "pct": round(safe_div(podcast.height, total) * 100, 1),
            },
        ]
    else:
        total_hrs = round(df["hours_played"].sum(), 2)
        stats["content_type_distribution"] = [
            {"type": "Music", "count": total, "hours": total_hrs, "pct": 100.0},
        ]

    # ── Platform hours ────────────────────────────────────────────────────────
    if has_column(df, "platform"):
        platform_hrs = (
            df.filter(pl.col("platform").is_not_null())
            .group_by("platform")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
        )
        total_platform_hrs = platform_hrs["hours"].sum()
        ph_dicts = platform_hrs.to_dicts()
        for d in ph_dicts:
            d["pct"] = round(safe_div(d["hours"], total_platform_hrs) * 100, 1)
        stats["platform_hours"] = ph_dicts

    # ── Shuffle distribution ──────────────────────────────────────────────────
    if has_column(df, "shuffle"):
        on = df.filter(pl.col("shuffle") == True).height  # noqa: E712
        off = total - on
        stats["shuffle_distribution"] = {
            "shuffle_on": on,
            "shuffle_off": off,
            "total": total,
        }

    # ── Completion distribution (completed vs skipped) ────────────────────────
    if has_column(df, "skipped"):
        skipped = df.filter(
            pl.col("skipped").is_not_null() & (pl.col("skipped") != 0)
        ).height
        completed = total - skipped
        stats["completion_distribution"] = {
            "completed": completed,
            "skipped": skipped,
            "total": total,
        }

    return stats
