"""Central query engine for dynamic Parquet-based analytics.

Loads a user's cleaned Parquet from S3, caches in Redis, and exposes query methods for
Time Machine, Search, Chart Builder, What-If, Journey, entity browsing/detail, and
period comparison.

Everything below `load_dataframe` is a pure function of a Polars DataFrame — no Django or
DRF imports — so the analytics stay testable outside the request cycle.
"""

import hashlib
import io
import logging
from datetime import date, timedelta

import polars as pl
from django.conf import settings

from storage.client import download_file_from_s3

from .stages.analyzers import run_all_analyzers

logger = logging.getLogger(__name__)

# Column each browsable entity type groups on.
_ENTITY_COLUMNS = {
    "artist": "artist_name",
    "track": "track_name",
    "album": "album_name",
}

# Public sort keys → aggregated column names.
_BROWSE_SORT_FIELDS = {
    "hours": "hours",
    "plays": "plays",
    "name": "name",
    "first": "first_listen",
    "last": "last_listen",
}

_WEEKDAY_NAMES = {1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri", 6: "Sat", 7: "Sun"}

# A listening session ends after this much inactivity (the Parquet has no session id).
_SESSION_GAP = timedelta(minutes=30)

# Caps for the nested lists on an entity detail page.
_DETAIL_LIST_LIMIT = 100
_COMPANION_LIMIT = 20

# Metrics compared between two periods. The first four are always emitted; the rest only
# when the underlying columns existed in the export.
_DELTA_METRICS_REQUIRED = ("total_hours", "total_streams", "unique_artists", "unique_tracks")
_DELTA_METRICS_OPTIONAL = ("skip_pct", "shuffle_pct")

# In-process LRU cache for DataFrames (avoids Redis serialization overhead for single-worker dev)
_df_cache: dict[str, tuple[float, pl.DataFrame]] = {}
_CACHE_MAX = 10


def _get_redis():
    """Lazy Redis connection for caching."""
    try:
        import redis

        return redis.from_url(settings.CELERY_BROKER_URL, decode_responses=False)
    except Exception:
        return None


def load_dataframe(parquet_key: str) -> pl.DataFrame:
    """Load a Parquet file from S3 with in-process caching."""
    import time

    cache_key = parquet_key

    # Check in-process cache
    if cache_key in _df_cache:
        ts, df = _df_cache[cache_key]
        if time.time() - ts < 600:  # 10 min TTL
            return df

    # Check Redis cache
    redis_client = _get_redis()
    redis_key = f"parquet_ipc:{hashlib.md5(parquet_key.encode()).hexdigest()}"
    if redis_client:
        try:
            cached = redis_client.get(redis_key)
            if cached:
                df = pl.read_ipc(io.BytesIO(cached))
                _df_cache[cache_key] = (time.time(), df)
                return df
        except Exception:
            logger.debug("Redis cache miss for %s", parquet_key)

    # Download from S3
    data = download_file_from_s3(parquet_key)
    df = pl.read_parquet(io.BytesIO(data))

    # Cache in Redis (IPC format for fast deserialization)
    if redis_client:
        try:
            ipc_buf = io.BytesIO()
            df.write_ipc(ipc_buf)
            redis_client.setex(redis_key, 600, ipc_buf.getvalue())
        except Exception:
            logger.debug("Redis cache write failed for %s", parquet_key)

    # In-process cache
    if len(_df_cache) >= _CACHE_MAX:
        oldest = min(_df_cache, key=lambda k: _df_cache[k][0])
        del _df_cache[oldest]
    _df_cache[cache_key] = (time.time(), df)

    return df


def filter_by_date_range(
    df: pl.DataFrame, start: date | None = None, end: date | None = None
) -> pl.DataFrame:
    """Filter DataFrame by date range."""
    if start:
        df = df.filter(pl.col("date") >= start)
    if end:
        df = df.filter(pl.col("date") <= end)
    return df


def time_machine(
    df: pl.DataFrame,
    start: str,
    end: str,
    compare_start: str | None = None,
    compare_end: str | None = None,
) -> dict:
    """Re-run all analyzers on a date-filtered subset. Optionally compare two periods."""
    from datetime import date as d

    period_a = filter_by_date_range(df, d.fromisoformat(start), d.fromisoformat(end))
    result: dict = {"period_a": run_all_analyzers(period_a)}

    if compare_start and compare_end:
        period_b = filter_by_date_range(
            df, d.fromisoformat(compare_start), d.fromisoformat(compare_end)
        )
        result["period_b"] = run_all_analyzers(period_b)

    return result


def _entity_column(df: pl.DataFrame, entity_type: str) -> str | None:
    """Resolve an entity type to its DataFrame column, or None if unusable."""
    column = _ENTITY_COLUMNS.get(entity_type)
    if column is None or column not in df.columns:
        return None
    return column


def _primary_artist(filtered: pl.DataFrame) -> str | None:
    """The artist credited on most of these rows (deterministic, unlike `.unique()[0]`)."""
    if "artist_name" not in filtered.columns:
        return None
    ranked = (
        filtered.filter(pl.col("artist_name").is_not_null())
        .group_by("artist_name")
        .agg(pl.len().alias("plays"))
        .sort(["plays", "artist_name"], descending=[True, False])
    )
    return ranked["artist_name"][0] if not ranked.is_empty() else None


def _entity_rows(df: pl.DataFrame, column: str, name: str, artist: str | None) -> pl.DataFrame:
    """Rows for one entity, narrowed by artist when the caller disambiguates.

    `browse_entities` groups tracks and albums by (name, artist), so two songs sharing a
    title are separate rows there. Without the same narrowing here they would collapse
    into a single detail page with their stats merged.
    """
    rows = df.filter(pl.col(column) == name)
    if artist and column != "artist_name" and "artist_name" in df.columns:
        rows = rows.filter(pl.col("artist_name") == artist)
    return rows


def search_entity(
    df: pl.DataFrame, entity_type: str, name: str, artist: str | None = None
) -> dict:
    """Compute micro-dashboard stats for a specific artist, track, or album."""
    column = _entity_column(df, entity_type)
    if column is None:
        return {}

    filtered = _entity_rows(df, column, name, artist)
    if filtered.is_empty():
        return {}

    total_hours = round(filtered["hours_played"].sum(), 2)
    total_plays = len(filtered)

    # Monthly timeline
    monthly = (
        filtered.group_by(pl.col("timestamp").dt.strftime("%Y-%m").alias("month"))
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort("month")
        .to_dicts()
    )

    # Hourly distribution
    hourly = filtered.group_by("hour").agg(pl.len().alias("streams")).sort("hour").to_dicts()

    # Platform breakdown
    platform = []
    if "platform" in filtered.columns:
        platform = (
            filtered.filter(pl.col("platform").is_not_null())
            .group_by("platform")
            .agg(pl.len().alias("count"))
            .sort("count", descending=True)
            .to_dicts()
        )

    # First / last listen
    first_listen = str(filtered["date"].min())
    last_listen = str(filtered["date"].max())

    result = {
        "name": name,
        "type": entity_type,
        "total_hours": total_hours,
        "total_plays": total_plays,
        "first_listen": first_listen,
        "last_listen": last_listen,
        "monthly_timeline": monthly,
        "hourly_distribution": hourly,
        "platform_breakdown": platform,
    }

    # For artists: add top tracks
    if entity_type == "artist":
        top_tracks = (
            filtered.filter(pl.col("track_name").is_not_null())
            .group_by("track_name")
            .agg(
                pl.col("hours_played").sum().round(2).alias("hours"),
                pl.len().alias("plays"),
            )
            .sort("plays", descending=True)
            .head(10)
            .to_dicts()
        )
        result["top_tracks"] = top_tracks

    # Tracks/albums are attributed to their most-played artist; artists have no parent,
    # but the key is always present so consumers get one stable shape.
    result["artist_name"] = None if entity_type == "artist" else _primary_artist(filtered)

    return result


def get_unique_names(df: pl.DataFrame) -> dict:
    """Get unique artist and track names for autocomplete."""
    artists = df["artist_name"].drop_nulls().unique().sort().to_list()
    tracks = (
        df.filter(pl.col("track_name").is_not_null())
        .select("track_name", "artist_name")
        .unique()
        .sort("track_name")
        .to_dicts()
    )
    return {"artists": artists, "tracks": tracks}


def browse_entities(
    df: pl.DataFrame,
    entity_type: str,
    q: str | None = None,
    sort: str = "hours",
    order: str = "desc",
    page: int = 1,
    page_size: int = 50,
    start: date | None = None,
    end: date | None = None,
) -> dict:
    """Browse the full library of artists / tracks / albums, paginated.

    `count` is the total number of matching entities (computed before slicing) and `rank`
    is the 1-based position in the *current* sort across all pages, so page 3 of a
    hours-desc listing starts at rank 101 for page_size=50.

    Tracks and albums are grouped by (name, artist) so two songs sharing a title stay
    distinct, but `name` remains the primary field and `artist_name` is the secondary.
    """
    page = max(1, page)
    page_size = max(1, page_size)
    empty = {"count": 0, "page": page, "page_size": page_size, "results": []}

    column = _entity_column(df, entity_type)
    if column is None:
        return empty

    sort_field = _BROWSE_SORT_FIELDS.get(sort, "hours")
    filtered = filter_by_date_range(df, start, end).filter(pl.col(column).is_not_null())
    if filtered.is_empty():
        return empty

    group_cols = [column]
    if entity_type != "artist" and "artist_name" in filtered.columns:
        group_cols.append("artist_name")

    grouped = (
        filtered.group_by(group_cols)
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
            pl.col("date").min().alias("first_listen"),
            pl.col("date").max().alias("last_listen"),
        )
        .rename({column: "name"})
    )

    # type=artist (and exports missing artist_name) still needs the key, as null.
    if "artist_name" not in grouped.columns:
        grouped = grouped.with_columns(pl.lit(None, dtype=pl.Utf8).alias("artist_name"))

    # One case-folded key drives both search and A-Z ordering, so "alt-J" sorts next to
    # "Alt Bloom" instead of after "Zayn" the way raw byte order would put it.
    grouped = grouped.with_columns(pl.col("name").str.to_lowercase().alias("_name_key"))

    if q:
        # literal=True so a user typing "AC/DC" or "(feat." isn't parsed as a regex.
        grouped = grouped.filter(pl.col("_name_key").str.contains(q.strip().lower(), literal=True))

    count = grouped.height
    if count == 0:
        return empty

    # Tiebreak on name (then artist) so ranks are stable across identical metric values.
    sort_cols = ["_name_key" if sort_field == "name" else sort_field]
    descending = [order != "asc"]
    for tiebreak in ("_name_key", "artist_name"):
        if tiebreak != sort_cols[0]:
            sort_cols.append(tiebreak)
            descending.append(False)

    ranked = grouped.sort(sort_cols, descending=descending, nulls_last=True).with_row_index(
        "rank", offset=1
    )

    page_df = ranked.slice((page - 1) * page_size, page_size).with_columns(
        pl.col("first_listen").dt.strftime("%Y-%m-%d"),
        pl.col("last_listen").dt.strftime("%Y-%m-%d"),
    )

    results = page_df.select(
        "name", "artist_name", "hours", "plays", "first_listen", "last_listen", "rank"
    ).to_dicts()
    for row in results:
        row["hours"] = float(row["hours"] or 0.0)
        row["plays"] = int(row["plays"])
        row["rank"] = int(row["rank"])

    return {"count": count, "page": page, "page_size": page_size, "results": results}


