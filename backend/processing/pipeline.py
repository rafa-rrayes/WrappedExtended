"""Processing pipeline orchestrator.

Runs the 5-stage pipeline: ingest → clean → persist → aggregate → export.
"""

import logging

from api.models import Upload

from .stages.aggregate import aggregate
from .stages.clean import clean
from .stages.export import export
from .stages.ingest import ingest
from .stages.persist import persist_parquet

logger = logging.getLogger(__name__)


def _update_progress(upload: Upload, status: str, pct: int):
    upload.status = status
    upload.progress_pct = pct
    upload.save(update_fields=["status", "progress_pct", "updated_at"])


def run_pipeline(upload_id: str, task=None) -> str:
    """Execute the full processing pipeline. Returns the dashboard ID."""
    upload = Upload.objects.get(id=upload_id)

    # Stage 1: Ingest
    _update_progress(upload, Upload.Status.VALIDATING, 10)
    lf = ingest(upload.file_key)
    _update_progress(upload, Upload.Status.PROCESSING, 20)

    # Stage 2: Clean
    lf = clean(lf)
    df = lf.collect()
    _update_progress(upload, Upload.Status.PROCESSING, 35)

    # Stage 3: Persist cleaned data as Parquet
    parquet_key = persist_parquet(df, upload.user_id, str(upload.id))
    _update_progress(upload, Upload.Status.PROCESSING, 50)

    # Stage 4: Aggregate
    stats = aggregate(df)
    _update_progress(upload, Upload.Status.PROCESSING, 75)

    # Stage 5: Export
    dashboard = export(upload, stats, parquet_key=parquet_key)
    _update_progress(upload, Upload.Status.COMPLETED, 100)

    logger.info("Pipeline completed for upload %s → dashboard %s", upload_id, dashboard.id)
    return str(dashboard.id)
