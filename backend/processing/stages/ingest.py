"""Stage 1: Ingest — Download Spotify export ZIP from S3, validate, merge into LazyFrame."""

import json
import logging
import zipfile
from io import BytesIO

import polars as pl

from processing.validators import strip_pii, validate_file_structure, validate_zip_structure
from storage.client import download_file_from_s3

logger = logging.getLogger(__name__)


def _extract_records_from_zip(file_bytes: bytes) -> list[dict]:
    """Extract all streaming history records from a Spotify data export ZIP.

    The ZIP structure is:
        my_spotify_data.zip
        └── Spotify Extended Streaming History/
            ├── ReadMeFirst_ExtendedStreamingHistory.pdf
            ├── Streaming_History_Audio_2016-2019_0.json
            ├── Streaming_History_Audio_2019-2020_1.json
            ├── ...
            └── Streaming_History_Video_2023-2025.json
    """
    json_paths = validate_zip_structure(file_bytes)
    records: list[dict] = []

    with zipfile.ZipFile(BytesIO(file_bytes)) as zf:
        for path in json_paths:
            logger.info("Reading %s", path)
            data = json.loads(zf.read(path))
            if not isinstance(data, list):
                logger.warning("Skipping %s — not a JSON array", path)
                continue
            # Strip PII (ip_addr) from each record
            records.extend(strip_pii(r) for r in data)

    return records


def ingest(file_key: str) -> pl.LazyFrame:
    """Download Spotify export ZIP from S3, validate, and return a LazyFrame."""
    logger.info("Ingesting file: %s", file_key)

    file_bytes = download_file_from_s3(file_key)
    records = _extract_records_from_zip(file_bytes)

    if not records:
        raise ValueError("No streaming history records found in the ZIP file.")

    if not validate_file_structure(records):
        raise ValueError("Records don't match expected Spotify Extended Streaming History format.")

    logger.info("Ingested %d records from %s", len(records), file_key)
    return pl.LazyFrame(records)
