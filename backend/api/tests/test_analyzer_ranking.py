"""Analyzers that rank: each list has to be ordered by the metric it is named after.

Every case here was a live bug — the charts were sorted by play count regardless of their
own title, so "Skip Rate by Artist" opened on the user's favourite artist at 4% and the
completion list ran 36%, 27%, 34%, 31% down the page. The thresholds are load-bearing too:
without a play floor, ranking by rate just promotes whatever was played twice.
"""

from datetime import date

from processing.stages.analyzers.bar_charts import compute_bar_charts
from processing.stages.analyzers.core_stats import compute_core_stats
from processing.stages.analyzers.nostalgia import compute_nostalgia
from processing.stages.analyzers.spotify_specific import compute_spotify_specific

from . import factories

JAN = date(2023, 1, 1)


# ── Skip rate by artist ──────────────────────────────────────────────────────────


def skip_rates(df) -> list[tuple[str, float]]:
    rows = compute_bar_charts(df)["skip_rate_by_artist"]
    return [(r["artist_name"], r["skip_rate"]) for r in rows]


def test_artists_are_ranked_by_skip_rate_not_by_play_count():
    df = factories.make_df(
        # The most-played artist is barely skipped; the least-played is skipped constantly.
        factories.plays(start=JAN, count=40, artist="Favourite", skipped=False),
        factories.plays(start=JAN, count=4, artist="Favourite", skipped=True),
        factories.plays(start=JAN, count=3, artist="Skippy", skipped=False),
        factories.plays(start=JAN, count=9, artist="Skippy", skipped=True),
    )
    assert skip_rates(df) == [("Skippy", 75.0), ("Favourite", 9.1)]


def test_an_artist_below_the_play_floor_is_excluded():
    """Nine plays, all skipped, would otherwise top a rate-ranked chart at 100%."""
    df = factories.make_df(
        factories.plays(start=JAN, count=9, artist="OneOff", skipped=True),
        factories.plays(start=JAN, count=20, artist="Real", skipped=True),
    )
    assert [name for name, _ in skip_rates(df)] == ["Real"]


def test_skip_rate_is_a_percentage_not_a_ratio():
    """The frontend renders this value directly — a 0-1 ratio here shows up as 0%."""
    df = factories.make_df(
        factories.plays(start=JAN, count=10, artist="Half", skipped=True),
        factories.plays(start=JAN, count=10, artist="Half", skipped=False),
    )
    assert skip_rates(df) == [("Half", 50.0)]


# ── Track completion rates ───────────────────────────────────────────────────────


def test_tracks_are_ranked_by_completion_not_by_play_count():
    df = factories.make_df(
        # Played most, finished least: every play is a fraction of the longest one.
        factories.plays(start=JAN, count=20, track="Popular", ms_played=30_000),
        factories.play(JAN, track="Popular", ms_played=300_000),
        factories.plays(start=JAN, count=6, track="Finished", ms_played=300_000),
    )
    rows = compute_spotify_specific(df)["track_completion_rates"]
    names = [r["track_name"] for r in rows]
    assert names.index("Finished") < names.index("Popular")
    assert [r["avg_completion_pct"] for r in rows] == sorted(
        (r["avg_completion_pct"] for r in rows), reverse=True
    )


# ── Nostalgia tracks ─────────────────────────────────────────────────────────────


def test_a_wide_span_track_with_few_plays_is_not_a_long_time_favourite():
    """The real export that prompted this had a Budweiser ad jingle at #4."""
    df = factories.make_df(
        factories.play(date(2016, 1, 1), track="Jingle"),
        factories.play(date(2017, 1, 1), track="Jingle"),
        factories.play(date(2026, 1, 1), track="Jingle"),
        factories.plays(start=date(2018, 1, 1), count=25, track="Actually Loved"),
    )
    tracks = [t["track_name"] for t in compute_nostalgia(df)["nostalgia_tracks"]]
    assert tracks == ["Actually Loved"]


# ── Skip percentage ──────────────────────────────────────────────────────────────


def test_skip_pct_divides_by_the_plays_where_skip_was_recorded():
    """Matches `query_engine._skip_rate`. Older exports leave `skipped` null on most rows,
    and counting those as "not skipped" is what had Habits reporting 19% against Compare's
    45% for the same listening."""
    df = factories.make_df(
        factories.plays(start=JAN, count=6, skipped=None),
        factories.plays(start=JAN, count=3, skipped=True),
        factories.plays(start=JAN, count=1, skipped=False),
    )
    # 3 of the 4 rows that carry skip info — not 3 of 10.
    assert compute_core_stats(df)["skip_pct"] == 75.0


def test_skip_pct_is_absent_when_no_row_records_skip_information():
    df = factories.make_df(factories.plays(start=JAN, count=5, skipped=None))
    assert "skip_pct" not in compute_core_stats(df)
