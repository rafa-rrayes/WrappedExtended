"""`entity_detail` and the helpers it composes (`search_entity`, streaks, companions)."""

from datetime import date, datetime, timedelta

import pytest

from processing.query_engine import entity_detail, search_entity

from . import factories

DETAIL_KEYS = {
    "name",
    "type",
    "total_hours",
    "total_plays",
    "first_listen",
    "last_listen",
    "monthly_timeline",
    "hourly_distribution",
    "platform_breakdown",
    "artist_name",
    "rank",
    "skip_rate",
    "albums",
    "top_tracks",
    "companions",
    "longest_streak_days",
    "weekday_distribution",
}


# ── Shape ────────────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    ("entity_type", "name"),
    [("artist", "Alpha"), ("track", "Alpha Song"), ("album", "Alpha LP")],
)
def test_detail_always_returns_the_same_key_set(library, entity_type, name):
    assert set(entity_detail(library, entity_type, name)) == DETAIL_KEYS


def test_detail_headline_numbers(library):
    detail = entity_detail(library, "artist", "Alpha")
    assert detail["name"] == "Alpha"
    assert detail["type"] == "artist"
    assert detail["total_hours"] == 10.0
    assert detail["total_plays"] == 10
    assert detail["first_listen"] == "2023-01-01"
    assert detail["last_listen"] == "2023-01-10"
    assert detail["rank"] == 1
    assert detail["artist_name"] is None  # artists have no parent artist


def test_rank_is_by_hours_across_the_whole_library(library):
    assert entity_detail(library, "artist", "Zeta (feat. X)")["rank"] == 7
    assert entity_detail(library, "artist", "beta")["rank"] == 2
    # Albums are ranked among albums: Beta LP 7h, Alpha LP 6h, Delta LP 5h, Gamma LP 5h,
    # then Alpha EP at 4h.
    assert entity_detail(library, "album", "Alpha EP")["rank"] == 5


def test_track_and_album_details_name_their_primary_artist(library):
    assert entity_detail(library, "track", "Beta Song")["artist_name"] == "beta"
    assert entity_detail(library, "album", "Back in Black")["artist_name"] == "AC/DC"


# ── Timelines and distributions ──────────────────────────────────────────────────────


def test_monthly_timeline_is_grouped_and_sorted(library):
    df = factories.make_df(
        factories.plays(artist="Spread", start=date(2023, 1, 1), count=2),
        factories.plays(artist="Spread", start=date(2023, 3, 1), count=3),
        factories.plays(artist="Spread", start=date(2023, 2, 1), count=1),
    )
    assert entity_detail(df, "artist", "Spread")["monthly_timeline"] == [
        {"month": "2023-01", "hours": 2.0, "plays": 2},
        {"month": "2023-02", "hours": 1.0, "plays": 1},
        {"month": "2023-03", "hours": 3.0, "plays": 3},
    ]


def test_hourly_distribution_only_lists_hours_that_occurred(library):
    df = factories.make_df(
        [
            factories.play(datetime(2023, 1, 1, 7, 0), artist="Clock"),
            factories.play(datetime(2023, 1, 2, 7, 30), artist="Clock"),
            factories.play(datetime(2023, 1, 3, 23, 0), artist="Clock"),
        ]
    )
    assert entity_detail(df, "artist", "Clock")["hourly_distribution"] == [
        {"hour": 7, "streams": 2},
        {"hour": 23, "streams": 1},
    ]


def test_weekday_distribution_is_zero_filled_to_all_seven_days(library):
    detail = entity_detail(library, "artist", "Zeta (feat. X)")  # exactly one play
    weekdays = detail["weekday_distribution"]
    assert len(weekdays) == 7
    assert [w["weekday"] for w in weekdays] == [1, 2, 3, 4, 5, 6, 7]
    assert [w["day_name"] for w in weekdays] == ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    assert sum(w["plays"] for w in weekdays) == 1
    # 2023-07-01 was a Saturday.
    assert next(w for w in weekdays if w["weekday"] == 6)["plays"] == 1


def test_weekday_distribution_counts_match_the_calendar(library):
    """Alpha ran 2023-01-01 (a Sunday) through 2023-01-10."""
    counts = {
        w["day_name"]: w["plays"]
        for w in entity_detail(library, "artist", "Alpha")["weekday_distribution"]
    }
    assert counts == {"Mon": 2, "Tue": 2, "Wed": 1, "Thu": 1, "Fri": 1, "Sat": 1, "Sun": 2}


