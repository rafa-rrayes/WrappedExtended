import logging

from celery import shared_task

from .pipeline import run_pipeline

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def process_upload(self, upload_id: str) -> dict:
    """Main Celery task: processes an uploaded Spotify history file."""
    logger.info("Starting processing for upload %s", upload_id)
    try:
        result = run_pipeline(upload_id, task=self)
        return {"status": "completed", "upload_id": upload_id, "dashboard_id": result}
    except Exception as exc:
        logger.exception("Processing failed for upload %s", upload_id)
        # Update upload status to failed
        from api.models import Upload

        Upload.objects.filter(id=upload_id).update(
            status=Upload.Status.FAILED,
            error_message=str(exc)[:1000],
        )
        raise self.retry(exc=exc) from exc


@shared_task
def compute_global_benchmarks():
    """Compute cross-user percentile benchmarks for social comparison."""
    import numpy as np

    from api.models import GlobalBenchmark, ProcessedDashboard

    dashboards = ProcessedDashboard.objects.values(
        "total_hours", "total_streams", "unique_artists", "unique_tracks"
    )
    if not dashboards:
        return

    metrics = {
        "total_hours": [],
        "total_streams": [],
        "unique_artists": [],
        "unique_tracks": [],
    }
    for d in dashboards:
        for key in metrics:
            metrics[key].append(d[key])

    percentile_keys = [10, 25, 50, 75, 90, 95, 99]
    for metric, values in metrics.items():
        if not values:
            continue
        arr = np.array(values)
        pcts = {f"p{p}": round(float(np.percentile(arr, p)), 2) for p in percentile_keys}
        GlobalBenchmark.objects.update_or_create(
            metric=metric,
            defaults={"percentiles": pcts, "sample_size": len(values)},
        )

    logger.info("Updated global benchmarks from %d dashboards", len(dashboards))