def _entity_rank(
    scoped: pl.DataFrame, column: str, name: str, artist: str | None = None
) -> int | None:
    """1-based rank of `name` by hours listened among all entities in that column.

    Groups by (name, artist) when disambiguating so the rank agrees with the position
    `browse_entities` reports for the same row.
    """
    group_cols = [column]
    disambiguate = bool(artist) and column != "artist_name" and "artist_name" in scoped.columns
    if disambiguate:
        group_cols.append("artist_name")

    ranked = (
        scoped.filter(pl.col(column).is_not_null())
        .group_by(group_cols)
        .agg(pl.col("hours_played").sum().alias("hours"))
        .sort(["hours", *group_cols], descending=[True, *[False] * len(group_cols)])
        .with_row_index("rank", offset=1)
        .filter(pl.col(column) == name)
    )
    if disambiguate:
        ranked = ranked.filter(pl.col("artist_name") == artist)
    return int(ranked["rank"][0]) if not ranked.is_empty() else None


def _skip_rate(rows: pl.DataFrame) -> float | None:
    """Share of skipped plays, out of the plays where Spotify recorded skip info.

    Older exports leave `skipped` null on most rows, so dividing by every play would
    silently understate the rate. Returns None when nothing is knowable.
    """
    if "skipped" not in rows.columns or rows.is_empty():
        return None
    known = rows["skipped"].cast(pl.Boolean, strict=False).drop_nulls()
    if known.is_empty():
        return None
    return round((known.sum() or 0) / len(known), 4)


