"""Persist stage — Write cleaned DataFrame as Parquet to S3."""

import io
import logging

import polars as pl

from storage.client import upload_bytes_to_s3

logger = logging.getLogger(__name__)


def persist_parquet(df: pl.DataFrame, user_id: int, upload_id: str) -> str:
    """Write DataFrame to Parquet in S3. Returns the S3 key."""
    key = f"parquet/{user_id}/{upload_id}.parquet"

    buf = io.BytesIO()
    df.write_parquet(buf, compression="zstd")
    upload_bytes_to_s3(buf.getvalue(), key)

    logger.info(
        "Persisted Parquet (%d rows, %.1f KB) at %s",
        len(df), len(buf.getvalue()) / 1024, key,
    )
    return key
