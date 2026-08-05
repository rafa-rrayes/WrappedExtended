"""`browse_entities` — pagination, ranking, sorting, search and date scoping."""

from datetime import date, datetime

import pytest

from processing.query_engine import browse_entities

from . import factories

RESULT_KEYS = {"name", "artist_name", "hours", "plays", "first_listen", "last_listen", "rank"}


# ── Pagination ───────────────────────────────────────────────────────────────────────


def test_count_is_the_whole_result_set_not_the_page(library):
    page = browse_entities(library, "artist", page=1, page_size=3)
    assert page["count"] == 7
    assert len(page["results"]) == 3


def test_pages_partition_the_library_without_gaps_or_repeats(library):
    seen = []
    for page_no in (1, 2, 3):
        page = browse_entities(library, "artist", page=page_no, page_size=3)
        assert page["page"] == page_no
        assert page["page_size"] == 3
        seen.extend(r["name"] for r in page["results"])
    assert seen == factories.LIBRARY_BY_HOURS_DESC
    assert len(set(seen)) == 7


def test_last_page_is_partial(library):
    page = browse_entities(library, "artist", page=3, page_size=3)
    assert [r["name"] for r in page["results"]] == ["Zeta (feat. X)"]
    assert page["count"] == 7


def test_page_past_the_end_is_empty_but_still_reports_the_count(library):
    page = browse_entities(library, "artist", page=99, page_size=3)
    assert page["results"] == []
    assert page["count"] == 7
    assert page["page"] == 99


@pytest.mark.parametrize("page", [0, -5])
def test_non_positive_page_is_clamped_to_the_first_page(library, page):
    result = browse_entities(library, "artist", page=page, page_size=3)
    assert result["page"] == 1
    assert [r["name"] for r in result["results"]] == factories.LIBRARY_BY_HOURS_DESC[:3]


def test_page_size_of_zero_is_clamped_to_one(library):
    result = browse_entities(library, "artist", page_size=0)
    assert result["page_size"] == 1
    assert len(result["results"]) == 1


def test_page_size_larger_than_the_library_returns_everything(library):
    result = browse_entities(library, "artist", page_size=500)
    assert len(result["results"]) == result["count"] == 7


# ── Ranking ──────────────────────────────────────────────────────────────────────────


def test_browse_rank_is_global_not_page_relative(library):
    """Page 2 of a 3-per-page listing must start at rank 4, not rank 1."""
    page2 = browse_entities(library, "artist", page=2, page_size=3)
    assert [r["rank"] for r in page2["results"]] == [4, 5, 6]
    page3 = browse_entities(library, "artist", page=3, page_size=3)
    assert [r["rank"] for r in page3["results"]] == [7]


def test_rank_restarts_at_one_when_the_sort_changes(library):
    ascending = browse_entities(library, "artist", sort="hours", order="asc", page_size=50)
    assert ascending["results"][0]["rank"] == 1
    assert ascending["results"][0]["name"] == "Zeta (feat. X)"
    assert [r["rank"] for r in ascending["results"]] == list(range(1, 8))


def test_ties_are_broken_by_name_so_ranks_are_stable(library):
    """Gamma and Delta both have 5 hours; the lower-cased name decides."""
    result = browse_entities(library, "artist", page_size=50)
    names = [r["name"] for r in result["results"]]
    assert names.index("Delta") < names.index("Gamma")
    # Same ordering whichever direction the primary key is sorted in.
    ascending = browse_entities(library, "artist", order="asc", page_size=50)
    asc_names = [r["name"] for r in ascending["results"]]
    assert asc_names.index("Delta") < asc_names.index("Gamma")


# ── Sorting ──────────────────────────────────────────────────────────────────────────


def test_default_sort_is_hours_descending(library):
    result = browse_entities(library, "artist", page_size=50)
    assert [r["name"] for r in result["results"]] == factories.LIBRARY_BY_HOURS_DESC
    assert [r["hours"] for r in result["results"]] == [10.0, 7.0, 5.0, 5.0, 3.0, 2.0, 1.0]


