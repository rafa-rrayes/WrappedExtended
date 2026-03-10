"""Shared helpers for analyzer modules."""

import polars as pl


def has_column(df: pl.DataFrame, col: str) -> bool:
    """Check if a column exists in the DataFrame."""
    return col in df.columns


def safe_div(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safe division returning *default* when denominator is zero."""
    return round(numerator / denominator, 2) if denominator else default


def limit_list(items: list, n: int = 20) -> list:
    """Return at most *n* items from a list."""
    return items[:n]
