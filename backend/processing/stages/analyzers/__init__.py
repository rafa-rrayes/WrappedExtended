"""Analyzer registry — discovers and runs all compute_* functions."""

import logging

import polars as pl

from . import (
    advanced,
    bar_charts,
    context,
    core_stats,
    distributions,
    geographic,
    heatmaps,
    line_charts,
    nostalgia,
    scatter_plots,
    spotify_specific,
    time_patterns,
    wrapped,
)

logger = logging.getLogger(__name__)

_ANALYZERS: list[tuple[str, callable]] = [
    ("core_stats", core_stats.compute_core_stats),
    ("bar_charts", bar_charts.compute_bar_charts),
    ("line_charts", line_charts.compute_line_charts),
    ("time_patterns", time_patterns.compute_time_patterns),
    ("distributions", distributions.compute_distributions),
    ("heatmaps", heatmaps.compute_heatmaps),
    ("scatter_plots", scatter_plots.compute_scatter_plots),
    ("geographic", geographic.compute_geographic),
    ("advanced", advanced.compute_advanced),
    ("spotify_specific", spotify_specific.compute_spotify_specific),
    ("nostalgia", nostalgia.compute_nostalgia),
    ("context", context.compute_context),
    ("wrapped", wrapped.compute_wrapped),
]


def run_all_analyzers(df: pl.DataFrame) -> dict:
    """Run every registered analyzer and merge results into a single dict."""
    stats: dict = {}
    for name, func in _ANALYZERS:
        try:
            result = func(df)
            stats.update(result)
        except Exception:
            logger.exception("Analyzer %s failed — skipping", name)
    return stats
