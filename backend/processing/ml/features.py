"""Bridge from the app's cleaned Polars Parquet to the pandas frame the models expect.

The ML suite was written against a standalone pandas loader (`scripts/ml/load.py`) that
read the raw export ZIP. In the app the same data already exists as a cleaned Polars
DataFrame (see `processing/stages/clean.py`), but with two mismatches this module fixes:

1. **No `session_id`.** The Parquet does not persist one, so it is re-derived exactly as
   the offline loader does: sort by timestamp, start a new session whenever the gap since
   the previous play exceeds 30 minutes, cumulative-sum the flags.
2. **Different conventions.** The Parquet calls the parsed timestamp `timestamp` and stores
   Polars' 1-7 weekday (Monday = 1).

Conventions emitted by `build_features` (what every model in this package sees):

| column                        | convention                                            |
|-------------------------------|-------------------------------------------------------|
| `ts`                          | tz-aware UTC datetime (the Parquet's `timestamp`)      |
| `year` `month` `hour` `date`  | derived from `ts`, therefore UTC                       |
| `weekday`                     | **0 = Monday … 6 = Sunday** (pandas), not Polars' 1-7  |
| `is_weekend`                  | `weekday >= 5`                                          |
| `session_id`                  | derived here, 30-minute inactivity gap                  |

The time parts are recomputed from `ts` rather than copied from the Parquet: it is the
same arithmetic on the same UTC instants, and it removes any chance of the 1-7 / 0-6
weekday convention leaking into a model feature.

No Django imports — this stays runnable outside the request/worker cycle.
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger(__name__)

SESSION_GAP_MIN = 30  # minutes of inactivity that starts a new session

# Behavioral flags the export sometimes omits or leaves null.
_BOOL_COLS = ("shuffle", "skipped", "offline", "incognito_mode")
_STR_COLS = ("reason_start", "reason_end", "platform", "conn_country")
_NAME_COLS = ("track_name", "artist_name", "album_name")


def _to_pandas(df) -> pd.DataFrame:
    """Accept a Polars DataFrame/LazyFrame (or a pandas frame) and return pandas."""
    if isinstance(df, pd.DataFrame):
        return df.copy()
    if hasattr(df, "collect"):  # pl.LazyFrame
        df = df.collect()

    wanted = ["timestamp", "ts", "ms_played", *_NAME_COLS, *_BOOL_COLS, *_STR_COLS]
    cols = [c for c in wanted if c in df.columns]
    # Only the columns the models actually read — a full export is ~350k rows and the
    # unused Spotify metadata (URIs, episode fields) would double the pandas footprint.
    return df.select(cols).to_pandas()


def build_features(df, music_only: bool = True) -> pd.DataFrame:
    """Return a cleaned, time-sorted, sessionized pandas DataFrame for the ML models."""
    d = _to_pandas(df)

    if "timestamp" in d.columns:
        # The Parquet keeps the raw string `ts` alongside the parsed `timestamp`.
        d = d.drop(columns=["ts"], errors="ignore").rename(columns={"timestamp": "ts"})
    if "ts" not in d.columns:
        raise ValueError("DataFrame has no timestamp column (`timestamp` or `ts`)")

    for col in _NAME_COLS:
        if col not in d.columns:
            d[col] = None
    if "ms_played" not in d.columns:
        d["ms_played"] = 0

    d["ts"] = pd.to_datetime(d["ts"], utc=True)
    d["ms_played"] = pd.to_numeric(d["ms_played"], errors="coerce").fillna(0).astype("int64")
    d["hours_played"] = d["ms_played"] / 3_600_000
    d["minutes_played"] = d["ms_played"] / 60_000

    if music_only:
        d = d[d["track_name"].notna() & d["artist_name"].notna()].copy()
    if d.empty:
        raise ValueError("No music plays left after filtering — nothing to model")

    d = d.sort_values("ts").reset_index(drop=True)

    ts = d["ts"]
    d["year"] = ts.dt.year
    d["month"] = ts.dt.month
    d["hour"] = ts.dt.hour
    d["weekday"] = ts.dt.weekday  # 0 = Monday (pandas), NOT Polars' 1-7
    d["is_weekend"] = d["weekday"] >= 5
    d["date"] = ts.dt.date

    for col in _BOOL_COLS:
        if col in d.columns:
            # `.where` rather than `.fillna`: a nullable Polars bool arrives as an object
            # column, and fillna's silent object→bool downcast is deprecated in pandas 2.
            d[col] = d[col].where(d[col].notna(), False).astype(bool)
        else:
            d[col] = False

    for col in _STR_COLS:
        if col not in d.columns:
            d[col] = "unknown"
        d[col] = d[col].fillna("unknown").astype(str)

    # Sessionize: a new session starts after SESSION_GAP_MIN of inactivity.
    gap = d["ts"].diff().dt.total_seconds().div(60)
    new_session = (gap > SESSION_GAP_MIN) | gap.isna()
    d["session_id"] = new_session.cumsum().astype("int64")

    logger.info(
        "Built ML feature frame: %d plays, %d sessions, %d artists",
        len(d),
        d["session_id"].nunique(),
        d["artist_name"].nunique(),
    )
    return d


def quick_summary(df: pd.DataFrame) -> dict:
    """Headline counts for the `summary` block of the insights payload."""
    return {
        "rows": int(len(df)),
        "date_min": str(df["ts"].min()),
        "date_max": str(df["ts"].max()),
        "total_hours": round(float(df["hours_played"].sum()), 1),
        "unique_artists": int(df["artist_name"].nunique()),
        "unique_tracks": int(df["track_name"].nunique()),
        "sessions": int(df["session_id"].nunique()),
        "skip_rate": round(float(df["skipped"].mean()), 4),
    }
