"""Who may call the per-dashboard feature endpoints.

A dashboard whose owner switched on public sharing (`is_public=True`) is readable through
every feature endpoint by anyone — that is what lets `/shared/{slug}` and `/demo` render
the full interactive app. A private dashboard is a 404 to everyone but its owner, and the
one endpoint with a side effect (`ml/compute/`) stays the owner's regardless.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import SimpleRateThrottle

from api.models import MLInsight

pytestmark = pytest.mark.django_db

# Every read endpoint with a request that succeeds against the standard library.
# (method, url name, query/body)
READ_ENDPOINTS = [
    ("post", "time-machine", {"start": "2023-01-01", "end": "2023-01-10"}),
    ("get", "search-suggest", {"q": "al"}),
    ("get", "search-entity", {"q": "Alpha", "type": "artist"}),
    ("post", "chart-builder", {"metric": "hours", "group_by": "artist_name", "limit": 5}),
    ("post", "what-if", {"exclude_artists": ["Alpha"]}),
    ("get", "benchmarks", {}),
    ("get", "journey", {"year": 2023}),
    ("get", "entity-browse", {"type": "artist"}),
    ("get", "entity-detail", {"type": "artist", "name": "Alpha"}),
    (
        "get",
        "compare-periods",
        {
            "a_start": "2023-01-01",
            "a_end": "2023-01-10",
            "b_start": "2023-02-01",
            "b_end": "2023-02-07",
        },
    ),
    ("get", "ml-insights", {}),
]
READ_IDS = [name for _, name, _ in READ_ENDPOINTS]


def call(client, method, name, dashboard, params):
    url = reverse(f"api:{name}", args=[dashboard.id])
    if method == "get":
        return client.get(url, params)
    return client.post(url, params, format="json")


@pytest.fixture
def public_dashboard(other_dashboard):
    """Someone else's dashboard, shared publicly."""
    other_dashboard.is_public = True
    other_dashboard.share_slug = "demo"
    other_dashboard.save(update_fields=["is_public", "share_slug"])
    return other_dashboard


@pytest.fixture
def stranger(other_user):
    """An authenticated user who owns none of the dashboards under test."""
    client = APIClient()
    client.force_authenticate(user=other_user)
    return client


# ── Public dashboards are readable by anyone ─────────────────────────────────────────


@pytest.mark.parametrize(("method", "name", "params"), READ_ENDPOINTS, ids=READ_IDS)
def test_anonymous_can_read_a_public_dashboard(
    anon_client, public_dashboard, parquet, method, name, params
):
    response = call(anon_client, method, name, public_dashboard, params)
    assert response.status_code == 200, response.content


@pytest.mark.parametrize(("method", "name", "params"), READ_ENDPOINTS, ids=READ_IDS)
def test_a_signed_in_non_owner_can_read_a_public_dashboard(
    api, public_dashboard, parquet, method, name, params
):
    # `api` is authenticated as `user`; `public_dashboard` belongs to `other_user`.
    response = call(api, method, name, public_dashboard, params)
    assert response.status_code == 200, response.content


def test_public_reads_return_the_same_data_the_owner_sees(
    anon_client, stranger, public_dashboard, parquet
):
    params = {"type": "artist", "name": "Alpha"}
    anon = call(anon_client, "get", "entity-detail", public_dashboard, params).json()
    owner = call(stranger, "get", "entity-detail", public_dashboard, params).json()
    assert anon == owner
    assert anon["total_plays"] == 10


# ── Private dashboards are a 404 to everyone else ────────────────────────────────────


@pytest.mark.parametrize(("method", "name", "params"), READ_ENDPOINTS, ids=READ_IDS)
def test_anonymous_on_a_private_dashboard_is_404(
    anon_client, other_dashboard, parquet, method, name, params
):
    """Not 401 — a stranger must not be able to tell a private dashboard from a
    nonexistent one, and a 401 would say "there is something here"."""
    response = call(anon_client, method, name, other_dashboard, params)
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found."}


def test_switching_sharing_off_revokes_access_immediately(anon_client, public_dashboard, parquet):
    params = {"type": "artist"}
    assert call(anon_client, "get", "entity-browse", public_dashboard, params).status_code == 200

    public_dashboard.is_public = False
    public_dashboard.save(update_fields=["is_public"])
    assert call(anon_client, "get", "entity-browse", public_dashboard, params).status_code == 404


def test_the_owner_still_reads_their_own_private_dashboard(api, dashboard, parquet):
    assert call(api, "get", "entity-browse", dashboard, {"type": "artist"}).status_code == 200


# ── Compute stays the owner's alone ──────────────────────────────────────────────────


@pytest.fixture
def enqueued(monkeypatch):
    from processing import tasks

    calls = []
    monkeypatch.setattr(tasks.compute_ml_insights, "delay", lambda *a, **kw: calls.append(a))
    return calls


def test_anonymous_cannot_compute_on_a_public_dashboard(anon_client, public_dashboard, enqueued):
    url = reverse("api:ml-insights-compute", args=[public_dashboard.id])
    assert anon_client.post(url).status_code == 401
    assert enqueued == []
    assert not MLInsight.objects.exists()


def test_a_non_owner_cannot_compute_on_a_public_dashboard(api, public_dashboard, enqueued):
    """Read access to a public dashboard does not extend to burning a worker on it."""
    url = reverse("api:ml-insights-compute", args=[public_dashboard.id])
    assert api.post(url).status_code == 404
    assert enqueued == []
    assert not MLInsight.objects.exists()


def test_the_owner_computes_on_their_own_public_dashboard(stranger, public_dashboard, enqueued):
    url = reverse("api:ml-insights-compute", args=[public_dashboard.id])
    assert stranger.post(url).status_code == 202
    assert len(enqueued) == 1


# ── Anonymous readers are throttled too ──────────────────────────────────────────────


def test_anonymous_parquet_reads_are_throttled(
    anon_client, public_dashboard, parquet, monkeypatch
):
    """With no user to key on, the `dashboard_query` bucket falls back to the client IP."""
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "dashboard_query", "2/minute")
    params = {"type": "artist"}
    assert call(anon_client, "get", "entity-browse", public_dashboard, params).status_code == 200
    assert call(anon_client, "get", "entity-browse", public_dashboard, params).status_code == 200
    assert call(anon_client, "get", "entity-browse", public_dashboard, params).status_code == 429
