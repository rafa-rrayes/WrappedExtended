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
        raise self.retry(exc=exc)