@pytest.mark.parametrize("sort_key", ["hours", "plays"])
def test_metric_sorts_reverse_cleanly(library, sort_key):
    desc = browse_entities(library, "artist", sort=sort_key, order="desc", page_size=50)
    asc = browse_entities(library, "artist", sort=sort_key, order="asc", page_size=50)
    assert [r[sort_key] for r in desc["results"]] == sorted(
        (r[sort_key] for r in desc["results"]), reverse=True
    )
    assert [r[sort_key] for r in asc["results"]] == sorted(r[sort_key] for r in asc["results"])
    assert {r["name"] for r in desc["results"]} == {r["name"] for r in asc["results"]}


def test_name_sort_is_case_folded(library):
    """`beta` must land between Alpha and Delta — raw byte order would put it last."""
    result = browse_entities(library, "artist", sort="name", order="asc", page_size=50)
    assert [r["name"] for r in result["results"]] == factories.LIBRARY_BY_NAME_ASC


def test_name_sort_descending_reverses_the_ascending_order(library):
    asc = browse_entities(library, "artist", sort="name", order="asc", page_size=50)
    desc = browse_entities(library, "artist", sort="name", order="desc", page_size=50)
    assert [r["name"] for r in desc["results"]] == list(reversed(factories.LIBRARY_BY_NAME_ASC))
    assert [r["name"] for r in asc["results"]] == factories.LIBRARY_BY_NAME_ASC


def test_first_listen_sort_orders_by_discovery_date(library):
    result = browse_entities(library, "artist", sort="first", order="asc", page_size=50)
    firsts = [r["first_listen"] for r in result["results"]]
    assert firsts == sorted(firsts)
    assert result["results"][0]["name"] == "Alpha"
    assert result["results"][0]["first_listen"] == factories.LIBRARY_FIRST_LISTEN["Alpha"]


def test_last_listen_sort_puts_the_most_recent_first(library):
    result = browse_entities(library, "artist", sort="last", order="desc", page_size=50)
    assert result["results"][0]["name"] == "Zeta (feat. X)"
    assert result["results"][-1]["name"] == "Alpha"
    assert result["results"][-1]["last_listen"] == "2023-01-10"


def test_unknown_sort_key_falls_back_to_hours(library):
    fallback = browse_entities(library, "artist", sort="bogus", page_size=50)
    default = browse_entities(library, "artist", page_size=50)
    assert [r["name"] for r in fallback["results"]] == [r["name"] for r in default["results"]]


# ── Search ───────────────────────────────────────────────────────────────────────────


def test_search_is_case_insensitive_substring(library):
    assert [r["name"] for r in browse_entities(library, "artist", q="ALPHA")["results"]] == [
        "Alpha"
    ]
    assert [r["name"] for r in browse_entities(library, "artist", q="et")["results"]] == [
        "beta",
        "Zeta (feat. X)",
    ]


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("AC/DC", "AC/DC"),
        ("(feat.", "Zeta (feat. X)"),
        ("Épsilon", "Épsilon"),
        ("épsilon", "Épsilon"),
    ],
)
def test_search_handles_regex_special_and_unicode_names(library, query, expected):
    result = browse_entities(library, "artist", q=query)
    assert [r["name"] for r in result["results"]] == [expected]


def test_search_is_literal_not_a_regex(library):
    """A bare '.' must match only the name that literally contains one."""
    result = browse_entities(library, "artist", q=".")
    assert [r["name"] for r in result["results"]] == ["Zeta (feat. X)"]
    assert result["count"] == 1


def test_search_surrounding_whitespace_is_ignored(library):
    assert browse_entities(library, "artist", q="  alpha  ")["count"] == 1


def test_search_with_no_matches_returns_the_empty_envelope(library):
    assert browse_entities(library, "artist", q="nothing here") == {
        "count": 0,
        "page": 1,
        "page_size": 50,
        "results": [],
    }


def test_search_narrows_the_count_and_reranks(library):
    result = browse_entities(library, "artist", q="a", page_size=50)
    names = [r["name"] for r in result["results"]]
    assert result["count"] == len(names)
    assert [r["rank"] for r in result["results"]] == list(range(1, len(names) + 1))


