"""Per-year Wrapped summary analyzer."""

import polars as pl


def compute_wrapped(df: pl.DataFrame) -> dict:
    years = df["year"].unique().sort().to_list()

    if not years:
        return {}

    summaries: dict = {}
    for year in years:
        yr_df = df.filter(pl.col("year") == year)
        if yr_df.is_empty():
            continue

        top_artist_row = (
            yr_df.filter(pl.col("artist_name").is_not_null())
            .group_by("artist_name")
            .agg(pl.col("hours_played").sum().alias("hours"))
            .sort("hours", descending=True)
            .head(1)
        )
        top_track_row = (
            yr_df.filter(pl.col("track_name").is_not_null())
            .group_by("track_name", "artist_name")
            .agg(pl.len().alias("plays"))
            .sort("plays", descending=True)
            .head(1)
        )
        top_album_row = (
            yr_df.filter(pl.col("album_name").is_not_null())
            .group_by("album_name", "artist_name")
            .agg(pl.col("hours_played").sum().round(2).alias("hours"))
            .sort("hours", descending=True)
            .head(1)
        )

        summary: dict = {
            "total_hours": round(yr_df["hours_played"].sum(), 2),
            "total_streams": yr_df.height,
            "unique_artists": yr_df["artist_name"].drop_nulls().n_unique(),
            "unique_tracks": yr_df["track_name"].drop_nulls().n_unique(),
        }

        if top_artist_row.height:
            row = top_artist_row.row(0, named=True)
            summary["top_artist"] = row["artist_name"]
            summary["top_artist_hours"] = round(row["hours"], 2)

        if top_track_row.height:
            row = top_track_row.row(0, named=True)
            summary["top_track"] = row["track_name"]
            summary["top_track_artist"] = row["artist_name"]
            summary["top_track_plays"] = row["plays"]

        if top_album_row.height:
            row = top_album_row.row(0, named=True)
            summary["top_album"] = row["album_name"]
            summary["top_album_artist"] = row["artist_name"]
            summary["top_album_hours"] = row["hours"]

        summaries[str(year)] = summary

    return {"wrapped_summaries": summaries} if summaries else {}
