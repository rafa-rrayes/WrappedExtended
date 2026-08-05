"""Shared fixtures.

Two things every test in this package gets for free (both autouse):

* `_no_network` — boto3 is never constructed and `download_file_from_s3` always raises,
  so a test that forgets to inject a DataFrame fails loudly instead of quietly trying to
  reach MinIO.
* `_clean_state` — the query engine's in-process DataFrame cache and the Django cache
  (which is where DRF keeps throttle counters) are emptied around every test.
"""

from __future__ import annotations

import uuid

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from rest_framework.test import APIClient

from api.models import ProcessedDashboard, Upload

from . import factories


@pytest.fixture(autouse=True)
def _no_network(monkeypatch):
    """Fail fast on any attempt to talk to S3."""

    def _blocked(*args, **kwargs):
        raise AssertionError(
            "Test tried to reach S3. Inject a DataFrame with the `parquet` fixture "
            "(or patch processing.query_engine.load_dataframe) instead."
        )

    monkeypatch.setattr("storage.client._get_client", _blocked)
    monkeypatch.setattr("storage.client.download_file_from_s3", _blocked)
    monkeypatch.setattr("processing.query_engine.download_file_from_s3", _blocked)
    monkeypatch.setattr("processing.stages.ingest.download_file_from_s3", _blocked)
    # The query engine's Redis client is optional by design; force the "no Redis" branch
    # unless a test opts back in.
    monkeypatch.setattr("processing.query_engine._get_redis", lambda: None)


@pytest.fixture(autouse=True)
def _clean_state():
    from processing import query_engine

    query_engine._df_cache.clear()
    cache.clear()
    yield
    query_engine._df_cache.clear()
    cache.clear()


# ── DataFrames ───────────────────────────────────────────────────────────────────────


@pytest.fixture
def library():
    """The standard 33-play, 7-artist library described in factories.py."""
    return factories.library_df()


@pytest.fixture
def sessions_frame():
    return factories.session_df()


@pytest.fixture
def empty_frame():
    return factories.empty_df()


# ── Users, dashboards, clients ───────────────────────────────────────────────────────


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="owner", password="pw")


@pytest.fixture
def other_user(db):
    return get_user_model().objects.create_user(username="intruder", password="pw")


def _make_dashboard(owner, *, parquet_key: str = "parquet/u/1.parquet") -> ProcessedDashboard:
    upload = Upload.objects.create(
        user=owner,
        status=Upload.Status.COMPLETED,
        file_key=f"uploads/{owner.pk}/{uuid.uuid4()}/history.zip",
        original_filename="history.zip",
    )
    return ProcessedDashboard.objects.create(
        upload=upload,
        user=owner,
        parquet_key=parquet_key,
        total_hours=33.0,
        total_streams=33,
        unique_artists=7,
        unique_tracks=9,
    )


@pytest.fixture
def dashboard(user):
    return _make_dashboard(user)


@pytest.fixture
def other_dashboard(other_user):
    return _make_dashboard(other_user)


@pytest.fixture
def dashboard_without_parquet(user):
    return _make_dashboard(user, parquet_key="")


@pytest.fixture
def make_dashboard(db):
    """Factory for extra dashboards inside a single test."""
    return _make_dashboard


@pytest.fixture
def anon_client():
    return APIClient()


@pytest.fixture
def api(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


@pytest.fixture
def parquet(monkeypatch, library):
    """Make every view's `load_df` return the standard library, with no S3 involved.

    Returns a callable so a test can swap in a different frame:
    `parquet(some_other_df)`.
    """
    holder = {"df": library}

    def _load(parquet_key):
        return holder["df"]

    monkeypatch.setattr("processing.query_engine.load_dataframe", _load)

    def _set(df):
        holder["df"] = df
        return df

    return _set
