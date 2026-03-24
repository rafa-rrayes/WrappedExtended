"""Line chart analyzers."""

import polars as pl


def compute_line_charts(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Artist discovery timeline (first & last listen, total hours) ──────────
    discovery = (
        df.filter(pl.col("artist_name").is_not_null())
        .group_by("artist_name")
        .agg(
            pl.col("timestamp").min().alias("first_listen"),
            pl.col("timestamp").max().alias("last_listen"),
            pl.col("hours_played").sum().round(2).alias("total_hours"),
        )
        .sort("total_hours", descending=True)
        .head(30)
    )
    disc_dicts = discovery.to_dicts()
    for d in disc_dicts:
        d["first_listen"] = str(d["first_listen"])
        d["last_listen"] = str(d["last_listen"])
    stats["artist_discovery_timeline"] = disc_dicts

    # ── Song monthly breakdown (top 10 tracks, plays per month) ───────────────
    top_track_names = (
        df.filter(pl.col("track_name").is_not_null())
        .group_by("track_name", "artist_name")
        .agg(pl.len().alias("plays"))
        .sort("plays", descending=True)
        .head(10)
    )
    top_pairs = set(
        zip(
            top_track_names["track_name"].to_list(),
            top_track_names["artist_name"].to_list(),
            strict=True,
        )
    )

    if top_pairs:
        filtered = df.filter(
            pl.col("track_name").is_not_null()
            & pl.struct(["track_name", "artist_name"]).map_elements(
                lambda s: (s["track_name"], s["artist_name"]) in top_pairs,
                return_dtype=pl.Boolean,
            )
        )
        monthly_breakdown = (
            filtered.group_by(
                "track_name",
                "artist_name",
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
            )
            .agg(
                pl.len().alias("plays"),
                (pl.col("hours_played").sum() * 60).round(1).alias("minutes"),
            )
            .sort("month")
        )

        result = []
        for (track, artist), group in monthly_breakdown.group_by(
            "track_name", "artist_name", maintain_order=True
        ):
            result.append({
                "track_name": track,
                "artist_name": artist,
                "data": group.select("month", "plays", "minutes").to_dicts(),
            })
        stats["song_monthly_breakdown"] = result

    # ── Song daily breakdown (top 10 tracks, plays per day) ───────────────
    if top_pairs:
        daily_breakdown = (
            filtered.group_by(
                "track_name",
                "artist_name",
                "date",
            )
            .agg(
                pl.len().alias("plays"),
                (pl.col("hours_played").sum() * 60).round(1).alias("minutes"),
            )
            .sort("date")
        )

        result_daily = []
        for (track, artist), group in daily_breakdown.group_by(
            "track_name", "artist_name", maintain_order=True
        ):
            rows = group.select("date", "plays", "minutes").to_dicts()
            for r in rows:
                r["date"] = str(r["date"])
            result_daily.append({
                "track_name": track,
                "artist_name": artist,
                "data": rows,
            })
        stats["song_daily_breakdown"] = result_daily

    return stats
