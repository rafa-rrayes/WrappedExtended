"""Synthetic streaming-history factory for the test suite.

Every frame here is produced by pushing synthetic *raw* Spotify export records through
the real `processing.stages.ingest`/`clean` code path, so the column list, the dtypes and
Polars' 1-7 weekday convention (Monday = 1) can never drift from what the pipeline
actually writes to Parquet. Nothing in this module hardcodes a cleaned schema.

Plays default to `ms_played = 3_600_000` — exactly one hour — so every hours-based
aggregate is an exact integer-valued float and assertions can be equalities rather than
`pytest.approx` smoke checks.

Typical use::

    df = make_df(
        plays(artist="Alpha", track="Intro", start=date(2023, 1, 1), count=4),
        plays(artist="beta", track="Beta Song", start=date(2023, 2, 1), count=7),
    )
    # -> 11 rows, Alpha has 4.0 hours over 4 consecutive days.
"""

from __future__ import annotations

import zlib
from collections.abc import Iterable
from datetime import date, datetime, time, timedelta

import polars as pl

from processing.stages.clean import clean

# One hour per play: hours_played sums stay exact.
ONE_HOUR_MS = 3_600_000

# Plays land at this UTC time of day unless a datetime is passed explicitly, which keeps
# `hour`/`date` derivation predictable and away from midnight boundaries.
DEFAULT_TIME = time(12, 0, 0)

TS_FORMAT = "%Y-%m-%dT%H:%M:%SZ"

# Boolean columns Spotify leaves null on older exports.
NULLABLE_FLAGS = ("skipped", "shuffle", "offline", "incognito_mode")


def _as_datetime(when: date | datetime) -> datetime:
    if isinstance(when, datetime):
        return when
    return datetime.combine(when, DEFAULT_TIME)


def play(
    when: date | datetime,
    *,
    artist: str | None = "Alpha",
    track: str | None = "Intro",
    album: str | None = "Alpha EP",
    ms_played: int = ONE_HOUR_MS,
    platform: str = "iOS 17.1 (iPhone14,5)",
    conn_country: str | None = "US",
    shuffle: bool | None = False,
    skipped: bool | None = False,
    offline: bool | None = False,
    incognito_mode: bool | None = False,
    reason_start: str | None = "trackdone",
    reason_end: str | None = "trackdone",
    ip_addr: str | None = None,
) -> dict:
    """One raw export record, in the exact shape Spotify ships it in.

    Column names are the pre-`clean` ones (`master_metadata_*`); `ip_addr` is included
    only when asked for, because the ingest stage is supposed to strip it.
    """
    record = {
        "ts": _as_datetime(when).strftime(TS_FORMAT),
        "platform": platform,
        "ms_played": ms_played,
        "conn_country": conn_country,
        "master_metadata_track_name": track,
        "master_metadata_album_artist_name": artist,
        "master_metadata_album_album_name": album,
        # Stable across processes — `hash()` on str is salted per interpreter run.
        "spotify_track_uri": f"spotify:track:{zlib.crc32(f'{artist}|{track}'.encode()):022d}",
        "reason_start": reason_start,
        "reason_end": reason_end,
        "shuffle": shuffle,
        "skipped": skipped,
        "offline": offline,
        "incognito_mode": incognito_mode,
    }
    if ip_addr is not None:
        record["ip_addr"] = ip_addr
    return record


def plays(
    *,
    start: date | datetime,
    count: int = 1,
    step: timedelta = timedelta(days=1),
    **kwargs,
) -> list[dict]:
    """`count` records starting at `start`, each `step` after the previous one."""
    first = _as_datetime(start)
    return [play(first + step * i, **kwargs) for i in range(count)]


def make_df(*groups: Iterable[dict] | dict) -> pl.DataFrame:
    """Build a cleaned DataFrame from raw records, using the production `clean` stage.

    Mirrors `processing.stages.ingest.ingest`'s LazyFrame construction (including the
    `ms_played` Int64 override) so dtypes match a real run.
    """
    records: list[dict] = []
    for group in groups:
        if isinstance(group, dict):
            records.append(group)
        else:
            records.extend(group)
    if not records:
        raise ValueError("make_df needs at least one record; use empty_df() for zero rows")

    lf = pl.LazyFrame(records, schema_overrides={"ms_played": pl.Int64}, infer_schema_length=None)
    return clean(lf).collect()


