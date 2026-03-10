"""Time-based pattern analyzers."""

import polars as pl

from .helpers import has_column


def compute_time_patterns(df: pl.DataFrame) -> dict:
    stats: dict = {}

    # ── Weekly hours (ISO week) ───────────────────────────────────────────────
    weekly = (
        df.group_by(pl.col("timestamp").dt.strftime("%G-W%V").alias("week"))
        .agg(pl.col("hours_played").sum().round(2).alias("hours"))
        .sort("week")
    )
    stats["weekly_hours"] = weekly.to_dicts()

    # ── Daily hours ───────────────────────────────────────────────────────────
    daily = (
        df.group_by("date")
        .agg(pl.col("hours_played").sum().round(2).alias("hours"))
        .sort("date")
    )
    daily_dicts = daily.to_dicts()
    for d in daily_dicts:
        d["date"] = str(d["date"])
    stats["daily_hours"] = daily_dicts

    # ── Seasonal patterns (avg hours per calendar month) ──────────────────────
    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December",
    }
    # first compute total hours and streams per (year, month), then average across years
    monthly_per_year = (
        df.group_by("year", "month")
        .agg(
            pl.col("hours_played").sum().alias("hours"),
            pl.len().alias("streams"),
        )
    )
    seasonal = (
        monthly_per_year.group_by("month")
        .agg(
            pl.col("hours").mean().round(2).alias("avg_hours"),
            pl.col("hours").sum().round(2).alias("total_hours"),
            pl.col("streams").sum().alias("streams"),
        )
        .sort("month")
    )
    seasonal_dicts = seasonal.to_dicts()
    for d in seasonal_dicts:
        d["month_name"] = month_names.get(d.pop("month"), "?")
    stats["seasonal_patterns"] = seasonal_dicts

    # ── Daily activity pattern (avg minutes per hour of day) ──────────────────
    n_days = df["date"].n_unique() or 1
    hourly_total = (
        df.group_by("hour")
        .agg(pl.col("hours_played").sum().alias("total_hours"))
        .sort("hour")
    )
    activity_dicts = hourly_total.to_dicts()
    for d in activity_dicts:
        d["avg_minutes"] = round(d.pop("total_hours") / n_days * 60, 1)
    stats["daily_activity_pattern"] = activity_dicts

    # ── Listening streaks (consecutive days with any play) ────────────────────
    dates_active = (
        df.select(pl.col("date").unique().sort())
        .to_series()
    )
    if len(dates_active) > 1:
        stats["listening_streaks"] = _compute_streaks(dates_active)
    else:
        stats["listening_streaks"] = {
            "current_streak": len(dates_active),
            "longest_streak": len(dates_active),
            "avg_streak": float(len(dates_active)),
            "streaks": [],
        }

    # ── Binge sessions (>2h continuous listening with <30min gaps) ────────────
    if has_column(df, "timestamp"):
        stats["binge_sessions"] = _compute_binge_sessions(df)

    return stats


def _compute_streaks(dates: pl.Series) -> dict:
    """Find consecutive-day streaks from a sorted Series of dates."""
    import datetime

    date_list = dates.to_list()
    streaks: list[dict] = []
    current_start = date_list[0]
    current_len = 1

    for i in range(1, len(date_list)):
        if date_list[i] - date_list[i - 1] == datetime.timedelta(days=1):
            current_len += 1
        else:
            if current_len >= 3:
                streaks.append({
                    "start": str(current_start),
                    "end": str(date_list[i - 1]),
                    "days": current_len,
                })
            current_start = date_list[i]
            current_len = 1

    # close last streak
    if current_len >= 3:
        streaks.append({
            "start": str(current_start),
            "end": str(date_list[-1]),
            "days": current_len,
        })

    streak_lengths = [s["days"] for s in streaks] if streaks else [0]
    return {
        "current_streak": current_len,
        "longest_streak": max(streak_lengths),
        "avg_streak": round(sum(streak_lengths) / len(streak_lengths), 1),
        "streaks": streaks[-20:],  # keep last 20
    }


def _compute_binge_sessions(df: pl.DataFrame) -> list[dict]:
    """Identify binge listening sessions (>2h with gaps <30min)."""
    sorted_df = df.sort("timestamp")
    timestamps = sorted_df["timestamp"].to_list()
    ms_played = sorted_df["ms_played"].to_list()

    if not timestamps:
        return []

    import datetime

    gap_threshold = datetime.timedelta(minutes=30)
    min_duration = datetime.timedelta(hours=2)
    sessions: list[dict] = []

    session_start = timestamps[0]
    session_ms = ms_played[0]
    session_tracks = 1

    for i in range(1, len(timestamps)):
        gap = timestamps[i] - timestamps[i - 1]
        if gap <= gap_threshold:
            session_ms += ms_played[i]
            session_tracks += 1
        else:
            duration = datetime.timedelta(milliseconds=session_ms)
            if duration >= min_duration:
                sessions.append({
                    "start": str(session_start),
                    "end": str(timestamps[i - 1]),
                    "duration_hours": round(session_ms / 3_600_000, 2),
                    "tracks_played": session_tracks,
                })
            session_start = timestamps[i]
            session_ms = ms_played[i]
            session_tracks = 1

    # close last session
    duration = datetime.timedelta(milliseconds=session_ms)
    if duration >= min_duration:
        sessions.append({
            "start": str(session_start),
            "end": str(timestamps[-1]),
            "duration_hours": round(session_ms / 3_600_000, 2),
            "tracks_played": session_tracks,
        })

    # return most recent 50 binge sessions
    return sessions[-50:]
