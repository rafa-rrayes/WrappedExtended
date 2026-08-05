"""Guard rails on the synthetic-data factory itself.

If these fail, every other assertion in the suite is built on sand — the factory is
supposed to produce byte-for-byte what `processing/stages/clean.py` writes to Parquet.
"""

from datetime import date, datetime

import polars as pl
import pytest

from . import factories

# The cleaned frame the rest of the app is written against.
EXPECTED_DTYPES = {
    "ts": pl.String,
    "platform": pl.String,
    "ms_played": pl.Int64,
    "conn_country": pl.String,
    "track_name": pl.String,
    "artist_name": pl.String,
    "album_name": pl.String,
    "reason_start": pl.String,
    "reason_end": pl.String,
    "shuffle": pl.Boolean,
    "skipped": pl.Boolean,
    "offline": pl.Boolean,
    "incognito_mode": pl.Boolean,
    "hours_played": pl.Float64,
    "date": pl.Date,
}


def test_cleaned_frame_has_every_column_the_app_reads():
    df = factories.library_df()
    for column, dtype in EXPECTED_DTYPES.items():
        assert column in df.columns, f"missing {column}"
        assert df.schema[column] == dtype, f"{column} is {df.schema[column]}, expected {dtype}"
    assert df.schema["timestamp"] == pl.Datetime(time_unit="us", time_zone="UTC")
    assert df.schema["year"] == pl.Int32
    for part in ("month", "hour", "weekday"):
        assert df.schema[part] == pl.Int8


def test_weekday_is_one_through_seven_with_monday_first():
    """Polars' convention, which `_weekday_distribution` and core_stats both assume."""
    # 2023-01-02 is a Monday; the week that follows walks Tue..Sun.
    df = factories.make_df(factories.plays(start=date(2023, 1, 2), count=7))
    assert df["weekday"].to_list() == [1, 2, 3, 4, 5, 6, 7]
    assert df["weekday"].min() == 1
    assert df["weekday"].max() == 7


def test_derived_time_parts_come_from_the_timestamp():
    df = factories.make_df(factories.play(datetime(2024, 3, 9, 21, 45, 0)))
    row = df.row(0, named=True)
    assert row["year"] == 2024
    assert row["month"] == 3
    assert row["hour"] == 21
    assert row["date"] == date(2024, 3, 9)
    assert row["weekday"] == 6  # Saturday


def test_one_hour_default_makes_hours_played_exact_to_two_places():
    """`clean` divides by a constant, which Polars turns into a reciprocal multiply, so a
    3_600_000 ms play comes out as 0.9999999999999999 rather than 1.0. Every public
    number is rounded to 2dp before it leaves the query engine, which is why the rest of
    the suite can still assert equalities."""
    df = factories.make_df(factories.plays(start=date(2023, 1, 1), count=5))
    assert df["hours_played"].to_list() == pytest.approx([1.0] * 5)
    assert round(df["hours_played"].sum(), 2) == 5.0


def test_library_matches_its_documented_aggregates():
    df = factories.library_df()
    assert df.height == factories.LIBRARY_TOTAL_PLAYS == 33
    counted = {
        r["artist_name"]: r["n"]
        for r in df.group_by("artist_name").agg(pl.len().alias("n")).to_dicts()
    }
    assert counted == factories.LIBRARY_ARTIST_PLAYS
    assert df.select(pl.struct("track_name", "artist_name").n_unique()).item() == len(
        factories.LIBRARY_TRACK_PLAYS
    )
    assert df.select(pl.struct("album_name", "artist_name").n_unique()).item() == len(
        factories.LIBRARY_ALBUM_PLAYS
    )


def test_empty_frame_keeps_the_full_schema():
    empty, full = factories.empty_df(), factories.library_df()
    assert empty.height == 0
    assert empty.columns == full.columns
    assert empty.schema == full.schema


def test_nulls_survive_into_the_cleaned_frame():
    """Older exports leave the behavioural flags null; the factory must reproduce that."""
    df = factories.make_df(
        factories.plays(start=date(2023, 1, 1), count=2, skipped=None, shuffle=None),
        factories.plays(start=date(2023, 1, 3), count=1, skipped=True),
    )
    assert df["skipped"].null_count() == 2
    assert df["shuffle"].null_count() == 2
    assert df.schema["skipped"] == pl.Boolean
