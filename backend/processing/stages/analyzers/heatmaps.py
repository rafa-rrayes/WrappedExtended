"""Heatmap analyzers."""

import polars as pl


def compute_heatmaps(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Calendar heatmap (hours per date) ─────────────────────────────────────
    cal = (
        df.group_by("date")
        .agg(pl.col("hours_played").sum().round(2).alias("hours"))
        .sort("date")
    )
    cal_dicts = cal.to_dicts()
    for d in cal_dicts:
        d["date"] = str(d["date"])
    stats["calendar_heatmap"] = cal_dicts

    # ── Hour × Day-of-week heatmap ────────────────────────────────────────────
    weekday_names = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}
    hour_day = (
        df.group_by("weekday", "hour")
        .agg(pl.col("hours_played").sum().round(2).alias("hours"))
        .sort("weekday", "hour")
    )
    hd_dicts = hour_day.to_dicts()
    for d in hd_dicts:
        d["weekday"] = weekday_names.get(d["weekday"], "?")
    stats["hour_day_heatmap"] = hd_dicts

    # ── Artist × Month heatmap (top 10 artists) ──────────────────────────────
    top_artist_names = (
        df.filter(pl.col("artist_name").is_not_null())
        .group_by("artist_name")
        .agg(pl.col("hours_played").sum().alias("h"))
        .sort("h", descending=True)
        .head(10)
        .get_column("artist_name")
        .to_list()
    )

    if top_artist_names:
        artist_month = (
            df.filter(pl.col("artist_name").is_in(top_artist_names))
            .group_by(
                "artist_name",
                pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
            )
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("month")
        )

        result = []
        for (artist,), group in artist_month.group_by("artist_name", maintain_order=True):
            result.append({
                "artist_name": artist,
                "data": group.select("month", "hours").to_dicts(),
            })
        stats["artist_month_heatmap"] = result

    return stats