def _grouped_list(rows: pl.DataFrame, column: str) -> list[dict]:
    """Hours/plays per value of `column`, biggest first."""
    if column not in rows.columns:
        return []
    return (
        rows.filter(pl.col(column).is_not_null())
        .group_by(column)
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("plays"),
        )
        .sort(["hours", "plays", column], descending=[True, True, False])
        .head(_DETAIL_LIST_LIMIT)
        .to_dicts()
    )


def _sessionize(df: pl.DataFrame) -> pl.DataFrame:
    """Tag every stream with a session id, splitting on `_SESSION_GAP` of inactivity."""
    return df.sort("timestamp").with_columns(
        (pl.col("timestamp").diff() > _SESSION_GAP).fill_null(True).cum_sum().alias("session_id")
    )


def _companions(scoped: pl.DataFrame, column: str, name: str, exclude: list[str]) -> list[dict]:
    """Artists listened to in the same sessions as this entity."""
    if "timestamp" not in scoped.columns or "artist_name" not in scoped.columns:
        return []

    sessions = _sessionize(scoped)
    target_sessions = sessions.filter(pl.col(column) == name)["session_id"].unique()
    if target_sessions.is_empty():
        return []

    others = sessions.filter(pl.col("session_id").is_in(target_sessions)).filter(
        pl.col("artist_name").is_not_null()
    )
    if exclude:
        others = others.filter(~pl.col("artist_name").is_in(exclude))

    return (
        others.group_by("artist_name")
        .agg(pl.col("session_id").n_unique().alias("shared_sessions"))
        .sort(["shared_sessions", "artist_name"], descending=[True, False])
        .head(_COMPANION_LIMIT)
        .to_dicts()
    )


