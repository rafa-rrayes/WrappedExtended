"""Load a Spotify Extended Streaming History ZIP into a clean, sessionized DataFrame.

Standalone — no Django / MinIO dependency. Reads the raw export ZIP directly,
strips PII (ip_addr), parses timestamps, derives time parts, and assigns a
session id (a new session starts after a >30 min gap).
"""

from __future__ import annotations

import json
import zipfile
from io import BytesIO
from pathlib import Path

import numpy as np
import pandas as pd

AUDIO_PREFIX = "Streaming_History_Audio_"
VIDEO_PREFIX = "Streaming_History_Video_"
SESSION_GAP_MIN = 30  # minutes of inactivity that starts a new session


def _read_records(zip_path: str | Path) -> list[dict]:
    records: list[dict] = []
    with zipfile.ZipFile(zip_path) as zf:
        names = sorted(
            n for n in zf.namelist()
            if (base := n.rsplit("/", 1)[-1]).endswith(".json")
            and (base.startswith(AUDIO_PREFIX) or base.startswith(VIDEO_PREFIX))
        )
        for name in names:
            data = json.loads(zf.read(name))
            if isinstance(data, list):
                for r in data:
                    r.pop("ip_addr", None)  # strip PII
                    records.extend([r])
    return records


def load_history(zip_path: str | Path, music_only: bool = True) -> pd.DataFrame:
    """Return a cleaned, time-sorted, sessionized pandas DataFrame."""
    records = _read_records(zip_path)
    df = pd.DataFrame(records)

    # Normalize column names to the app's convention
    df = df.rename(columns={
        "master_metadata_track_name": "track_name",
        "master_metadata_album_artist_name": "artist_name",
        "master_metadata_album_album_name": "album_name",
    })

    df["ts"] = pd.to_datetime(df["ts"], utc=True, format="%Y-%m-%dT%H:%M:%SZ")
    df["ms_played"] = pd.to_numeric(df["ms_played"], errors="coerce").fillna(0).astype("int64")
    df["hours_played"] = df["ms_played"] / 3_600_000
    df["minutes_played"] = df["ms_played"] / 60_000

    if music_only:
        df = df[df["track_name"].notna() & df["artist_name"].notna()].copy()

    df = df.sort_values("ts").reset_index(drop=True)

    # Time parts (local-ish: data is UTC; kept as-is, consistent across analyses)
    ts = df["ts"]
    df["year"] = ts.dt.year
    df["month"] = ts.dt.month
    df["hour"] = ts.dt.hour
    df["weekday"] = ts.dt.weekday          # 0 = Monday
    df["is_weekend"] = df["weekday"] >= 5
    df["date"] = ts.dt.date

    # Coerce behavioral booleans (export sometimes uses None)
    for col in ("shuffle", "skipped", "offline", "incognito_mode"):
        if col in df.columns:
            df[col] = df[col].fillna(False).astype(bool)
        else:
            df[col] = False

    for col in ("reason_start", "reason_end", "platform", "conn_country"):
        if col not in df.columns:
            df[col] = "unknown"
        df[col] = df[col].fillna("unknown")

    # Sessionize: new session when the gap since the previous play exceeds threshold
    gap = ts.diff().dt.total_seconds().div(60)
    new_session = (gap > SESSION_GAP_MIN) | gap.isna()
    df["session_id"] = new_session.cumsum().astype("int64")

    return df


def quick_summary(df: pd.DataFrame) -> dict:
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


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else ".local-data/my_spotify_data 3.zip"
    d = load_history(path)
    import pprint
    pprint.pprint(quick_summary(d))
    print("\ncolumns:", list(d.columns))
    print("avg plays/session:", round(len(d) / d["session_id"].nunique(), 1))
