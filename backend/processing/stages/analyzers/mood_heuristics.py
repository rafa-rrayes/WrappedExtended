"""Mood heuristics analyzer — estimates mood from behavioral signals."""

import polars as pl

from .helpers import has_column


def compute_mood_heuristics(df: pl.DataFrame) -> dict:
    """Estimate monthly 'mood' from time-of-day, skip rates, session length, diversity."""
    if df.is_empty():
        return {}

    monthly = (
        df.group_by(pl.col("timestamp").dt.strftime("%Y-%m").alias("month"))
        .agg(
            # Energy proxy: morning (6-12) = high, afternoon (12-18) = medium,
            # evening (18-24) = low-medium, night (0-6) = low
            pl.col("hour").mean().alias("avg_hour"),
            pl.col("hours_played").sum().round(2).alias("total_hours"),
            pl.col("hours_played").mean().round(4).alias("avg_session_hours"),
            pl.len().alias("streams"),
            pl.col("artist_name").drop_nulls().n_unique().alias("unique_artists"),
            # Skip rate as engagement signal
            *(
                [
                    (
                        pl.col("skipped").is_not_null()
                        & (pl.col("skipped") != 0)
                    )
                    .mean()
                    .round(3)
                    .alias("skip_rate")
                ]
                if has_column(df, "skipped")
                else [pl.lit(0.0).alias("skip_rate")]
            ),
        )
        .sort("month")
    )

    mood_entries = []
    for row in monthly.to_dicts():
        avg_hour = row["avg_hour"] or 12
        streams = row["streams"] or 1
        unique = row["unique_artists"] or 1

        # Energy: higher when listening peaks in morning/afternoon
        energy = max(0, min(100, 100 - abs(avg_hour - 14) * 7))

        # Engagement: inverse of skip rate
        engagement = max(0, min(100, round((1 - (row["skip_rate"] or 0)) * 100)))

        # Immersion: based on avg session length (longer = more immersed)
        avg_hrs = row["avg_session_hours"] or 0
        immersion = max(0, min(100, round(avg_hrs * 20000)))  # scale tiny avgs

        # Exploration: artist diversity relative to streams
        exploration = max(0, min(100, round(unique / max(streams, 1) * 500)))

        # Composite mood (0-100)
        mood = round(energy * 0.25 + engagement * 0.35 + immersion * 0.15 + exploration * 0.25)

        mood_entries.append({
            "month": row["month"],
            "mood_score": mood,
            "energy": round(energy),
            "engagement": engagement,
            "immersion": min(immersion, 100),
            "exploration": min(exploration, 100),
            "total_hours": row["total_hours"],
        })

    return {"mood_timeline": mood_entries}
