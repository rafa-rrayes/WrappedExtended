"""Stage 3: Aggregate — Compute all dashboard stats using Polars.

Delegates to the analyzers sub-package and merges the results.
"""

import logging

import polars as pl

from .analyzers import run_all_analyzers

logger = logging.getLogger(__name__)


def aggregate(lf: pl.LazyFrame) -> dict:
    """Compute all dashboard statistics. Returns a dict ready for JSONField storage."""
    logger.info("Aggregating stats...")
    df = lf.collect()

    stats = run_all_analyzers(df)

    logger.info(
        "Aggregation complete: %d streams, %.1f hours, %d artists",
        stats.get("total_streams", 0),
        stats.get("total_hours", 0),
        stats.get("unique_artists", 0),
    )
    return stats
