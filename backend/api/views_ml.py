"""Views for the ML insights feature (`processing/ml/`).

Two endpoints, both scoped to the requesting user's own dashboards:

    GET  /api/v1/dashboards/<id>/ml/          → poll the current state
    POST /api/v1/dashboards/<id>/ml/compute/  → enqueue a run

The GET deliberately never 404s for a dashboard that has simply never had a run — the
frontend polls it, and a missing run is the normal starting state (`"unavailable"`).
"""

import logging
from datetime import timedelta

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import MLInsight
from .views_dashboard_features import DashboardFeatureMixin

logger = logging.getLogger(__name__)

# A run whose row has sat in `pending` for longer than the task's hard time limit
# (31 min) is orphaned — a worker died mid-run — so a new request may re-enqueue it.
STALE_PENDING_AFTER = timedelta(minutes=40)


def _get_insight(dashboard) -> MLInsight | None:
    try:
        return dashboard.ml_insight
    except MLInsight.DoesNotExist:
        return None


class MLInsightsView(DashboardFeatureMixin, APIView):
    """Current ML insights for a dashboard, or the state of its pending/failed run."""

    def get(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        insight = _get_insight(dashboard)
        if insight is None:
            return Response({"status": "unavailable", "insights": None})

        # A payload from an earlier successful run is kept visible while a re-run is
        # pending (and even if that re-run fails) rather than blanking the dashboard.
        payload = {"status": insight.status, "insights": insight.insights or None}
        if insight.status == MLInsight.Status.FAILED:
            payload["error_message"] = insight.error_message
        return Response(payload)


class MLInsightsComputeView(DashboardFeatureMixin, APIView):
    """Enqueue an ML run. Never queues a second one on top of an in-flight run.

    The one feature endpoint with a side effect, so unlike its siblings it is the owner's
    alone: a public dashboard can be *read* by anyone, but only its owner burns a worker.
    """

    permission_classes = (permissions.IsAuthenticated,)
    public_readable = False

    def post(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if not dashboard.parquet_key:
            return self.parquet_unavailable()

        insight = _get_insight(dashboard)
        if insight is not None and insight.status == MLInsight.Status.PENDING:
            fresh = timezone.now() - insight.updated_at < STALE_PENDING_AFTER
            if fresh:
                return Response({"status": MLInsight.Status.PENDING.value})
            logger.warning(
                "Re-enqueuing stale pending ML run for dashboard %s (last update %s)",
                dashboard.id,
                insight.updated_at,
            )

        if insight is None:
            MLInsight.objects.create(dashboard=dashboard)
        else:
            MLInsight.objects.filter(pk=insight.pk).update(
                status=MLInsight.Status.PENDING, error_message=""
            )

        from processing.tasks import compute_ml_insights

        compute_ml_insights.delay(str(dashboard.id))
        logger.info("Queued ML insights for dashboard %s", dashboard.id)
        return Response(
            {"status": MLInsight.Status.PENDING.value}, status=status.HTTP_202_ACCEPTED
        )
