"""Nostalgia & lifecycle analyzers."""

import polars as pl


def compute_nostalgia(df: pl.DataFrame) -> dict:
    stats: dict = {}
    tracks = df.filter(pl.col("track_name").is_not_null())

    if tracks.is_empty():
        return stats

    # ── Nostalgia tracks (played across widest date span) ─────────────────────
    track_spans = (
        tracks.group_by("track_name", "artist_name")
        .agg(
            pl.col("timestamp").min().alias("first_listen"),
            pl.col("timestamp").max().alias("latest_listen"),
            pl.len().alias("plays"),
        )
        .with_columns(
            (pl.col("latest_listen") - pl.col("first_listen")).dt.total_days().alias("span_days")
        )
        # A 20-play floor, not 3. Ranking purely by date span let a track played twice
        # years apart — an ad jingle, in one real export — outrank genuine long-term
        # favourites. Loving something for a decade implies having played it.
        .filter(pl.col("plays") >= 20)
        .sort("span_days", descending=True)
        .head(30)
    )
    nostalgia_dicts = track_spans.to_dicts()
    for d in nostalgia_dicts:
        d["first_listen"] = str(d["first_listen"])
        d["latest_listen"] = str(d["latest_listen"])
        d.pop("span_days", None)
    stats["nostalgia_tracks"] = nostalgia_dicts

    # ── Music lifecycle (peak month + months active per track) ────────────────
    track_monthly = tracks.group_by(
        "track_name",
        "artist_name",
        pl.col("timestamp").dt.strftime("%Y-%m").alias("month"),
    ).agg(pl.len().alias("plays"))

    # find peak month per track
    peak = (
        track_monthly.sort("plays", descending=True)
        .group_by("track_name", "artist_name", maintain_order=True)
        .first()
        .rename({"month": "peak_month", "plays": "peak_plays"})
    )

    lifecycle = (
        track_monthly.group_by("track_name", "artist_name")
        .agg(
            pl.col("month").n_unique().alias("months_active"),
            pl.col("plays").sum().alias("total_plays"),
        )
        .join(
            peak.select("track_name", "artist_name", "peak_month"),
            on=["track_name", "artist_name"],
        )
        .filter(pl.col("total_plays") >= 5)
        .sort("total_plays", descending=True)
        .head(30)
    )
    stats["music_lifecycle"] = lifecycle.to_dicts()

    return stats