def _longest_streak_days(rows: pl.DataFrame) -> int:
    """Longest run of consecutive calendar days containing at least one play."""
    if "date" not in rows.columns or rows.is_empty():
        return 0
    runs = (
        rows.select(pl.col("date").unique().sort())
        .with_columns(
            (pl.col("date").diff().dt.total_days() != 1).fill_null(True).cum_sum().alias("run")
        )
        .group_by("run")
        .len()
    )
    return int(runs["len"].max())


def _weekday_distribution(rows: pl.DataFrame) -> list[dict]:
    """Plays per weekday, always all seven days so charts keep a stable x-axis."""
    if "weekday" not in rows.columns:
        return []
    counts = {
        r["weekday"]: r["plays"]
        for r in rows.group_by("weekday").agg(pl.len().alias("plays")).to_dicts()
    }
    return [
        {"weekday": day, "day_name": _WEEKDAY_NAMES[day], "plays": int(counts.get(day, 0))}
        for day in range(1, 8)
    ]


def entity_detail(
    df: pl.DataFrame,
    entity_type: str,
    name: str,
    start: date | None = None,
    end: date | None = None,
    artist: str | None = None,
) -> dict:
    """Everything `search_entity` returns, enriched for a full per-entity page.

    `artist` disambiguates tracks and albums that share a title with another entity;
    it is ignored for `entity_type="artist"`, where the name is already the key.

    Returns {} when the name matches nothing in the (optionally date-filtered) data.
    """
    column = _entity_column(df, entity_type)
    if column is None:
        return {}

    scoped = filter_by_date_range(df, start, end)
    result = search_entity(scoped, entity_type, name, artist)
    if not result:
        return {}

    rows = _entity_rows(scoped, column, name, artist)
    has_children = entity_type in ("artist", "album")

    result["rank"] = _entity_rank(scoped, column, name, artist)
    result["skip_rate"] = _skip_rate(rows)
    result["albums"] = _grouped_list(rows, "album_name") if has_children else []
    result["top_tracks"] = _grouped_list(rows, "track_name") if has_children else []
    result["companions"] = _companions(
        scoped,
        column,
        name,
        exclude=rows["artist_name"].drop_nulls().unique().to_list()
        if "artist_name" in rows.columns
        else [],
    )
    result["longest_streak_days"] = _longest_streak_days(rows)
    result["weekday_distribution"] = _weekday_distribution(rows)
    return result


def _as_number(value: object) -> float | int | None:
    """Return an analyzer output if it is numeric, else None.

    Ints stay ints (counts shouldn't render as 16568.0) and bools are rejected because
    `isinstance(True, int)` is True.
    """
    if isinstance(value, bool) or not isinstance(value, int | float):
        return None
    return value


