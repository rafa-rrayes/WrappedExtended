"""`compare_periods` — two analyzer runs plus the deltas the frontend renders."""

from datetime import date

from processing.query_engine import compare_periods

from . import factories

# Period A is Alpha's 10 plays in January; period B is beta's 7 in February.
A = ("2023-01-01", "2023-01-10")
B = ("2023-02-01", "2023-02-07")
EMPTY = ("2022-01-01", "2022-12-31")


def test_both_periods_are_computed_and_labelled(library):
    result = compare_periods(library, *A, *B)
    assert set(result) == {"period_a", "period_b", "deltas"}
    assert result["period_a"]["label"] == "2023-01-01 to 2023-01-10"
    assert result["period_a"]["start"] == "2023-01-01"
    assert result["period_a"]["end"] == "2023-01-10"
    assert result["period_b"]["label"] == "2023-02-01 to 2023-02-07"
    assert result["period_a"]["stats"]["total_streams"] == 10
    assert result["period_b"]["stats"]["total_streams"] == 7


def test_each_period_only_sees_its_own_rows(library):
    result = compare_periods(library, *A, *B)
    assert [a["artist_name"] for a in result["period_a"]["stats"]["top_artists"]] == ["Alpha"]
    assert [a["artist_name"] for a in result["period_b"]["stats"]["top_artists"]] == ["beta"]


def test_required_delta_metrics_are_always_present(library):
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert {"total_hours", "total_streams", "unique_artists", "unique_tracks"} <= set(deltas)
    for metric in deltas.values():
        assert set(metric) == {"a", "b", "abs", "pct"}


def test_delta_arithmetic(library):
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert deltas["total_hours"] == {"a": 10.0, "b": 7.0, "abs": -3.0, "pct": -30.0}
    assert deltas["total_streams"] == {"a": 10, "b": 7, "abs": -3, "pct": -30.0}
    assert deltas["unique_tracks"] == {"a": 2, "b": 1, "abs": -1, "pct": -50.0}


def test_pct_is_positive_when_b_is_larger(library):
    deltas = compare_periods(library, *B, *A)["deltas"]
    assert deltas["total_streams"]["abs"] == 3
    assert deltas["total_streams"]["pct"] == round(3 / 7 * 100, 2)


def test_pct_is_zero_when_nothing_changed(library):
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert deltas["unique_artists"] == {"a": 1, "b": 1, "abs": 0, "pct": 0.0}


def test_pct_is_none_when_the_a_value_is_zero(library):
    """The change from 0 is undefined; the frontend renders `null` as an em dash."""
    deltas = compare_periods(library, *EMPTY, *B)["deltas"]
    for metric in ("total_hours", "total_streams", "unique_artists", "unique_tracks"):
        assert deltas[metric]["a"] == 0
        assert deltas[metric]["pct"] is None
        assert deltas[metric]["abs"] > 0


def test_pct_is_none_for_a_zero_percentage_metric_too(library):
    """Alpha skipped nothing, so skip_pct in period A is 0.0 — still a division by zero."""
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert deltas["skip_pct"]["a"] == 0.0
    assert deltas["skip_pct"]["b"] > 0
    assert deltas["skip_pct"]["pct"] is None


def test_optional_metrics_appear_when_the_columns_exist(library):
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert "skip_pct" in deltas
    assert "shuffle_pct" in deltas


def test_optional_metrics_are_dropped_when_the_columns_are_missing(library):
    stripped = library.drop("skipped", "shuffle")
    deltas = compare_periods(stripped, *A, *B)["deltas"]
    assert "skip_pct" not in deltas
    assert "shuffle_pct" not in deltas
    assert "total_hours" in deltas  # required ones survive


def test_both_periods_empty_leaves_every_delta_at_zero(library):
    deltas = compare_periods(library, *EMPTY, "2021-01-01", "2021-12-31")["deltas"]
    assert deltas["total_hours"] == {"a": 0.0, "b": 0.0, "abs": 0.0, "pct": None}
    assert deltas["total_streams"] == {"a": 0, "b": 0, "abs": 0, "pct": None}


def test_identical_periods_produce_no_change(library):
    deltas = compare_periods(library, *A, *A)["deltas"]
    for metric in ("total_hours", "total_streams", "unique_artists", "unique_tracks"):
        assert deltas[metric]["abs"] == 0
        assert deltas[metric]["pct"] == 0.0


def test_counts_stay_integers_and_hours_stay_floats(library):
    deltas = compare_periods(library, *A, *B)["deltas"]
    assert isinstance(deltas["total_streams"]["a"], int)
    assert not isinstance(deltas["total_streams"]["a"], bool)
    assert isinstance(deltas["total_hours"]["a"], float)


def test_single_day_periods(library):
    result = compare_periods(library, "2023-01-01", "2023-01-01", "2023-07-01", "2023-07-01")
    assert result["period_a"]["stats"]["total_streams"] == 1
    assert result["period_b"]["stats"]["total_streams"] == 1
    assert result["deltas"]["total_streams"]["pct"] == 0.0


def test_compare_on_an_empty_dataframe_still_returns_the_envelope(empty_frame):
    result = compare_periods(empty_frame, *A, *B)
    assert set(result) == {"period_a", "period_b", "deltas"}
    assert result["deltas"]["total_streams"] == {"a": 0, "b": 0, "abs": 0, "pct": None}


def test_reversed_range_selects_nothing_rather_than_raising(library):
    """The serializer rejects end < start, but the engine must not blow up on its own."""
    deltas = compare_periods(library, "2023-01-10", "2023-01-01", *B)["deltas"]
    assert deltas["total_streams"]["a"] == 0


def test_period_stats_carry_the_full_analyzer_payload(library):
    stats = compare_periods(library, *A, *B)["period_a"]["stats"]
    for key in ("top_artists", "top_tracks", "monthly_hours", "hourly_distribution"):
        assert key in stats


def test_deltas_cover_a_period_spanning_the_whole_library(library):
    result = compare_periods(library, "2023-01-01", "2023-12-31", *B)
    assert result["period_a"]["stats"]["total_streams"] == factories.LIBRARY_TOTAL_PLAYS
    assert result["period_a"]["stats"]["unique_artists"] == len(factories.LIBRARY_ARTIST_PLAYS)
    assert result["deltas"]["total_streams"]["a"] == 33


def test_dates_outside_the_data_are_harmless(library):
    result = compare_periods(library, "1999-01-01", "2099-12-31", *B)
    assert result["period_a"]["stats"]["total_streams"] == factories.LIBRARY_TOTAL_PLAYS
    assert result["period_a"]["stats"]["date_range_start"] == str(date(2023, 1, 1))


def test_an_empty_period_reports_null_dates_not_the_string_none(library):
    """`str()` on an empty date column yields the literal "None", which serialized into
    the API response and rendered as if it were a date."""
    stats = compare_periods(library, *EMPTY, *B)["period_a"]["stats"]
    assert stats["total_streams"] == 0
    assert stats["date_range_start"] is None
    assert stats["date_range_end"] is None
