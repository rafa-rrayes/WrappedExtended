"""The entity-library and period-comparison endpoints.

GET /api/v1/dashboards/<id>/entities/
GET /api/v1/dashboards/<id>/entities/detail/
GET /api/v1/dashboards/<id>/compare/
"""

import pytest
from django.urls import reverse
from rest_framework.throttling import SimpleRateThrottle

from api.views_dashboard_features import (
    ComparePeriodsView,
    EntityBrowseView,
    EntityDetailView,
)

from . import factories

pytestmark = pytest.mark.django_db

VALID_COMPARE = {
    "a_start": "2023-01-01",
    "a_end": "2023-01-10",
    "b_start": "2023-02-01",
    "b_end": "2023-02-07",
}


def browse_url(dashboard):
    return reverse("api:entity-browse", args=[dashboard.id])


def detail_url(dashboard):
    return reverse("api:entity-detail", args=[dashboard.id])


def compare_url(dashboard):
    return reverse("api:compare-periods", args=[dashboard.id])


# ── Auth and ownership ───────────────────────────────────────────────────────────────


@pytest.mark.parametrize("url_for", [browse_url, detail_url, compare_url])
def test_anonymous_requests_are_rejected(anon_client, dashboard, url_for):
    assert anon_client.get(url_for(dashboard)).status_code == 401