def test_platform_breakdown_is_ordered_by_volume(library):
    df = factories.make_df(
        factories.plays(artist="Multi", start=date(2023, 1, 1), count=1, platform="web_player"),
        factories.plays(artist="Multi", start=date(2023, 1, 2), count=3, platform="Android OS 13"),
    )
    # `clean` normalizes the raw strings, so the breakdown is by device, not OS build.
    assert entity_detail(df, "artist", "Multi")["platform_breakdown"] == [
        {"platform": "Android", "count": 3},
        {"platform": "Web", "count": 1},
    ]


# ── Albums / tracks ──────────────────────────────────────────────────────────────────


def test_artist_detail_lists_albums_biggest_first(library):
    assert entity_detail(library, "artist", "Alpha")["albums"] == [
        {"album_name": "Alpha LP", "hours": 6.0, "plays": 6},
        {"album_name": "Alpha EP", "hours": 4.0, "plays": 4},
    ]


def test_artist_detail_lists_top_tracks_biggest_first(library):
    assert entity_detail(library, "artist", "Alpha")["top_tracks"] == [
        {"track_name": "Alpha Song", "hours": 6.0, "plays": 6},
        {"track_name": "Intro", "hours": 4.0, "plays": 4},
    ]


def test_track_detail_has_no_child_lists(library):
    detail = entity_detail(library, "track", "Beta Song")
    assert detail["albums"] == []
    assert detail["top_tracks"] == []


def test_album_detail_lists_its_tracks(library):
    assert entity_detail(library, "album", "Alpha LP")["top_tracks"] == [
        {"track_name": "Alpha Song", "hours": 6.0, "plays": 6}
    ]


# ── Skip rate ────────────────────────────────────────────────────────────────────────


def test_skip_rate_is_the_share_of_plays_with_a_recorded_skip(library):
    assert entity_detail(library, "artist", "beta")["skip_rate"] == pytest.approx(3 / 7, abs=1e-4)


def test_skip_rate_is_zero_when_nothing_was_skipped(library):
    assert entity_detail(library, "artist", "Alpha")["skip_rate"] == 0.0


def test_skip_rate_is_none_when_the_export_never_recorded_it(library):
    """Gamma's `skipped` is null on every row — unknowable, which is not the same as 0."""
    assert entity_detail(library, "artist", "Gamma")["skip_rate"] is None


def test_skip_rate_ignores_null_rows_rather_than_counting_them_as_unskipped():
    df = factories.make_df(
        factories.plays(artist="Half", start=date(2023, 1, 1), count=1, skipped=True),
        factories.plays(artist="Half", start=date(2023, 1, 2), count=1, skipped=False),
        factories.plays(artist="Half", start=date(2023, 1, 3), count=8, skipped=None),
    )
    assert entity_detail(df, "artist", "Half")["skip_rate"] == 0.5


def test_skip_rate_is_none_when_the_column_is_absent(library):
    assert entity_detail(library.drop("skipped"), "artist", "Alpha")["skip_rate"] is None


# ── Streaks ──────────────────────────────────────────────────────────────────────────


def test_longest_streak_counts_consecutive_calendar_days(library):
    assert entity_detail(library, "artist", "Alpha")["longest_streak_days"] == 10


def test_longest_streak_picks_the_longest_run_not_the_last(library):
    df = factories.make_df(
        factories.plays(artist="Streaky", start=date(2023, 1, 1), count=4),
        factories.plays(artist="Streaky", start=date(2023, 2, 1), count=2),
    )
    assert entity_detail(df, "artist", "Streaky")["longest_streak_days"] == 4


def test_multiple_plays_on_one_day_count_as_a_single_day():
    df = factories.make_df(
        factories.plays(
            artist="Binge", start=datetime(2023, 1, 1, 8, 0), count=6, step=timedelta(hours=1)
        )
    )
    assert entity_detail(df, "artist", "Binge")["longest_streak_days"] == 1


def test_a_single_play_is_a_one_day_streak(library):
    assert entity_detail(library, "artist", "Zeta (feat. X)")["longest_streak_days"] == 1


# ── Companions ───────────────────────────────────────────────────────────────────────


def test_companions_are_artists_from_the_same_sessions(sessions_frame):
    assert entity_detail(sessions_frame, "artist", "Alpha")["companions"] == [
        {"artist_name": "Companion", "shared_sessions": 2},
        {"artist_name": "Stranger", "shared_sessions": 1},
    ]


def test_companions_exclude_the_entitys_own_artist(sessions_frame):
    companions = entity_detail(sessions_frame, "artist", "Alpha")["companions"]
    assert "Alpha" not in [c["artist_name"] for c in companions]


def test_companions_are_empty_when_every_play_is_its_own_session(library):
    """The library spaces plays a day apart, well past the 30-minute session gap."""
    assert entity_detail(library, "artist", "Alpha")["companions"] == []


