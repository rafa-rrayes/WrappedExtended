"""Validates Spotify Extended Streaming History data export."""

import zipfile
from io import BytesIO

# Fields present in every Spotify Extended Streaming History record
REQUIRED_FIELDS = {
    "ts",
    "ms_played",
    "master_metadata_track_name",
    "master_metadata_album_artist_name",
    "master_metadata_album_album_name",
    "platform",
}

# Files we care about inside the ZIP
AUDIO_FILE_PREFIX = "Streaming_History_Audio_"
VIDEO_FILE_PREFIX = "Streaming_History_Video_"

# PII fields to strip before processing
PII_FIELDS = {"ip_addr"}


def validate_record(record: dict) -> bool:
    """Check that a single streaming history record has the required fields."""
    return REQUIRED_FIELDS.issubset(record.keys())


def validate_file_structure(data: list) -> bool:
    """Validate that the JSON data is a list of records with expected fields."""
    if not isinstance(data, list) or len(data) == 0:
        return False
    return validate_record(data[0]) and validate_record(data[-1])


def validate_zip_structure(file_bytes: bytes) -> list[str]:
    """Validate a Spotify data export ZIP and return the streaming history JSON paths.

    Raises ValueError if the ZIP doesn't look like a Spotify export.
    Returns list of JSON file paths inside the ZIP that contain streaming history.
    """
    try:
        zf = zipfile.ZipFile(BytesIO(file_bytes))
    except zipfile.BadZipFile as exc:
        raise ValueError("File is not a valid ZIP archive.") from exc

    json_paths = []
    for name in zf.namelist():
        basename = name.rsplit("/", 1)[-1]
        if basename.startswith(AUDIO_FILE_PREFIX) and basename.endswith(".json"):
            json_paths.append(name)
        elif basename.startswith(VIDEO_FILE_PREFIX) and basename.endswith(".json"):
            json_paths.append(name)

    zf.close()

    if not json_paths:
        raise ValueError(
            "ZIP does not contain Spotify streaming history files. "
            "Expected files matching Streaming_History_Audio_*.json or "
            "Streaming_History_Video_*.json inside the archive."
        )

    return sorted(json_paths)


def strip_pii(record: dict) -> dict:
    """Remove PII fields from a streaming history record."""
    for field in PII_FIELDS:
        record.pop(field, None)
    return record
