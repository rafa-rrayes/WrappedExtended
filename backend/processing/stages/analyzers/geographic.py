"""Geographic analyzers — guarded by has_column("conn_country")."""

import polars as pl

from .helpers import has_column, safe_div


def compute_geographic(df: pl.DataFrame) -> dict:
    stats: dict = {}

    if not has_column(df, "conn_country"):
        return stats

    country_df = df.filter(pl.col("conn_country").is_not_null())
    if country_df.is_empty():
        return stats

    # ── Country distribution ──────────────────────────────────────────────────
    countries = (
        country_df.group_by("conn_country")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort("hours", descending=True)
    )
    total_hrs = countries["hours"].sum()
    c_dicts = countries.to_dicts()
    for d in c_dicts:
        d["country"] = d.pop("conn_country")
        d["pct"] = round(safe_div(d["hours"], total_hrs) * 100, 1)
    stats["country_distribution"] = c_dicts

    # ── Travel music (top artist per country) ─────────────────────────────────
    travel = (
        country_df.filter(pl.col("artist_name").is_not_null())
        .group_by("conn_country", "artist_name")
        .agg(pl.col("hours_played").sum().round(2).alias("hours"))
        .sort("hours", descending=True)
    )
    travel_result = []
    seen_countries: set[str] = set()
    for row in travel.iter_rows(named=True):
        country = row["conn_country"]
        if country not in seen_countries:
            seen_countries.add(country)
            travel_result.append({
                "country": country,
                "top_artist": row["artist_name"],
                "hours": row["hours"],
            })
    stats["travel_music"] = travel_result

    return stats
