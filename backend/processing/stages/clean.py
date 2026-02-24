"""Stage 2: Clean — Parse timestamps, extract date parts, normalize platforms."""

import logging

import polars as pl

logger = logging.getLogger(__name__)

PLATFORM_MAP = {
    "android": "Android",
    "ios": "iPhone",
    "iphone": "iPhone",
    "windows": "Windows",
    "osx": "macOS",
    "macos": "macOS",
    "web_player": "Web",
    "xbox": "Xbox",
    "playstation": "PlayStation",
    "smarttv": "Smart TV",
}


def _normalize_platform(platform: str | None) -> str:
    if not platform:
        return "Unknown"
    lower = platform.lower()
    for key, value in PLATFORM_MAP.items():
        if key in lower:
            return value
    return "Other"


def clean(lf: pl.LazyFrame) -> pl.LazyFrame:
    """Parse timestamps, extract date parts, and normalize platform names."""
    logger.info("Cleaning data...")

    lf = lf.with_columns(
        # Parse the timestamp
        pl.col("ts").str.to_datetime("%Y-%m-%dT%H:%M:%SZ", time_zone="UTC").alias("timestamp"),
        # Convert ms_played to hours
        (pl.col("ms_played") / 3_600_000).alias("hours_played"),
    ).with_columns(
        # Extract date parts from the parsed timestamp
        pl.col("timestamp").dt.year().alias("year"),
        pl.col("timestamp").dt.month().alias("month"),
        pl.col("timestamp").dt.hour().alias("hour"),
        pl.col("timestamp").dt.weekday().alias("weekday"),
        pl.col("timestamp").dt.date().alias("date"),
    )

    # Rename key columns for convenience
    lf = lf.rename({
        "master_metadata_track_name": "track_name",
        "master_metadata_album_artist_name": "artist_name",
        "master_metadata_album_album_name": "album_name",
    })

    return lf