@pytest.mark.parametrize("url_for", [browse_url, detail_url, compare_url])
def test_another_users_dashboard_is_404_not_403(api, other_dashboard, parquet, url_for):
    """A 403 would confirm the dashboard exists. It must be indistinguishable from a
    dashboard id that was never issued."""
    response = api.get(url_for(other_dashboard), {"type": "artist", "name": "Alpha"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found."}


@pytest.mark.parametrize("url_for", [browse_url, detail_url, compare_url])
def test_unknown_dashboard_id_is_404(api, dashboard, parquet, url_for):
    url = url_for(dashboard).replace(str(dashboard.id), "00000000-0000-0000-0000-000000000000")
    assert api.get(url, {"type": "artist", "name": "Alpha"}).status_code == 404


def test_ownership_is_checked_before_the_query_parameters(api, other_dashboard, parquet):
    """An invalid `type` on someone else's dashboard must still be a plain 404."""
    assert api.get(browse_url(other_dashboard), {"type": "nonsense"}).status_code == 404


def test_dashboard_without_a_parquet_reports_it(api, dashboard_without_parquet, parquet):
    response = api.get(browse_url(dashboard_without_parquet), {"type": "artist"})
    assert response.status_code == 400
    assert "Re-upload" in response.json()["detail"]


# ── /entities/ ───────────────────────────────────────────────────────────────────────


def test_browse_returns_the_first_page_by_hours(api, dashboard, parquet):
    body = api.get(browse_url(dashboard), {"type": "artist"}).json()
    assert body["count"] == 7
    assert body["page"] == 1
    assert body["page_size"] == 50
    assert [r["name"] for r in body["results"]] == factories.LIBRARY_BY_HOURS_DESC


def test_browse_paginates(api, dashboard, parquet):
    body = api.get(browse_url(dashboard), {"type": "artist", "page": 2, "page_size": 3}).json()
    assert [r["rank"] for r in body["results"]] == [4, 5, 6]
    assert body["count"] == 7


def test_browse_search_and_sort_reach_the_engine(api, dashboard, parquet):
    body = api.get(
        browse_url(dashboard), {"type": "track", "q": "intro", "sort": "plays", "order": "desc"}
    ).json()
    assert [(r["name"], r["artist_name"], r["plays"]) for r in body["results"]] == [
        ("Intro", "Alpha", 4),
        ("Intro", "Gamma", 2),
    ]


def test_browse_date_range_uses_the_from_and_to_params(api, dashboard, parquet):
    """`from` is a Python keyword, so the serializer injects it in get_fields()."""
    body = api.get(
        browse_url(dashboard), {"type": "artist", "from": "2023-02-01", "to": "2023-03-31"}
    ).json()
    assert [r["name"] for r in body["results"]] == ["beta", "Gamma"]
    assert body["count"] == 2


def test_browse_requires_a_type(api, dashboard, parquet):
    response = api.get(browse_url(dashboard))
    assert response.status_code == 400
    assert "type" in response.json()


@pytest.mark.parametrize(
    "params",
    [
        {"type": "podcast"},
        {"type": "artist", "sort": "popularity"},
        {"type": "artist", "order": "sideways"},
        {"type": "artist", "page": 0},
        {"type": "artist", "page": "abc"},
        {"type": "artist", "page_size": 0},
        {"type": "artist", "page_size": 201},
        {"type": "artist", "from": "not-a-date"},
        {"type": "artist", "to": "2023-13-45"},
        {"type": "artist", "q": "x" * 201},
    ],
)
def test_browse_rejects_bad_parameters(api, dashboard, parquet, params):
    assert api.get(browse_url(dashboard), params).status_code == 400


def test_browse_rejects_a_range_that_ends_before_it_starts(api, dashboard, parquet):
    response = api.get(
        browse_url(dashboard), {"type": "artist", "from": "2023-06-01", "to": "2023-01-01"}
    )
    assert response.status_code == 400
    assert "to" in response.json()


def test_browse_accepts_the_page_size_bounds(api, dashboard, parquet):
    assert api.get(browse_url(dashboard), {"type": "artist", "page_size": 1}).status_code == 200
    assert api.get(browse_url(dashboard), {"type": "artist", "page_size": 200}).status_code == 200


def test_browse_blank_search_is_treated_as_no_search(api, dashboard, parquet):
    body = api.get(browse_url(dashboard), {"type": "artist", "q": "   "}).json()
    assert body["count"] == 7


# ── /entities/detail/ ────────────────────────────────────────────────────────────────


def test_detail_returns_the_micro_dashboard(api, dashboard, parquet):
    body = api.get(detail_url(dashboard), {"type": "artist", "name": "Alpha"}).json()
    assert body["name"] == "Alpha"
    assert body["total_plays"] == 10
    assert body["rank"] == 1
    assert len(body["weekday_distribution"]) == 7
    assert body["albums"][0]["album_name"] == "Alpha LP"


def test_detail_of_an_unknown_entity_is_404(api, dashboard, parquet):
    response = api.get(detail_url(dashboard), {"type": "artist", "name": "Nobody"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Entity not found."}


def test_detail_passes_the_date_range_through(api, dashboard, parquet):
    body = api.get(
        detail_url(dashboard),
        {"type": "artist", "name": "Alpha", "from": "2023-01-03", "to": "2023-01-06"},
    ).json()
    assert body["total_plays"] == 4
    assert body["first_listen"] == "2023-01-03"


def test_detail_handles_names_needing_url_encoding(api, dashboard, parquet):
    for name in ("AC/DC", "Zeta (feat. X)", "Épsilon"):
        body = api.get(detail_url(dashboard), {"type": "artist", "name": name}).json()
        assert body["name"] == name


@pytest.mark.parametrize(
    "params",
    [
        {},
        {"type": "artist"},
        {"name": "Alpha"},
        {"type": "genre", "name": "Alpha"},
        {"type": "artist", "name": ""},
        {"type": "artist", "name": "x" * 501},
        {"type": "artist", "name": "Alpha", "from": "yesterday"},
    ],
)
def test_detail_rejects_bad_parameters(api, dashboard, parquet, params):
    assert api.get(detail_url(dashboard), params).status_code == 400


# ── /compare/ ────────────────────────────────────────────────────────────────────────


def test_compare_returns_both_periods_and_deltas(api, dashboard, parquet):
    body = api.get(compare_url(dashboard), VALID_COMPARE).json()
    assert set(body) == {"period_a", "period_b", "deltas"}
    assert body["period_a"]["stats"]["total_streams"] == 10
    assert body["period_b"]["stats"]["total_streams"] == 7
    assert body["deltas"]["total_hours"]["pct"] == -30.0


def test_compare_emits_null_pct_as_json_null(api, dashboard, parquet):
    body = api.get(
        compare_url(dashboard),
        {**VALID_COMPARE, "a_start": "2020-01-01", "a_end": "2020-12-31"},
    ).json()
    assert body["deltas"]["total_hours"]["pct"] is None


@pytest.mark.parametrize(
    "override",
    [
        {"a_start": ""},
        {"a_end": "not-a-date"},
        {"b_start": "2023-99-01"},
        {"a_end": "2022-01-01"},  # ends before a_start
        {"b_end": "2022-01-01"},  # ends before b_start
    ],
)
def test_compare_rejects_bad_ranges(api, dashboard, parquet, override):
    response = api.get(compare_url(dashboard), {**VALID_COMPARE, **override})
    assert response.status_code == 400


def test_compare_requires_all_four_dates(api, dashboard, parquet):
    response = api.get(compare_url(dashboard), {"a_start": "2023-01-01", "a_end": "2023-01-10"})
    assert response.status_code == 400
    assert {"b_start", "b_end"} <= set(response.json())


# ── Throttling ───────────────────────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "view", [EntityBrowseView, EntityDetailView, ComparePeriodsView], ids=lambda v: v.__name__
)
def test_parquet_backed_views_share_the_dashboard_query_scope(view):
    assert view.throttle_scope == "dashboard_query"
    assert "ScopedRateThrottle" in [c.__name__ for c in view.throttle_classes]


def test_dashboard_query_throttle_returns_429_past_the_limit(api, dashboard, parquet, monkeypatch):
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "dashboard_query", "2/minute")

    url, params = browse_url(dashboard), {"type": "artist"}
    assert api.get(url, params).status_code == 200
    assert api.get(url, params).status_code == 200

    throttled = api.get(url, params)
    assert throttled.status_code == 429
    assert "Retry-After" in throttled.headers


def test_the_throttle_bucket_is_shared_across_the_parquet_views(
    api, dashboard, parquet, monkeypatch
):
    """Two requests to /entities/ must exhaust the budget for /compare/ as well."""
    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "dashboard_query", "2/minute")

    api.get(browse_url(dashboard), {"type": "artist"})
    api.get(detail_url(dashboard), {"type": "artist", "name": "Alpha"})
    assert api.get(compare_url(dashboard), VALID_COMPARE).status_code == 429


def test_the_throttle_is_per_user(api, dashboard, parquet, monkeypatch, other_user):
    from rest_framework.test import APIClient

    monkeypatch.setitem(SimpleRateThrottle.THROTTLE_RATES, "dashboard_query", "1/minute")
    assert api.get(browse_url(dashboard), {"type": "artist"}).status_code == 200
    assert api.get(browse_url(dashboard), {"type": "artist"}).status_code == 429

    other = APIClient()
    other.force_authenticate(user=other_user)
    # Different user, own budget — 404 because the dashboard is not theirs, not 429.
    assert other.get(browse_url(dashboard), {"type": "artist"}).status_code == 404