# ── Date scoping ─────────────────────────────────────────────────────────────────────


def test_date_range_limits_the_entities_and_the_totals(library):
    result = browse_entities(
        library, "artist", start=date(2023, 2, 1), end=date(2023, 3, 31), page_size=50
    )
    assert [(r["name"], r["hours"], r["rank"]) for r in result["results"]] == [
        ("beta", 7.0, 1),
        ("Gamma", 5.0, 2),
    ]
    assert result["count"] == 2


def test_partial_date_range_clips_an_entitys_hours(library):
    result = browse_entities(library, "artist", start=date(2023, 1, 6), page_size=50)
    alpha = next(r for r in result["results"] if r["name"] == "Alpha")
    assert alpha["hours"] == 5.0  # 2023-01-06 .. 2023-01-10
    assert alpha["first_listen"] == "2023-01-06"


def test_date_range_matching_nothing_returns_the_empty_envelope(library):
    assert browse_entities(library, "artist", start=date(2030, 1, 1))["count"] == 0


# ── Entity types and shape ───────────────────────────────────────────────────────────


def test_tracks_sharing_a_title_stay_separate_rows(library):
    result = browse_entities(library, "track", page_size=50)
    intros = [r for r in result["results"] if r["name"] == "Intro"]
    assert len(intros) == 2
    assert {r["artist_name"] for r in intros} == {"Alpha", "Gamma"}
    assert {r["plays"] for r in intros} == {4, 2}
    assert result["count"] == len(factories.LIBRARY_TRACK_PLAYS)


def test_albums_are_grouped_with_their_artist(library):
    result = browse_entities(library, "album", page_size=50)
    assert result["count"] == len(factories.LIBRARY_ALBUM_PLAYS)
    alpha_ep = next(r for r in result["results"] if r["name"] == "Alpha EP")
    assert (alpha_ep["artist_name"], alpha_ep["plays"], alpha_ep["hours"]) == ("Alpha", 4, 4.0)


def test_artist_rows_carry_a_null_artist_name(library):
    result = browse_entities(library, "artist", page_size=50)
    assert all(r["artist_name"] is None for r in result["results"])


def test_every_row_has_the_full_key_set_and_plain_python_types(library):
    for row in browse_entities(library, "track", page_size=50)["results"]:
        assert set(row) == RESULT_KEYS
        assert isinstance(row["hours"], float)
        assert isinstance(row["plays"], int)
        assert isinstance(row["rank"], int)
        assert isinstance(row["first_listen"], str) and len(row["first_listen"]) == 10


def test_unknown_entity_type_returns_the_empty_envelope(library):
    assert browse_entities(library, "podcast") == {
        "count": 0,
        "page": 1,
        "page_size": 50,
        "results": [],
    }


def test_missing_column_returns_the_empty_envelope(library):
    assert browse_entities(library.drop("album_name"), "album")["count"] == 0


def test_rows_with_a_null_name_are_excluded(library):
    podcast_row = factories.play(datetime(2023, 8, 1, 12, 0), artist=None, track=None, album=None)
    df = factories.make_df(factories.library_records(), podcast_row)
    result = browse_entities(df, "artist", page_size=50)
    assert result["count"] == 7
    assert all(r["name"] is not None for r in result["results"])


# ── Empty input ──────────────────────────────────────────────────────────────────────


def test_empty_dataframe_returns_the_empty_envelope(empty_frame):
    assert browse_entities(empty_frame, "artist") == {
        "count": 0,
        "page": 1,
        "page_size": 50,
        "results": [],
    }


def test_single_play_library():
    df = factories.make_df(
        factories.plays(artist="Solo", track="Only", album="Once", start=date(2023, 9, 9))
    )
    result = browse_entities(df, "artist")
    assert result["count"] == 1
    assert result["results"] == [
        {
            "name": "Solo",
            "artist_name": None,
            "hours": 1.0,
            "plays": 1,
            "first_listen": "2023-09-09",
            "last_listen": "2023-09-09",
            "rank": 1,
        }
    ]
