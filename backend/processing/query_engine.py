"""Central query engine for dynamic Parquet-based analytics.

Loads a user's cleaned Parquet from S3, caches in Redis,
and exposes query methods for Time Machine, Search, Chart Builder, What-If, and Journey.
"""

import hashlib
import io
import logging
from datetime import date

import polars as pl
from django.conf import settings

from storage.client import download_file_from_s3

from .stages.analyzers import run_all_analyzers

logger = logging.getLogger(__name__)

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


def search_entity(df: pl.DataFrame, entity_type: str, name: str) -> dict:
    """Compute micro-dashboard stats for a specific artist or track."""
    if entity_type == "artist":
        filtered = df.filter(pl.col("artist_name") == name)
    elif entity_type == "track":
        filtered = df.filter(pl.col("track_name") == name)
    else:
        return {}

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
    hourly = (
        filtered.group_by("hour")
        .agg(pl.len().alias("streams"))
        .sort("hour")
        .to_dicts()
    )

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

    # For tracks: add artist name
    if entity_type == "track":
        artists = filtered["artist_name"].drop_nulls().unique().to_list()
        result["artist_name"] = artists[0] if artists else None

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
        "artist_name", "track_name", "album_name", "platform",
        "year", "month", "hour", "weekday", "date",
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
                "timestamp", "track_name", "artist_name",
                "album_name", "ms_played", "hours_played",
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