def compare_periods(df: pl.DataFrame, a_start: str, a_end: str, b_start: str, b_end: str) -> dict:
    """Run the full analyzer suite over two date ranges and diff the headline metrics.

    `pct` is the percentage change from A to B (so +25.0 means B is 25% larger), and is
    None when A is zero because the change is then undefined.
    """
    machine = time_machine(df, a_start, a_end, compare_start=b_start, compare_end=b_end)
    stats_a = machine.get("period_a", {})
    stats_b = machine.get("period_b", {})

    deltas: dict[str, dict] = {}
    for metric in (*_DELTA_METRICS_REQUIRED, *_DELTA_METRICS_OPTIONAL):
        raw_a = _as_number(stats_a.get(metric))
        raw_b = _as_number(stats_b.get(metric))
        if raw_a is None and raw_b is None and metric not in _DELTA_METRICS_REQUIRED:
            continue
        value_a = raw_a if raw_a is not None else 0
        value_b = raw_b if raw_b is not None else 0
        deltas[metric] = {
            "a": value_a,
            "b": value_b,
            "abs": round(value_b - value_a, 4),
            "pct": round((value_b - value_a) / value_a * 100, 2) if value_a else None,
        }

    return {
        "period_a": {
            "label": f"{a_start} to {a_end}",
            "start": a_start,
            "end": a_end,
            "stats": stats_a,
        },
        "period_b": {
            "label": f"{b_start} to {b_end}",
            "start": b_start,
            "end": b_end,
            "stats": stats_b,
        },
        "deltas": deltas,
    }


def what_if(
    df: pl.DataFrame,
    exclude_artists: list[str] | None = None,
    exclude_tracks: list[str] | None = None,
    min_ms: int | None = None,
) -> dict:
    """Re-rank stats after excluding specified artists/tracks."""
    filtered = df
    if exclude_artists:
        filtered = filtered.filter(~pl.col("artist_name").is_in(exclude_artists))
    if exclude_tracks:
        filtered = filtered.filter(~pl.col("track_name").is_in(exclude_tracks))
    if min_ms is not None:
        filtered = filtered.filter(pl.col("ms_played") >= min_ms)

    return run_all_analyzers(filtered)


def custom_aggregate(
    df: pl.DataFrame,
    metric: str,
    group_by: str,
    limit: int = 100,
) -> list[dict]:
    """Dynamic aggregation: group data by a column and compute a metric."""
    allowed_metrics = {"hours", "plays", "avg_hours"}
    allowed_group_by = {
        "artist_name",
        "track_name",
        "album_name",
        "platform",
        "year",
        "month",
        "hour",
        "weekday",
        "date",
    }

    if metric not in allowed_metrics:
        raise ValueError(f"Invalid metric: {metric}")
    if group_by not in allowed_group_by:
        raise ValueError(f"Invalid group_by: {group_by}")

    agg_exprs = []
    sort_col = metric
    if metric == "hours":
        agg_exprs.append(pl.col("hours_played").sum().round(2).alias("hours"))
    elif metric == "plays":
        agg_exprs.append(pl.len().alias("plays"))
    elif metric == "avg_hours":
        agg_exprs.append(pl.col("hours_played").mean().round(4).alias("avg_hours"))

    result = (
        df.filter(pl.col(group_by).is_not_null())
        .group_by(group_by)
        .agg(*agg_exprs)
        .sort(sort_col, descending=True)
        .head(min(limit, 1000))
    )
    return result.to_dicts()


def journey_page(
    df: pl.DataFrame, year: int, month: int | None = None, day: int | None = None
) -> dict:
    """Return day-by-day or stream-by-stream journey data."""
    filtered = df.filter(pl.col("year") == year)
    if month is not None:
        filtered = filtered.filter(pl.col("month") == month)

    if day is not None:
        from datetime import date as d

        target = d(year, month or 1, day)
        streams = (
            filtered.filter(pl.col("date") == target)
            .sort("timestamp")
            .select(
                "timestamp",
                "track_name",
                "artist_name",
                "album_name",
                "ms_played",
                "hours_played",
            )
            .to_dicts()
        )
        for s in streams:
            s["timestamp"] = str(s["timestamp"])
        return {"date": str(target), "streams": streams}

    # Day-by-day summary
    daily = (
        filtered.group_by("date")
        .agg(
            pl.col("hours_played").sum().round(2).alias("hours"),
            pl.len().alias("streams"),
            pl.col("artist_name").drop_nulls().n_unique().alias("unique_artists"),
        )
        .sort("date")
        .to_dicts()
    )
    for d in daily:
        d["date"] = str(d["date"])
    return {"days": daily}
