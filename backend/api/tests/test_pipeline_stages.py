"""Pipeline stages 1 and 2 — the ZIP goes in, the cleaned frame comes out.

The ZIPs here are built in memory; `download_file_from_s3` is stubbed so nothing
leaves the process.
"""

import json
import zipfile
from datetime import date, datetime
from io import BytesIO

import polars as pl
import pytest

from processing.stages import ingest as ingest_stage
from processing.stages.clean import _normalize_platform, clean
from processing.stages.ingest import ingest
from processing.validators import (
    strip_pii,
    validate_file_structure,
    validate_record,
    validate_zip_structure,
)

from . import factories

FOLDER = "Spotify Extended Streaming History"


def make_zip(members: dict[str, object]) -> bytes:
    """Zip up `{path: payload}`; lists and dicts are JSON-encoded, bytes go in verbatim."""
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for path, payload in members.items():
            if isinstance(payload, bytes):
                zf.writestr(path, payload)
            else:
                zf.writestr(path, json.dumps(payload))
    return buf.getvalue()


def export_zip(records: list[dict], *, folder: str = FOLDER) -> bytes:
    """A realistic export: the history JSON plus the README PDF Spotify ships with it."""
    prefix = f"{folder}/" if folder else ""
    return make_zip(
        {
            f"{prefix}ReadMeFirst_ExtendedStreamingHistory.pdf": b"%PDF-1.4 not really",
            f"{prefix}Streaming_History_Audio_2023_0.json": records,
        }
    )


@pytest.fixture
def s3_zip(monkeypatch):
    """Serve one in-memory ZIP as the object `ingest` downloads."""

    def _serve(file_bytes: bytes) -> str:
        monkeypatch.setattr(ingest_stage, "download_file_from_s3", lambda key: file_bytes)
        return "uploads/u/1/my_spotify_data.zip"

    return _serve


# ── strip_pii ────────────────────────────────────────────────────────────────────────


def test_strip_pii_removes_the_ip_address():
    record = factories.play(date(2023, 1, 1), ip_addr="203.0.113.42")
    assert strip_pii(record) == {k: v for k, v in record.items() if k != "ip_addr"}
    assert "ip_addr" not in record


def test_strip_pii_is_a_no_op_without_an_ip_address():
    record = factories.play(date(2023, 1, 1))
    assert strip_pii(dict(record)) == record


def test_strip_pii_keeps_everything_else():
    record = strip_pii(factories.play(date(2023, 1, 1), artist="Alpha", ip_addr="203.0.113.42"))
    assert record["master_metadata_album_artist_name"] == "Alpha"
    assert record["ms_played"] == factories.ONE_HOUR_MS


# ── validators ───────────────────────────────────────────────────────────────────────


def test_a_full_record_validates():
    assert validate_record(factories.play(date(2023, 1, 1))) is True


@pytest.mark.parametrize(
    "missing",
    ["ts", "ms_played", "platform", "master_metadata_track_name"],
)
def test_a_record_missing_a_required_field_does_not_validate(missing):
    record = factories.play(date(2023, 1, 1))
    del record[missing]
    assert validate_record(record) is False


def test_extra_fields_do_not_invalidate_a_record():
    record = factories.play(date(2023, 1, 1)) | {"audiobook_title": None, "episode_name": None}
    assert validate_record(record) is True


@pytest.mark.parametrize("data", [[], {}, "not a list", None])
def test_file_structure_rejects_anything_that_is_not_a_non_empty_list(data):
    assert validate_file_structure(data) is False


def test_file_structure_only_samples_the_first_and_last_records():
    """Characterization: a corrupt record in the middle is not detected here."""
    good = factories.play(date(2023, 1, 1))
    assert validate_file_structure([good, {"junk": 1}, good]) is True
    assert validate_file_structure([{"junk": 1}, good, good]) is False


# ── validate_zip_structure ───────────────────────────────────────────────────────────


def test_zip_structure_returns_the_history_paths():
    paths = validate_zip_structure(export_zip(factories.plays(start=date(2023, 1, 1), count=1)))
    assert paths == [f"{FOLDER}/Streaming_History_Audio_2023_0.json"]


