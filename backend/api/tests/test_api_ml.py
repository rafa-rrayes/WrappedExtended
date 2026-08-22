"""The ML insights endpoints.

GET  /api/v1/dashboards/<id>/ml/          poll — never 404s for "no run yet"
POST /api/v1/dashboards/<id>/ml/compute/  enqueue — never double-queues
"""

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from api.models import MLInsight

pytestmark = pytest.mark.django_db

SAMPLE_INSIGHTS = {"summary": {"rows": 10}, "clustering": {"n_sessions": 3, "modes": []}}


def ml_url(dashboard):
    return reverse("api:ml-insights", args=[dashboard.id])


def compute_url(dashboard):
    return reverse("api:ml-insights-compute", args=[dashboard.id])


@pytest.fixture
def enqueued(monkeypatch):
    """Capture `compute_ml_insights.delay` calls instead of touching a broker."""
    from processing import tasks

    calls = []
    monkeypatch.setattr(tasks.compute_ml_insights, "delay", lambda *a, **kw: calls.append(a))
    return calls


def _age(insight, delta):
    """Backdate `updated_at`; QuerySet.update bypasses the auto_now field."""
    MLInsight.objects.filter(pk=insight.pk).update(updated_at=timezone.now() - delta)


# ── Auth and ownership ───────────────────────────────────────────────────────────────


def test_anonymous_get_on_a_private_dashboard_is_404(anon_client, dashboard):
    """The read side follows the other feature views: private looks nonexistent, public
    (test_api_public_access.py) is readable without a token."""
    assert anon_client.get(ml_url(dashboard)).status_code == 404


def test_anonymous_compute_is_rejected(anon_client, dashboard):
    """Compute keeps `IsAuthenticated`: it is the one feature endpoint with a side effect."""
    assert anon_client.post(compute_url(dashboard)).status_code == 401


def test_get_on_another_users_dashboard_is_404(api, other_dashboard):
    response = api.get(ml_url(other_dashboard))
    assert response.status_code == 404
    assert response.json() == {"detail": "Not found."}


def test_compute_on_another_users_dashboard_is_404_and_enqueues_nothing(
    api, other_dashboard, enqueued
):
    assert api.post(compute_url(other_dashboard)).status_code == 404
    assert enqueued == []


def test_compute_does_not_reveal_another_users_pending_run(api, other_dashboard, enqueued):
    MLInsight.objects.create(dashboard=other_dashboard, status=MLInsight.Status.READY)
    assert api.post(compute_url(other_dashboard)).status_code == 404


# ── GET /ml/ ─────────────────────────────────────────────────────────────────────────


def test_get_without_a_run_is_unavailable_not_404(api, dashboard):
    """The frontend polls this endpoint; a missing run is the normal starting state."""
    response = api.get(ml_url(dashboard))
    assert response.status_code == 200
    assert response.json() == {"status": "unavailable", "insights": None}


def test_get_reports_a_pending_run(api, dashboard):
    MLInsight.objects.create(dashboard=dashboard)
    body = api.get(ml_url(dashboard)).json()
    assert body["status"] == "pending"
    assert body["insights"] is None


def test_get_returns_a_ready_payload(api, dashboard):
    MLInsight.objects.create(
        dashboard=dashboard, status=MLInsight.Status.READY, insights=SAMPLE_INSIGHTS
    )
    body = api.get(ml_url(dashboard)).json()
    assert body == {"status": "ready", "insights": SAMPLE_INSIGHTS}


def test_get_includes_the_error_message_for_a_failed_run(api, dashboard):
    MLInsight.objects.create(
        dashboard=dashboard, status=MLInsight.Status.FAILED, error_message="ran out of memory"
    )
    body = api.get(ml_url(dashboard)).json()
    assert body["status"] == "failed"
    assert body["error_message"] == "ran out of memory"
    assert body["insights"] is None


def test_a_previous_payload_stays_visible_while_a_rerun_is_pending(api, dashboard):
    MLInsight.objects.create(
        dashboard=dashboard, status=MLInsight.Status.PENDING, insights=SAMPLE_INSIGHTS
    )
    body = api.get(ml_url(dashboard)).json()
    assert body["status"] == "pending"
    assert body["insights"] == SAMPLE_INSIGHTS


def test_an_empty_insights_blob_is_reported_as_null(api, dashboard):
    MLInsight.objects.create(dashboard=dashboard, status=MLInsight.Status.READY, insights={})
    assert api.get(ml_url(dashboard)).json()["insights"] is None


# ── POST /ml/compute/ ────────────────────────────────────────────────────────────────


def test_compute_creates_a_pending_run_and_enqueues_it(api, dashboard, enqueued):
    response = api.post(compute_url(dashboard))
    assert response.status_code == 202
    assert response.json() == {"status": "pending"}
    assert enqueued == [(str(dashboard.id),)]
    assert MLInsight.objects.get(dashboard=dashboard).status == MLInsight.Status.PENDING


def test_compute_does_not_enqueue_a_duplicate_while_a_run_is_pending(api, dashboard, enqueued):
    first = api.post(compute_url(dashboard))
    assert first.status_code == 202

    second = api.post(compute_url(dashboard))
    assert second.status_code == 200
    assert second.json() == {"status": "pending"}
    assert len(enqueued) == 1
    assert MLInsight.objects.filter(dashboard=dashboard).count() == 1


def test_compute_reruns_a_finished_run(api, dashboard, enqueued):
    insight = MLInsight.objects.create(
        dashboard=dashboard, status=MLInsight.Status.READY, insights=SAMPLE_INSIGHTS
    )
    assert api.post(compute_url(dashboard)).status_code == 202
    insight.refresh_from_db()
    assert insight.status == MLInsight.Status.PENDING
    assert insight.insights == SAMPLE_INSIGHTS  # the old payload is kept for the UI
    assert len(enqueued) == 1


def test_compute_clears_the_previous_error_message(api, dashboard, enqueued):
    insight = MLInsight.objects.create(
        dashboard=dashboard, status=MLInsight.Status.FAILED, error_message="boom"
    )
    api.post(compute_url(dashboard))
    insight.refresh_from_db()
    assert insight.status == MLInsight.Status.PENDING
    assert insight.error_message == ""


def test_compute_re_enqueues_a_run_orphaned_by_a_dead_worker(api, dashboard, enqueued):
    insight = MLInsight.objects.create(dashboard=dashboard)
    _age(insight, timedelta(minutes=41))
    assert api.post(compute_url(dashboard)).status_code == 202
    assert len(enqueued) == 1


def test_compute_leaves_a_recent_pending_run_alone(api, dashboard, enqueued):
    insight = MLInsight.objects.create(dashboard=dashboard)
    _age(insight, timedelta(minutes=39))
    assert api.post(compute_url(dashboard)).status_code == 200
    assert enqueued == []


def test_compute_requires_a_parquet(api, dashboard_without_parquet, enqueued):
    response = api.post(compute_url(dashboard_without_parquet))
    assert response.status_code == 400
    assert "Re-upload" in response.json()["detail"]
    assert enqueued == []
    assert not MLInsight.objects.exists()


def test_compute_rejects_a_get(api, dashboard, enqueued):
    assert api.get(compute_url(dashboard)).status_code == 405
