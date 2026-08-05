"""The query-engine primitives the newer features are built on.

`load_dataframe`'s caching is covered here with a fake Redis, which is the only way the
Redis branch runs at all in this suite — the real one is never reachable.
"""

import io
from datetime import date

import polars as pl
import pytest

from processing import query_engine as qe
from processing.query_engine import (
    custom_aggregate,
    filter_by_date_range,
    get_unique_names,
    journey_page,
    load_dataframe,
    time_machine,
    what_if,
)

from . import factories

# ── filter_by_date_range ─────────────────────────────────────────────────────────────


def test_filter_without_bounds_returns_everything(library):
    assert filter_by_date_range(library).height == factories.LIBRARY_TOTAL_PLAYS


def test_filter_bounds_are_inclusive(library):
    assert filter_by_date_range(library, date(2023, 1, 1), date(2023, 1, 3)).height == 3


def test_filter_with_only_a_start(library):
    assert filter_by_date_range(library, start=date(2023, 6, 1)).height == 3


def test_filter_with_only_an_end(library):
    assert filter_by_date_range(library, end=date(2023, 1, 10)).height == 10


def test_filter_matching_nothing_keeps_the_schema(library):
    filtered = filter_by_date_range(library, start=date(2030, 1, 1))
    assert filtered.height == 0
    assert filtered.schema == library.schema


def test_filter_with_start_after_end_yields_nothing(library):
    assert filter_by_date_range(library, date(2023, 6, 1), date(2023, 1, 1)).height == 0


# ── time_machine ─────────────────────────────────────────────────────────────────────


def test_time_machine_returns_only_period_a_without_a_comparison(library):
    result = time_machine(library, "2023-01-01", "2023-01-10")
    assert set(result) == {"period_a"}
    assert result["period_a"]["total_streams"] == 10
    assert result["period_a"]["total_hours"] == 10.0


def test_time_machine_adds_period_b_when_both_comparison_dates_are_given(library):
    result = time_machine(library, "2023-01-01", "2023-01-10", "2023-02-01", "2023-02-07")
    assert set(result) == {"period_a", "period_b"}
    assert result["period_b"]["total_streams"] == 7


@pytest.mark.parametrize(
    ("start", "end"), [("2023-02-01", None), (None, "2023-02-07")], ids=["start-only", "end-only"]
)
def test_time_machine_ignores_a_half_specified_comparison(library, start, end):
    result = time_machine(library, "2023-01-01", "2023-01-10", start, end)
    assert set(result) == {"period_a"}


def test_time_machine_runs_the_full_analyzer_suite(library):
    stats = time_machine(library, "2023-01-01", "2023-12-31")["period_a"]
    for key in ("total_hours", "top_artists", "top_tracks", "weekday_distribution", "platforms"):
        assert key in stats
    assert stats["unique_artists"] == len(factories.LIBRARY_ARTIST_PLAYS)


def test_time_machine_on_a_range_with_no_rows_does_not_raise(library):
    stats = time_machine(library, "2019-01-01", "2019-12-31")["period_a"]
    assert stats["total_streams"] == 0


# ── get_unique_names ─────────────────────────────────────────────────────────────────


def test_unique_names_are_sorted_and_deduplicated(library):
    names = get_unique_names(library)
    assert names["artists"] == sorted(factories.LIBRARY_ARTIST_PLAYS)
    assert len(names["tracks"]) == len(factories.LIBRARY_TRACK_PLAYS)
    assert {"track_name": "Intro", "artist_name": "Alpha"} in names["tracks"]
    assert {"track_name": "Intro", "artist_name": "Gamma"} in names["tracks"]


def test_unique_names_on_an_empty_frame(empty_frame):
    assert get_unique_names(empty_frame) == {"artists": [], "tracks": []}


# ── what_if ──────────────────────────────────────────────────────────────────────────


def test_what_if_excluding_an_artist_removes_their_plays(library):
    stats = what_if(library, exclude_artists=["Alpha"])
    assert stats["total_streams"] == factories.LIBRARY_TOTAL_PLAYS - 10
    assert "Alpha" not in [a["artist_name"] for a in stats["top_artists"]]


def test_what_if_excluding_a_track_removes_every_artists_copy(library):
    stats = what_if(library, exclude_tracks=["Intro"])
    assert stats["total_streams"] == factories.LIBRARY_TOTAL_PLAYS - 6


def test_what_if_min_ms_drops_short_plays():
    df = factories.make_df(
        factories.plays(artist="Long", start=date(2023, 1, 1), count=3),
        factories.plays(artist="Short", start=date(2023, 2, 1), count=4, ms_played=5_000),
    )
    assert what_if(df, min_ms=10_000)["total_streams"] == 3


def test_what_if_without_filters_matches_the_untouched_stats(library):
    assert what_if(library)["total_streams"] == factories.LIBRARY_TOTAL_PLAYS


# ── custom_aggregate ─────────────────────────────────────────────────────────────────


def test_custom_aggregate_groups_and_sorts(library):
    rows = custom_aggregate(library, "hours", "artist_name")
    assert rows[0] == {"artist_name": "Alpha", "hours": 10.0}
    assert len(rows) == len(factories.LIBRARY_ARTIST_PLAYS)


def test_custom_aggregate_plays_metric(library):
    rows = custom_aggregate(library, "plays", "weekday")
    assert sum(r["plays"] for r in rows) == factories.LIBRARY_TOTAL_PLAYS