def test_companions_of_a_track_include_its_own_artists_session_mates(sessions_frame):
    companions = entity_detail(sessions_frame, "track", "A1")["companions"]
    assert {c["artist_name"] for c in companions} == {"Companion", "Stranger"}


def test_companions_are_empty_when_the_export_has_no_artist_column(sessions_frame):
    detail = entity_detail(sessions_frame.drop("artist_name"), "track", "A1")
    assert detail["companions"] == []
    assert detail["artist_name"] is None


# ── Date scoping ─────────────────────────────────────────────────────────────────────


def test_detail_respects_the_date_range(library):
    detail = entity_detail(
        library, "artist", "Alpha", start=date(2023, 1, 3), end=date(2023, 1, 6)
    )
    assert detail["total_plays"] == 4
    assert detail["total_hours"] == 4.0
    assert detail["first_listen"] == "2023-01-03"
    assert detail["last_listen"] == "2023-01-06"
    assert detail["longest_streak_days"] == 4


def test_rank_is_computed_within_the_date_range(library):
    """Inside February, beta is the only artist there is."""
    detail = entity_detail(
        library, "artist", "beta", start=date(2023, 2, 1), end=date(2023, 2, 28)
    )
    assert detail["rank"] == 1


def test_detail_outside_the_date_range_is_not_found(library):
    assert entity_detail(library, "artist", "Alpha", start=date(2023, 5, 1)) == {}


# ── Not found / degenerate ───────────────────────────────────────────────────────────


def test_unknown_name_returns_empty(library):
    assert entity_detail(library, "artist", "Nobody") == {}


def test_name_lookup_is_exact_not_a_substring(library):
    assert entity_detail(library, "artist", "Alph") == {}
    assert entity_detail(library, "artist", "alpha") == {}


def test_unknown_entity_type_returns_empty(library):
    assert entity_detail(library, "playlist", "Alpha") == {}


def test_empty_dataframe_returns_empty(empty_frame):
    assert entity_detail(empty_frame, "artist", "Alpha") == {}


@pytest.mark.parametrize("name", ["AC/DC", "Zeta (feat. X)", "Épsilon"])
def test_regex_special_and_unicode_names_resolve(library, name):
    detail = entity_detail(library, "artist", name)
    assert detail["name"] == name
    assert detail["total_plays"] == factories.LIBRARY_ARTIST_PLAYS[name]


def test_single_play_entity_has_a_complete_payload(library):
    detail = entity_detail(library, "artist", "Zeta (feat. X)")
    assert detail["total_plays"] == 1
    assert detail["total_hours"] == 1.0
    assert detail["first_listen"] == detail["last_listen"] == "2023-07-01"
    assert detail["monthly_timeline"] == [{"month": "2023-07", "hours": 1.0, "plays": 1}]
    assert len(detail["weekday_distribution"]) == 7


# ── Known collision: two tracks with the same title ──────────────────────────────────


def test_track_detail_merges_same_titled_tracks_from_different_artists(library):
    """Documents current behaviour: "Intro" by Alpha (4 plays) and by Gamma (2) collapse
    into one page of 6 plays credited to Alpha. `browse_entities` keeps them separate.

    Reported to the maintainer; the concurrent `artist` disambiguation param on
    `entity_detail` is the fix. Update this test when that lands.
    """
    detail = entity_detail(library, "track", "Intro")
    assert detail["total_plays"] == 6
    assert detail["artist_name"] == "Alpha"


# ── search_entity, which entity_detail builds on ─────────────────────────────────────


def test_search_entity_returns_the_base_payload(library):
    result = search_entity(library, "artist", "Alpha")
    assert set(result) == {
        "name",
        "type",
        "total_hours",
        "total_plays",
        "first_listen",
        "last_listen",
        "monthly_timeline",
        "hourly_distribution",
        "platform_breakdown",
        "top_tracks",
        "artist_name",
    }
    assert result["total_plays"] == 10


def test_search_entity_omits_top_tracks_for_non_artists(library):
    assert "top_tracks" not in search_entity(library, "album", "Alpha LP")


def test_search_entity_caps_artist_top_tracks_at_ten():
    records = [
        r
        for i in range(15)
        for r in factories.plays(
            artist="Prolific",
            track=f"Track {i:02d}",
            album="LP",
            start=date(2023, 1, 1) + timedelta(days=i),
            count=i + 1,
        )
    ]
    assert len(search_entity(factories.make_df(records), "artist", "Prolific")["top_tracks"]) == 10


def test_search_entity_unknown_name_returns_empty(library):
    assert search_entity(library, "artist", "Nobody") == {}
