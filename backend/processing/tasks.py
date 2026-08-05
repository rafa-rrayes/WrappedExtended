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