def test_zip_structure_includes_video_history_and_sorts_the_paths():
    records = factories.plays(start=date(2023, 1, 1), count=1)
    paths = validate_zip_structure(
        make_zip(
            {
                f"{FOLDER}/Streaming_History_Video_2023.json": records,
                f"{FOLDER}/Streaming_History_Audio_2023_1.json": records,
                f"{FOLDER}/Streaming_History_Audio_2023_0.json": records,
            }
        )
    )
    assert paths == [
        f"{FOLDER}/Streaming_History_Audio_2023_0.json",
        f"{FOLDER}/Streaming_History_Audio_2023_1.json",
        f"{FOLDER}/Streaming_History_Video_2023.json",
    ]


def test_zip_structure_accepts_history_files_at_the_archive_root():
    paths = validate_zip_structure(
        export_zip(factories.plays(start=date(2023, 1, 1), count=1), folder="")
    )
    assert paths == ["Streaming_History_Audio_2023_0.json"]


def test_zip_structure_ignores_the_other_export_files():
    paths = validate_zip_structure(
        make_zip(
            {
                f"{FOLDER}/Streaming_History_Audio_2023_0.json": [],
                "Spotify Account Data/Userdata.json": {"email": "someone@example.com"},
                "Spotify Account Data/Playlist1.json": {},
                f"{FOLDER}/ReadMeFirst.pdf": b"%PDF",
            }
        )
    )
    assert paths == [f"{FOLDER}/Streaming_History_Audio_2023_0.json"]


def test_a_zip_without_streaming_history_is_rejected():
    payload = make_zip({"Spotify Account Data/Userdata.json": {"email": "a@b.c"}})
    with pytest.raises(ValueError, match="does not contain Spotify streaming history"):
        validate_zip_structure(payload)


def test_a_non_zip_upload_is_rejected():
    with pytest.raises(ValueError, match="not a valid ZIP archive"):
        validate_zip_structure(b"this is a .json someone renamed")


# ── ingest ───────────────────────────────────────────────────────────────────────────


def test_ingest_returns_a_lazyframe_of_every_record(s3_zip):
    key = s3_zip(export_zip(factories.plays(start=date(2023, 1, 1), count=5)))
    frame = ingest(key).collect()
    assert frame.height == 5
    assert frame["ms_played"].dtype == pl.Int64


def test_ingest_strips_the_ip_address_before_it_can_be_persisted(s3_zip):
    """The single most important thing this stage does."""
    records = factories.plays(start=date(2023, 1, 1), count=3, ip_addr="203.0.113.42")
    assert all("ip_addr" in r for r in records)

    key = s3_zip(export_zip(records))
    frame = ingest(key).collect()

    assert "ip_addr" not in frame.columns
    assert "203.0.113.42" not in str(frame.to_dicts())


def test_ingest_merges_every_history_file(s3_zip):
    key = s3_zip(
        make_zip(
            {
                f"{FOLDER}/Streaming_History_Audio_2022_0.json": factories.plays(
                    start=date(2022, 1, 1), count=4
                ),
                f"{FOLDER}/Streaming_History_Audio_2023_1.json": factories.plays(
                    start=date(2023, 1, 1), count=6
                ),
                f"{FOLDER}/Streaming_History_Video_2023.json": factories.plays(
                    start=date(2023, 6, 1), count=2
                ),
            }
        )
    )
    assert ingest(key).collect().height == 12


def test_ingest_skips_a_history_file_that_is_not_a_json_array(s3_zip):
    key = s3_zip(
        make_zip(
            {
                f"{FOLDER}/Streaming_History_Audio_2023_0.json": {"error": "not an array"},
                f"{FOLDER}/Streaming_History_Audio_2023_1.json": factories.plays(
                    start=date(2023, 1, 1), count=3
                ),
            }
        )
    )
    assert ingest(key).collect().height == 3


def test_ingest_rejects_an_export_with_no_records(s3_zip):
    key = s3_zip(export_zip([]))
    with pytest.raises(ValueError, match="No streaming history records"):
        ingest(key)


def test_ingest_rejects_records_that_are_not_spotify_shaped(s3_zip):
    key = s3_zip(export_zip([{"song": "Intro", "when": "2023-01-01"}]))
    with pytest.raises(ValueError, match="don't match expected Spotify"):
        ingest(key)


def test_ingest_rejects_a_corrupt_archive(s3_zip):
    key = s3_zip(b"PK\x03\x04 truncated")
    with pytest.raises(ValueError, match="not a valid ZIP archive"):
        ingest(key)


# ── clean ────────────────────────────────────────────────────────────────────────────


def raw_frame(records: list[dict]) -> pl.LazyFrame:
    """The LazyFrame `ingest` hands to `clean`."""
    return pl.LazyFrame(
        records, schema_overrides={"ms_played": pl.Int64}, infer_schema_length=None
    )