def empty_df() -> pl.DataFrame:
    """Zero rows, full cleaned schema — what a date filter matching nothing produces."""
    return make_df(plays(start=date(2023, 1, 1), count=1)).head(0)


# ── The standard library used across the query-engine and API tests ──────────────────
#
# 33 plays, 1 hour each, 7 artists, no two artists sharing a month. Aggregates are
# spelled out in the LIBRARY_* constants below so tests assert exact numbers.
#
#   artist          plays  first        last         notes
#   Alpha           10     2023-01-01   2023-01-10   two tracks, two albums
#   beta             7     2023-02-01   2023-02-07   lowercase name; 3 of 7 skipped
#   Gamma            5     2023-03-01   2023-03-05   `skipped` is null on every row
#   Delta            5     2023-04-01   2023-04-05   ties Gamma on hours and plays
#   Épsilon          3     2023-05-01   2023-05-03   non-ASCII name
#   AC/DC            2     2023-06-01   2023-06-02   regex-special name
#   Zeta (feat. X)   1     2023-07-01   2023-07-01   regex-special name, single play

LIBRARY_ARTIST_PLAYS = {
    "Alpha": 10,
    "beta": 7,
    "Gamma": 5,
    "Delta": 5,
    "Épsilon": 3,
    "AC/DC": 2,
    "Zeta (feat. X)": 1,
}

LIBRARY_TOTAL_PLAYS = sum(LIBRARY_ARTIST_PLAYS.values())

# Hours-desc order. Gamma/Delta tie at 5 hours, broken by lowercased name ascending.
LIBRARY_BY_HOURS_DESC = ["Alpha", "beta", "Delta", "Gamma", "Épsilon", "AC/DC", "Zeta (feat. X)"]

# Name-ascending order. Case-folded, so "beta" lands between "Alpha" and "Delta" —
# raw byte order would put every capitalised name first.
LIBRARY_BY_NAME_ASC = ["AC/DC", "Alpha", "beta", "Delta", "Gamma", "Zeta (feat. X)", "Épsilon"]

LIBRARY_FIRST_LISTEN = {
    "Alpha": "2023-01-01",
    "beta": "2023-02-01",
    "Gamma": "2023-03-01",
    "Delta": "2023-04-01",
    "Épsilon": "2023-05-01",
    "AC/DC": "2023-06-01",
    "Zeta (feat. X)": "2023-07-01",
}

# (name, artist) pairs, so the two distinct "Intro" tracks stay countable.
LIBRARY_TRACK_PLAYS = {
    ("Intro", "Alpha"): 4,
    ("Alpha Song", "Alpha"): 6,
    ("Beta Song", "beta"): 7,
    ("Intro", "Gamma"): 2,
    ("Gamma Song", "Gamma"): 3,
    ("Delta Song", "Delta"): 5,
    ("Épsilon Song", "Épsilon"): 3,
    ("Thunderstruck", "AC/DC"): 2,
    ("Zeta Song", "Zeta (feat. X)"): 1,
}

LIBRARY_ALBUM_PLAYS = {
    ("Alpha EP", "Alpha"): 4,
    ("Alpha LP", "Alpha"): 6,
    ("Beta LP", "beta"): 7,
    ("Gamma LP", "Gamma"): 5,
    ("Delta LP", "Delta"): 5,
    ("Épsilon LP", "Épsilon"): 3,
    ("Back in Black", "AC/DC"): 2,
    ("Zeta LP", "Zeta (feat. X)"): 1,
}


