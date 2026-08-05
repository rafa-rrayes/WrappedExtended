"""Stage 2: Clean — Parse timestamps, extract date parts, normalize platforms."""

import logging

import polars as pl

logger = logging.getLogger(__name__)

# Ordered: the first key found in the lowercased platform string wins, so the most
# specific tokens must come first. Two orderings are load-bearing, both learned from real
# exports rather than guessed:
#   * An Xbox identifies itself as "Partner windows_tv microsoft;xbox_one;…", so "xbox"
#     has to beat "windows" or every console play is filed as desktop Windows.
#   * A client is more interesting than the OS it runs on, so "web_player" beats "osx".
PLATFORM_MAP = {
    "xbox": "Xbox",
    "playstation": "PlayStation",
    "smarttv": "Smart TV",
    "android": "Android",
    "iphone": "iPhone",
    "ios": "iPhone",
    "web_player": "Web",
    # "OS X 10.14.5 [x86 8]" is the commonest desktop string in real exports, and the
    # space means "osx" alone never matched it.
    "os x": "macOS",
    "osx": "macOS",
    "macos": "macOS",
    "windows": "Windows",
}


def _normalize_platform(platform: str | None) -> str:
    if not platform:
        return "Unknown"
    lower = platform.lower()
    for key, value in PLATFORM_MAP.items():
        if key in lower:
            return value
    return "Other"


def _platform_expr() -> pl.Expr:
    """`_normalize_platform` as a Polars expression, so it can run over the LazyFrame.

    Kept in lockstep with the Python version above, which stays as the readable reference
    and is what the tests pin.
    """
    # An export where every row is missing `platform` infers the column as Null, and the
    # `.str` namespace rejects that outright ("expected String type, got: null"), so the
    # cast is what keeps this from taking the whole pipeline down.
    platform = pl.col("platform").cast(pl.Utf8)
    lower = platform.str.to_lowercase()
    expr = pl.when(platform.is_null() | (platform.str.len_chars() == 0)).then(pl.lit("Unknown"))
    for key, value in PLATFORM_MAP.items():
        expr = expr.when(lower.str.contains(key, literal=True)).then(pl.lit(value))
    return expr.otherwise(pl.lit("Other")).alias("platform")


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

    # Collapse the raw platform strings. A real export carries ~63 distinct values —
    # one per OS build ("iOS 14.7.1 (iPhone13,2)") — which turns the platform chart into
    # a list of build numbers instead of the six devices the user actually listens on.
    if "platform" in lf.collect_schema().names():
        lf = lf.with_columns(_platform_expr())

    # Rename key columns for convenience
    lf = lf.rename(
        {
            "master_metadata_track_name": "track_name",
            "master_metadata_album_artist_name": "artist_name",
            "master_metadata_album_album_name": "album_name",
        }
    )

    return lf
