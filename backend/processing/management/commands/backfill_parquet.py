"""Management command to backfill Parquet files for existing dashboards."""

import logging

from django.core.management.base import BaseCommand

from api.models import ProcessedDashboard
from processing.stages.clean import clean
from processing.stages.ingest import ingest
from processing.stages.persist import persist_parquet

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Backfill Parquet files for dashboards that lack them"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit", type=int, default=0, help="Max dashboards to backfill (0=all)"
        )
        parser.add_argument(
            "--dry-run", action="store_true", help="Preview without writing"
        )

    def handle(self, *args, **options):
        qs = ProcessedDashboard.objects.filter(parquet_key="").select_related("upload")
        if options["limit"]:
            qs = qs[: options["limit"]]

        total = qs.count()
        self.stdout.write(f"Found {total} dashboards without Parquet files")

        success = 0
        for dash in qs:
            upload = dash.upload
            self.stdout.write(f"  Processing {dash.id} (upload: {upload.file_key})...")

            if options["dry_run"]:
                continue

            try:
                lf = ingest(upload.file_key)
                lf = clean(lf)
                df = lf.collect()
                key = persist_parquet(df, upload.user_id, str(upload.id))
                dash.parquet_key = key
                dash.save(update_fields=["parquet_key", "updated_at"])
                success += 1
                self.stdout.write(self.style.SUCCESS(f"    → {key}"))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"    FAILED: {e}"))

        self.stdout.write(self.style.SUCCESS(f"Backfilled {success}/{total} dashboards"))
