"""Advanced statistical analyzers."""

import math

import polars as pl


def compute_advanced(df: pl.DataFrame) -> dict:
    stats: dict = {}

    total = len(df)
    n_days = df["date"].n_unique() or 1
    total_hours = df["hours_played"].sum()

    # ── Statistics summary ────────────────────────────────────────────────────
    stats["statistics_summary"] = {
        "avg_daily_hours": round(total_hours / n_days, 2),
        "avg_daily_streams": round(total / n_days, 1),
        "avg_track_ms": round(df["ms_played"].mean(), 0) if total else 0,
        "median_track_ms": round(df["ms_played"].median(), 0) if total else 0,
        "total_days_active": n_days,
        "total_unique_albums": df["album_name"].drop_nulls().n_unique(),
    }

    # ── Year-over-year comparison ─────────────────────────────────────────────
    yearly = (
        df.group_by("year")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("streams"),
            pl.col("artist_name").drop_nulls().n_unique().alias("unique_artists"),
        )
        .sort("year")
    )
    yoy_dicts = yearly.to_dicts()
    for i, d in enumerate(yoy_dicts):
        if i == 0:
            d["change_pct"] = None
        else:
            prev = yoy_dicts[i - 1]["hours"]
            d["change_pct"] = round((d["hours"] - prev) / prev * 100, 1) if prev else None
    stats["year_over_year"] = yoy_dicts

    # ── Discovery rate (new unique tracks per month) ──────────────────────────
    tracks_with_month = (
        df.filter(pl.col("track_name").is_not_null())
        .with_columns(pl.col("timestamp").dt.strftime("%Y-%m").alias("ym"))
        .sort("timestamp")
    )
    # Find the first month each track appeared
    first_seen = (
        tracks_with_month.group_by("track_name", "artist_name")
        .agg(pl.col("ym").first().alias("first_month"))
    )
    monthly_new = (
        first_seen.group_by("first_month")
        .agg(pl.len().alias("new_tracks"))
        .sort("first_month")
    )
    discovery_dicts = monthly_new.to_dicts()
    cumulative = 0
    for d in discovery_dicts:
        cumulative += d["new_tracks"]
        d["month"] = d.pop("first_month")
        d["cumulative_tracks"] = cumulative
    stats["discovery_rate"] = discovery_dicts

    # ── Diversity score ───────────────────────────────────────────────────────
    stats["diversity_score"] = _compute_diversity(df)

    return stats


def _compute_diversity(df: pl.DataFrame) -> dict:
    """Shannon entropy, normalized entropy, Gini coefficient, top-10 concentration."""
    artist_plays = (
        df.filter(pl.col("artist_name").is_not_null())
        .group_by("artist_name")
        .agg(pl.len().alias("plays"))
    )
    plays = artist_plays["plays"].to_list()

    if not plays:
        return {
            "shannon_entropy": 0,
            "normalized_entropy": 0,
            "gini_coefficient": 0,
            "top10_concentration": 0,
        }

    total = sum(plays)
    n = len(plays)

    # Shannon entropy
    entropy = 0.0
    for p in plays:
        if p > 0:
            prob = p / total
            entropy -= prob * math.log2(prob)

    max_entropy = math.log2(n) if n > 1 else 1
    normalized = round(entropy / max_entropy, 4) if max_entropy else 0

    # Gini coefficient
    sorted_plays = sorted(plays)
    cum_sum = 0.0
    weighted_sum = 0.0
    for i, val in enumerate(sorted_plays, 1):
        cum_sum += val
        weighted_sum += i * val
    gini = round((2 * weighted_sum) / (n * cum_sum) - (n + 1) / n, 4) if cum_sum else 0

    # Top-10 concentration
    top10 = sorted(plays, reverse=True)[:10]
    top10_pct = round(sum(top10) / total * 100, 1) if total else 0

    return {
        "shannon_entropy": round(entropy, 4),
        "normalized_entropy": normalized,
        "gini_coefficient": gini,
        "top10_concentration": top10_pct,
    }