def library_records() -> list[dict]:
    """Raw records for the standard library described above."""
    return [
        # Alpha: 4 plays of "Intro" (Alpha EP) then 6 of "Alpha Song" (Alpha LP).
        *plays(
            artist="Alpha",
            track="Intro",
            album="Alpha EP",
            start=date(2023, 1, 1),
            count=4,
        ),
        *plays(
            artist="Alpha",
            track="Alpha Song",
            album="Alpha LP",
            start=date(2023, 1, 5),
            count=6,
        ),
        # beta: 3 skipped, 4 not, so skip_rate is exactly 3/7.
        *plays(
            artist="beta",
            track="Beta Song",
            album="Beta LP",
            start=date(2023, 2, 1),
            count=3,
            skipped=True,
            shuffle=True,
        ),
        *plays(
            artist="beta",
            track="Beta Song",
            album="Beta LP",
            start=date(2023, 2, 4),
            count=4,
        ),
        # Gamma: `skipped` never recorded — skip rate is unknowable, not zero.
        *plays(
            artist="Gamma",
            track="Intro",
            album="Gamma LP",
            start=date(2023, 3, 1),
            count=2,
            skipped=None,
        ),
        *plays(
            artist="Gamma",
            track="Gamma Song",
            album="Gamma LP",
            start=date(2023, 3, 3),
            count=3,
            skipped=None,
        ),
        *plays(
            artist="Delta",
            track="Delta Song",
            album="Delta LP",
            start=date(2023, 4, 1),
            count=5,
        ),
        *plays(
            artist="Épsilon",
            track="Épsilon Song",
            album="Épsilon LP",
            start=date(2023, 5, 1),
            count=3,
        ),
        *plays(
            artist="AC/DC",
            track="Thunderstruck",
            album="Back in Black",
            start=date(2023, 6, 1),
            count=2,
        ),
        *plays(
            artist="Zeta (feat. X)",
            track="Zeta Song",
            album="Zeta LP",
            start=date(2023, 7, 1),
            count=1,
        ),
    ]


def library_df() -> pl.DataFrame:
    return make_df(library_records())


def session_df() -> pl.DataFrame:
    """Three tightly-packed listening sessions, for companion/session assertions.

    Session gap is 30 minutes, so 5-minute spacing keeps a run together and a day's gap
    starts a new one.

        session 1 (2023-01-01): Alpha, Alpha, Companion
        session 2 (2023-01-02): Alpha, Companion, Stranger
        session 3 (2023-01-03): Stranger, Stranger
    """
    five_min = timedelta(minutes=5)
    day1 = datetime(2023, 1, 1, 10, 0)
    day2 = datetime(2023, 1, 2, 10, 0)
    day3 = datetime(2023, 1, 3, 10, 0)
    return make_df(
        [
            play(day1, artist="Alpha", track="A1", album="A"),
            play(day1 + five_min, artist="Alpha", track="A2", album="A"),
            play(day1 + 2 * five_min, artist="Companion", track="C1", album="C"),
            play(day2, artist="Alpha", track="A1", album="A"),
            play(day2 + five_min, artist="Companion", track="C1", album="C"),
            play(day2 + 2 * five_min, artist="Stranger", track="S1", album="S"),
            play(day3, artist="Stranger", track="S1", album="S"),
            play(day3 + five_min, artist="Stranger", track="S2", album="S"),
        ]
    )


def ml_df(sessions: int = 60, artists: int = 8, per_session: int = 6) -> pl.DataFrame:
    """A small but non-degenerate frame the ML suite can actually fit models on.

    Fully deterministic — no RNG. Artists rotate on a fixed cycle, skip/shuffle/offline
    follow fixed modular patterns, and each session is a run of plays 6 minutes apart
    (well inside the 30-minute session gap). Sessions are 4 days and 1 hour apart, so
    the defaults give 360 plays spanning ~8 months across every hour of the day —
    enough for the embeddings, clustering, skip and forecast models to all run, while
    still finishing in about a second.
    """
    names = [f"Artist {chr(ord('A') + i)}" for i in range(artists)]
    records: list[dict] = []
    cursor = datetime(2023, 1, 1, 9, 0)
    for session in range(sessions):
        for slot in range(per_session):
            n = session + slot
            artist = names[n % artists]
            records.append(
                play(
                    cursor + timedelta(minutes=6 * slot),
                    artist=artist,
                    track=f"{artist} Track {slot % 3}",
                    album=f"{artist} Album",
                    ms_played=(15_000 if n % 5 == 0 else 120_000),
                    skipped=bool(n % 5 == 0),
                    shuffle=bool(n % 3 == 0),
                    offline=bool(n % 7 == 0),
                    reason_start="clickrow" if slot == 0 else "trackdone",
                    reason_end="fwdbtn" if n % 5 == 0 else "trackdone",
                )
            )
        cursor += timedelta(days=4, hours=1)
    return make_df(records)
