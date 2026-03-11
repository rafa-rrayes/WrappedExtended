"""Stage 5: Export — Save aggregated results to ProcessedDashboard."""

import logging

from api.models import ProcessedDashboard, Upload

logger = logging.getLogger(__name__)


def export(upload: Upload, stats: dict, parquet_key: str = "") -> ProcessedDashboard:
    """Create a ProcessedDashboard record with the aggregated stats."""
    logger.info("Exporting results for upload %s", upload.id)

    dashboard = ProcessedDashboard.objects.create(
        upload=upload,
        user=upload.user,
        dashboard_data=stats,
        parquet_key=parquet_key or "",
        total_hours=stats.get("total_hours", 0),
        total_streams=stats.get("total_streams", 0),
        unique_artists=stats.get("unique_artists", 0),
        unique_tracks=stats.get("unique_tracks", 0),
        date_range_start=stats.get("date_range_start"),
        date_range_end=stats.get("date_range_end"),
    )

    logger.info("Dashboard %s created for upload %s", dashboard.id, upload.id)
    return dashboard
