import logging

from celery import shared_task

from .pipeline import run_pipeline

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    # Bound the work so one pathological export cannot pin a worker forever.
    soft_time_limit=900,
    time_limit=960,
    # Requeue if the worker dies mid-task rather than silently losing the upload.
    acks_late=True,
)
def process_upload(self, upload_id: str) -> dict:
    """Main Celery task: processes an uploaded Spotify history file."""
    logger.info("Starting processing for upload %s", upload_id)
    from api.models import Upload

    try:
        result = run_pipeline(upload_id, task=self)
        return {"status": "completed", "upload_id": upload_id, "dashboard_id": result}
    except ValueError as exc:
        # A malformed or non-Spotify export. Deterministic — retrying cannot help,
        # so fail immediately with a message the user can act on.
        logger.warning("Rejected upload %s: %s", upload_id, exc)
        Upload.objects.filter(id=upload_id).update(
            status=Upload.Status.FAILED,
            error_message=str(exc)[:1000],
        )
        return {"status": "failed", "upload_id": upload_id, "error": str(exc)[:1000]}
    except Exception as exc:
        logger.exception("Processing failed for upload %s", upload_id)
        if self.request.retries >= self.max_retries:
            # Final attempt — leave the row in a terminal state with the reason.
            Upload.objects.filter(id=upload_id).update(
                status=Upload.Status.FAILED,
                error_message=str(exc)[:1000],
            )
            raise
        # Transient (S3 blip, DB hiccup). Keep it visibly processing while we retry.
        raise self.retry(exc=exc) from exc


@shared_task(
    # ML is CPU-bound (SVD, KMeans, gradient boosting, t-SNE) and deliberately runs off
    # the upload pipeline, so it gets a longer leash than process_upload.
    soft_time_limit=1800,
    time_limit=1860,
    # No retry: a rerun costs minutes of CPU, and every failure mode worth retrying
    # (missing Parquet, degenerate history) is deterministic. The row records why.
    max_retries=0,
)
def compute_ml_insights(dashboard_id: str) -> dict:
    """Run the ML suite for one dashboard and store the payload on its MLInsight row.

    Idempotent: re-running recomputes from the same Parquet and overwrites the row.
    """
    import traceback

    from api.models import MLInsight, ProcessedDashboard

    logger.info("Computing ML insights for dashboard %s", dashboard_id)

    try:
        dashboard = ProcessedDashboard.objects.get(id=dashboard_id)
    except ProcessedDashboard.DoesNotExist:
        logger.warning("ML insights requested for missing dashboard %s", dashboard_id)
        return {"status": "failed", "dashboard_id": dashboard_id, "error": "dashboard not found"}

    insight, _ = MLInsight.objects.get_or_create(dashboard=dashboard)

    def _fail(message: str) -> dict:
        MLInsight.objects.filter(pk=insight.pk).update(
            status=MLInsight.Status.FAILED,
            error_message=message[:4000],
        )
        return {"status": "failed", "dashboard_id": dashboard_id, "error": message[:500]}

    if not dashboard.parquet_key:
        logger.warning("Dashboard %s has no Parquet — cannot compute ML insights", dashboard_id)
        return _fail("Parquet data not available for this dashboard. Re-upload to enable ML.")

    MLInsight.objects.filter(pk=insight.pk).update(
        status=MLInsight.Status.PENDING, error_message=""
    )

    try:
        from processing.ml import run_ml_insights
        from processing.query_engine import load_dataframe

        df = load_dataframe(dashboard.parquet_key)
        insights = run_ml_insights(df)
    except Exception:
        logger.exception("ML insights failed for dashboard %s", dashboard_id)
        return _fail(traceback.format_exc())

    MLInsight.objects.filter(pk=insight.pk).update(
        status=MLInsight.Status.READY,
        insights=insights,
        error_message="",
    )
    logger.info("ML insights ready for dashboard %s", dashboard_id)
    return {"status": "ready", "dashboard_id": dashboard_id}


@shared_task
def compute_global_benchmarks():
    """Compute cross-user percentile benchmarks for social comparison.

    Scheduled by CELERY_BEAT_SCHEDULE; until this runs at least once the
    GlobalBenchmark table is empty and BenchmarksView falls back to static values.
    """
    from statistics import quantiles

    from api.models import GlobalBenchmark, ProcessedDashboard

    rows = list(
        ProcessedDashboard.objects.values(
            "total_hours", "total_streams", "unique_artists", "unique_tracks"
        )
    )
    if not rows:
        logger.info("No dashboards yet — skipping benchmark computation")
        return

    metric_names = ("total_hours", "total_streams", "unique_artists", "unique_tracks")
    percentile_keys = [10, 25, 50, 75, 90, 95, 99]

    for metric in metric_names:
        values = sorted(row[metric] for row in rows if row[metric] is not None)
        if not values:
            continue
        if len(values) == 1:
            pcts = {f"p{p}": round(float(values[0]), 2) for p in percentile_keys}
        else:
            # quantiles(n=100) returns the 99 cut points p1..p99; index p-1 selects pN.
            cuts = quantiles(values, n=100, method="inclusive")
            pcts = {f"p{p}": round(float(cuts[p - 1]), 2) for p in percentile_keys}
        GlobalBenchmark.objects.update_or_create(
            metric=metric,
            defaults={"percentiles": pcts, "sample_size": len(values)},
        )

    logger.info("Updated global benchmarks from %d dashboards", len(rows))