def test_clean_renames_the_master_metadata_columns():
    frame = clean(raw_frame(factories.plays(start=date(2023, 1, 1), count=1))).collect()
    assert {"track_name", "artist_name", "album_name"} <= set(frame.columns)
    assert not [c for c in frame.columns if c.startswith("master_metadata")]


def test_clean_parses_the_timestamp_as_utc():
    frame = clean(raw_frame([factories.play(datetime(2023, 3, 15, 21, 30, 0))])).collect()
    assert frame["timestamp"].dtype == pl.Datetime("us", "UTC")
    assert frame["timestamp"][0] == datetime.fromisoformat("2023-03-15T21:30:00+00:00")
    assert frame["ts"][0] == "2023-03-15T21:30:00Z"  # the raw string is kept


def test_clean_derives_the_date_parts():
    frame = clean(raw_frame([factories.play(datetime(2023, 3, 15, 21, 30, 0))])).collect()
    row = frame.row(0, named=True)
    assert (row["year"], row["month"], row["hour"], row["date"]) == (
        2023,
        3,
        21,
        date(2023, 3, 15),
    )


def test_clean_uses_the_polars_weekday_convention():
    """1-7 with Monday=1 — every downstream weekday map depends on this."""
    week = factories.plays(start=date(2023, 1, 2), count=7)  # 2023-01-02 is a Monday
    frame = clean(raw_frame(week)).collect()
    assert frame["weekday"].to_list() == [1, 2, 3, 4, 5, 6, 7]


def test_clean_converts_ms_to_hours():
    frame = clean(raw_frame([factories.play(date(2023, 1, 1), ms_played=1_800_000)])).collect()
    assert frame["hours_played"][0] == pytest.approx(0.5)


def test_clean_keeps_null_metadata_rows():
    """Podcast/video rows have no track metadata; they must survive to be filtered later."""
    frame = clean(
        raw_frame([factories.play(date(2023, 1, 1), artist=None, track=None, album=None)])
    ).collect()
    assert frame.height == 1
    assert frame["artist_name"][0] is None


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("iOS 17.1 (iPhone14,5)", "iPhone"),
        ("ios", "iPhone"),
        ("Android OS 13", "Android"),
        # Has a space, so the "osx" key alone never matched it — and it is the commonest
        # desktop string in a real export.
        ("OS X 10.14.5 [x86 8]", "macOS"),
        ("osx", "macOS"),
        # An Xbox announces itself with "windows" in the string; "xbox" has to win.
        ("Partner windows_tv microsoft;xbox_one;1fc2d01aa9074dde;;", "Xbox"),
        ("Windows 10 (10.0.19041; x64)", "Windows"),
        ("web_player", "Web"),
        ("Partner google cast_tv;BRAVIA_4K_UR2;;4.1.6", "Other"),
        (None, "Unknown"),
        ("", "Unknown"),
    ],
)
def test_clean_normalizes_the_platform_string(raw, expected):
    """A real export carries ~63 distinct platform strings — one per OS build — which the
    platform chart would otherwise render as 63 slices instead of six devices."""
    frame = clean(raw_frame([factories.play(date(2023, 1, 1), platform=raw)])).collect()
    assert frame["platform"][0] == expected


def test_clean_platform_expression_matches_the_python_reference():
    """The Polars expression and `_normalize_platform` must not drift apart."""
    raws = [
        "iOS 17.1 (iPhone14,5)",
        "OS X 10.14.5 [x86 8]",
        "Partner windows_tv microsoft;xbox_one;abc;;",
        "web_player",
        "Partner denon_alteclansing Denon;DENON-DWAVR_40-S950;;",
        None,
    ]
    frame = clean(
        raw_frame([factories.play(date(2023, 1, 1), platform=raw) for raw in raws])
    ).collect()
    assert frame["platform"].to_list() == [_normalize_platform(raw) for raw in raws]


def test_clean_is_lazy():
    lf = clean(raw_frame(factories.plays(start=date(2023, 1, 1), count=1)))
    assert isinstance(lf, pl.LazyFrame)


def test_clean_raises_on_an_unparseable_timestamp():
    bad = factories.play(date(2023, 1, 1)) | {"ts": "15/03/2023 21:30"}
    with pytest.raises(pl.exceptions.InvalidOperationError):
        clean(raw_frame([bad])).collect()