def test_custom_aggregate_respects_the_limit(library):
    assert len(custom_aggregate(library, "hours", "artist_name", limit=2)) == 2


@pytest.mark.parametrize(
    ("metric", "group_by"),
    [("median", "artist_name"), ("hours", "ip_addr"), ("hours", "spotify_track_uri")],
)
def test_custom_aggregate_rejects_unlisted_columns(library, metric, group_by):
    with pytest.raises(ValueError):
        custom_aggregate(library, metric, group_by)


# ── journey_page ─────────────────────────────────────────────────────────────────────


def test_journey_year_returns_day_summaries(library):
    days = journey_page(library, year=2023)["days"]
    assert len(days) == 33  # every play in the library is on its own day
    assert days[0] == {"date": "2023-01-01", "hours": 1.0, "streams": 1, "unique_artists": 1}


def test_journey_month_narrows_to_that_month(library):
    days = journey_page(library, year=2023, month=2)["days"]
    assert [d["date"] for d in days] == [f"2023-02-0{n}" for n in range(1, 8)]


def test_journey_day_returns_individual_streams(library):
    result = journey_page(library, year=2023, month=1, day=1)
    assert result["date"] == "2023-01-01"
    assert len(result["streams"]) == 1
    stream = result["streams"][0]
    assert stream["track_name"] == "Intro"
    assert stream["artist_name"] == "Alpha"
    assert isinstance(stream["timestamp"], str)


def test_journey_day_with_no_plays_is_empty(library):
    assert journey_page(library, year=2023, month=1, day=20)["streams"] == []


def test_journey_year_with_no_plays_is_empty(library):
    assert journey_page(library, year=1999)["days"] == []


# ── load_dataframe ───────────────────────────────────────────────────────────────────


def _parquet_bytes(df: pl.DataFrame) -> bytes:
    buf = io.BytesIO()
    df.write_parquet(buf)
    return buf.getvalue()


class FakeRedis:
    """Just enough of redis-py for the query engine's IPC cache."""

    def __init__(self):
        self.store: dict[str, bytes] = {}
        self.gets = 0
        self.sets = 0

    def get(self, key):
        self.gets += 1
        return self.store.get(key)

    def setex(self, key, ttl, value):
        self.sets += 1
        self.store[key] = value


@pytest.fixture
def s3_stub(monkeypatch, library):
    """Serve one Parquet object from memory and count the downloads."""
    payload = _parquet_bytes(library)
    calls = []

    def _download(key):
        calls.append(key)
        return payload

    monkeypatch.setattr(qe, "download_file_from_s3", _download)
    return calls


def test_load_dataframe_reads_the_parquet_from_storage(s3_stub, library):
    df = load_dataframe("parquet/u/1.parquet")
    assert df.height == library.height
    assert df.columns == library.columns
    assert s3_stub == ["parquet/u/1.parquet"]


def test_load_dataframe_serves_repeat_reads_from_the_in_process_cache(s3_stub):
    load_dataframe("parquet/u/1.parquet")
    load_dataframe("parquet/u/1.parquet")
    load_dataframe("parquet/u/1.parquet")
    assert len(s3_stub) == 1


def test_load_dataframe_keys_the_cache_per_parquet(s3_stub):
    load_dataframe("parquet/u/1.parquet")
    load_dataframe("parquet/u/2.parquet")
    assert s3_stub == ["parquet/u/1.parquet", "parquet/u/2.parquet"]


def test_in_process_cache_evicts_the_oldest_entry_past_its_cap(s3_stub):
    for i in range(qe._CACHE_MAX + 1):
        load_dataframe(f"parquet/u/{i}.parquet")
    assert len(qe._df_cache) == qe._CACHE_MAX
    assert "parquet/u/0.parquet" not in qe._df_cache


def test_stale_in_process_entries_are_refetched(s3_stub, monkeypatch):
    load_dataframe("parquet/u/1.parquet")
    # Age the entry past the 10-minute TTL.
    _, cached = qe._df_cache["parquet/u/1.parquet"]
    qe._df_cache["parquet/u/1.parquet"] = (0.0, cached)
    load_dataframe("parquet/u/1.parquet")
    assert len(s3_stub) == 2


def test_a_second_process_is_served_from_redis_without_touching_storage(s3_stub, monkeypatch):
    fake = FakeRedis()
    monkeypatch.setattr(qe, "_get_redis", lambda: fake)

    load_dataframe("parquet/u/1.parquet")
    assert fake.sets == 1

    qe._df_cache.clear()  # simulate a different worker process
    df = load_dataframe("parquet/u/1.parquet")

    assert len(s3_stub) == 1  # storage was hit exactly once, by the first process
    assert df.height == factories.LIBRARY_TOTAL_PLAYS


def test_a_broken_redis_falls_back_to_storage(s3_stub, monkeypatch):
    class BrokenRedis:
        def get(self, key):
            raise ConnectionError("redis is down")

        def setex(self, *args):
            raise ConnectionError("redis is down")

    monkeypatch.setattr(qe, "_get_redis", lambda: BrokenRedis())
    df = load_dataframe("parquet/u/1.parquet")
    assert df.height == factories.LIBRARY_TOTAL_PLAYS
    assert len(s3_stub) == 1


def test_load_dataframe_works_with_no_redis_at_all(s3_stub):
    """The default in this suite — `_get_redis` returns None (see conftest)."""
    assert qe._get_redis() is None
    assert load_dataframe("parquet/u/1.parquet").height == factories.LIBRARY_TOTAL_PLAYS
