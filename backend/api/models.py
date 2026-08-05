import uuid

from django.conf import settings
from django.db import models


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    display_name = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default="UTC")
    max_uploads = models.PositiveIntegerField(default=5)
    has_paid = models.BooleanField(
        default=False, help_text="One-time payment unlocks unlimited uploads"
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.display_name or self.user.username


class Upload(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "Pending Payment"
        PENDING = "pending", "Pending"
        VALIDATING = "validating", "Validating"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="uploads"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    file_key = models.CharField(max_length=500, help_text="S3 object key")
    original_filename = models.CharField(max_length=255)
    file_size_bytes = models.BigIntegerField(default=0)
    progress_pct = models.IntegerField(default=0)
    celery_task_id = models.CharField(max_length=255, blank=True)
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.original_filename} ({self.status})"


class ProcessedDashboard(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload = models.OneToOneField(Upload, on_delete=models.CASCADE, related_name="dashboard")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="dashboards"
    )

    dashboard_data = models.JSONField(default=dict, help_text="Full aggregated stats blob")
    parquet_key = models.CharField(
        max_length=500, blank=True, default="", help_text="S3 key for cleaned Parquet data"
    )

    # Denormalized summary fields for list views
    total_hours = models.FloatField(default=0)
    total_streams = models.IntegerField(default=0)
    unique_artists = models.IntegerField(default=0)
    unique_tracks = models.IntegerField(default=0)
    date_range_start = models.DateField(null=True, blank=True)
    date_range_end = models.DateField(null=True, blank=True)

    # Public sharing
    is_public = models.BooleanField(default=False)
    share_slug = models.SlugField(max_length=50, unique=True, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Dashboard for {self.upload.original_filename}"


class MLInsight(models.Model):
    """Output of the ML suite (`processing/ml/`) for one dashboard.

    Computed off the upload pipeline by `compute_ml_insights`, on demand, because the
    models are CPU-heavy. `insights` holds the frozen JSON contract the frontend is typed
    against; it stays `{}` until a run succeeds.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    dashboard = models.OneToOneField(
        ProcessedDashboard, on_delete=models.CASCADE, related_name="ml_insight"
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    insights = models.JSONField(default=dict, help_text="Full ML insights payload")
    error_message = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"ML insights for {self.dashboard_id} ({self.status})"


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    upload = models.OneToOneField(
        Upload, on_delete=models.CASCADE, related_name="payment", null=True, blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments"
    )
    stripe_checkout_session_id = models.CharField(max_length=255, unique=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    receipt_url = models.URLField(blank=True, default="")
    amount_cents = models.IntegerField(default=500)
    currency = models.CharField(max_length=3, default="usd")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        # `upload` is nullable (it is cleared when an abandoned upload is reaped), so
        # this must not dereference it unconditionally — Django admin renders __str__.
        target = self.upload.original_filename if self.upload else "deleted upload"
        return f"Payment {self.status} for {target}"


class GlobalBenchmark(models.Model):
    metric = models.CharField(max_length=100, unique=True)
    percentiles = models.JSONField(default=dict, help_text="p10/p25/p50/p75/p90/p95/p99 values")
    sample_size = models.IntegerField(default=0)
    computed_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.metric} (n={self.sample_size})"
