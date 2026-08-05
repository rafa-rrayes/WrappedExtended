"""Core stats — extracted from the original monolithic aggregate function.

Produces the same keys/shapes the frontend already consumes.
"""

import polars as pl

from .helpers import has_column


def compute_core_stats(df: pl.DataFrame) -> dict:
    stats: dict = {}
    total = len(df)

    # ── Summary ───────────────────────────────────────────────────────────────
    stats["total_streams"] = total
    stats["total_hours"] = round(df["hours_played"].sum(), 2)
    stats["unique_artists"] = df["artist_name"].drop_nulls().n_unique()
    stats["unique_tracks"] = df["track_name"].drop_nulls().n_unique()
    # str() on an empty column yields the literal "None", which serializes into the API
    # response as a string and renders as a date. A filtered range matching zero rows is
    # ordinary (Time Machine, /compare), so this has to be a real null.
    date_min, date_max = df["date"].min(), df["date"].max()
    stats["date_range_start"] = str(date_min) if date_min is not None else None
    stats["date_range_end"] = str(date_max) if date_max is not None else None

    # ── Top artists ───────────────────────────────────────────────────────────
    top_artists = (
        df.filter(pl.col("artist_name").is_not_null())
        .group_by("artist_name")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort("hours", descending=True)
        .head(15)
    )
    stats["top_artists"] = top_artists.to_dicts()

    # ── Top tracks ────────────────────────────────────────────────────────────
    top_tracks = (
        df.filter(pl.col("track_name").is_not_null())
        .group_by("track_name", "artist_name")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort("plays", descending=True)
        .head(20)
    )
    stats["top_tracks"] = top_tracks.to_dicts()

    # ── Top albums ────────────────────────────────────────────────────────────
    top_albums = (
        df.filter(pl.col("album_name").is_not_null())
        .group_by("album_name", "artist_name")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort("hours", descending=True)
        .head(10)
    )
    stats["top_albums"] = top_albums.to_dicts()

    # ── Monthly timeline ──────────────────────────────────────────────────────
    monthly = (
        df.group_by(pl.col("timestamp").dt.strftime("%Y-%m").alias("month"))
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("streams"),
        )
        .sort("month")
    )
    stats["monthly_hours"] = monthly.to_dicts()

    # ── Yearly stats ──────────────────────────────────────────────────────────
    yearly = (
        df.group_by("year")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.col("artist_name").drop_nulls().n_unique().alias("unique_artists"),
        )
        .sort("year")
    )
    stats["yearly_stats"] = yearly.to_dicts()

    # ── Hourly distribution ───────────────────────────────────────────────────
    hourly = (
        df.group_by("hour")
        .agg(
            pl.len().alias("streams"),
            pl.col("hours_played").sum().round(2).alias("hours"),
        )
        .sort("hour")
    )
    stats["hourly_distribution"] = hourly.to_dicts()

    # ── Weekday distribution ──────────────────────────────────────────────────
    weekday_names = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}
    weekday = (
        df.group_by("weekday")
        .agg(
            pl.len().alias("streams"),
            pl.col("hours_played").sum().round(2).alias("hours"),
        )
        .sort("weekday")
    )
    weekday_dicts = weekday.to_dicts()
    for d in weekday_dicts:
        d["day_name"] = weekday_names.get(d["weekday"], "?")
    stats["weekday_distribution"] = weekday_dicts

    # ── Shuffle / skip / offline / incognito percentages ──────────────────────
    if has_column(df, "shuffle"):
        shuffle_on = df.filter(pl.col("shuffle") == True).height  # noqa: E712
        stats["shuffle_pct"] = round(shuffle_on / total * 100, 1) if total else 0

    if has_column(df, "skipped"):
        skipped = df.filter(pl.col("skipped").is_not_null() & (pl.col("skipped") != 0)).height
        stats["skip_pct"] = round(skipped / total * 100, 1) if total else 0

    if has_column(df, "offline"):
        offline = df.filter(pl.col("offline") == True).height  # noqa: E712
        stats["offline_pct"] = round(offline / total * 100, 1) if total else 0

    if has_column(df, "incognito_mode"):
        incognito = df.filter(pl.col("incognito_mode") == True).height  # noqa: E712
        stats["incognito_pct"] = round(incognito / total * 100, 1) if total else 0

    # ── Platform distribution ─────────────────────────────────────────────────
    if has_column(df, "platform"):
        platforms = (
            df.filter(pl.col("platform").is_not_null())
            .group_by("platform")
            .agg(pl.len().alias("count"))
            .sort("count", descending=True)
        )
        total_with_platform = platforms["count"].sum()
        platform_dicts = platforms.to_dicts()
        for p in platform_dicts:
            p["pct"] = round(p["count"] / total_with_platform * 100, 1)
        stats["platforms"] = platform_dicts

    # ── Start / end reason distribution ───────────────────────────────────────
    for col_name, stat_key in [
        ("reason_start", "start_reasons"),
        ("reason_end", "end_reasons"),
    ]:
        if has_column(df, col_name):
            reasons = (
                df.filter(pl.col(col_name).is_not_null())
                .group_by(col_name)
                .agg(pl.len().alias("count"))
                .sort("count", descending=True)
                .head(6)
            )
            total_reasons = reasons["count"].sum()
            reason_dicts = reasons.to_dicts()
            for r in reason_dicts:
                r["pct"] = round(r["count"] / total_reasons * 100, 2)
            stats[stat_key] = reason_dicts

    return stats
