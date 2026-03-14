import json
from datetime import timedelta

from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.db.models import Count, Sum
from django.template.response import TemplateResponse
from django.urls import path
from django.utils import timezone
from django.utils.html import format_html

from processing.tasks import process_upload

from .models import GlobalBenchmark, Payment, ProcessedDashboard, Upload, UserProfile

User = get_user_model()


# ─── Upload ───────────────────────────────────────────────────────────────────


@admin.action(description="Retry failed uploads")
def retry_failed_uploads(modeladmin, request, queryset):
    failed = queryset.filter(status=Upload.Status.FAILED)
    for upload in failed:
        upload.status = Upload.Status.PENDING
        upload.error_message = ""
        upload.progress_pct = 0
        upload.save(update_fields=["status", "error_message", "progress_pct", "updated_at"])
        task = process_upload.delay(str(upload.id))
        upload.celery_task_id = task.id
        upload.save(update_fields=["celery_task_id"])


@admin.register(Upload)
class UploadAdmin(admin.ModelAdmin):
    list_display = ("user", "original_filename", "status", "file_size_mb", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("user__username", "original_filename")
    readonly_fields = ("id", "celery_task_id", "file_key", "created_at", "updated_at")
    actions = [retry_failed_uploads]

    @admin.display(description="Size (MB)")
    def file_size_mb(self, obj):
        return f"{obj.file_size_bytes / (1024 * 1024):.1f}"


# ─── Payment ──────────────────────────────────────────────────────────────────


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user", "amount_display", "status", "stripe_checkout_session_id", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("user__username", "stripe_checkout_session_id", "stripe_payment_intent_id")
    readonly_fields = (
        "id",
        "stripe_checkout_session_id",
        "stripe_payment_intent_id",
        "stripe_dashboard_link",
        "created_at",
        "updated_at",
    )

    @admin.display(description="Amount")
    def amount_display(self, obj):
        return f"${obj.amount_cents / 100:.2f}"

    @admin.display(description="Stripe Dashboard")
    def stripe_dashboard_link(self, obj):
        if obj.stripe_payment_intent_id:
            url = f"https://dashboard.stripe.com/payments/{obj.stripe_payment_intent_id}"
            return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', url, url)
        return "-"


# ─── ProcessedDashboard ──────────────────────────────────────────────────────


@admin.register(ProcessedDashboard)
class ProcessedDashboardAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "upload_filename",
        "total_hours",
        "total_streams",
        "is_public",
        "share_slug",
        "data_size",
        "created_at",
    )
    list_filter = ("is_public", "created_at")
    readonly_fields = ("id", "frontend_link", "created_at", "updated_at")

    @admin.display(description="Upload")
    def upload_filename(self, obj):
        return obj.upload.original_filename

    @admin.display(description="Data Size (KB)")
    def data_size(self, obj):
        size = len(json.dumps(obj.dashboard_data).encode())
        return f"{size / 1024:.1f}"

    @admin.display(description="Frontend Link")
    def frontend_link(self, obj):
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
        url = f"{frontend_url}/dashboard/{obj.id}"
        return format_html('<a href="{}" target="_blank" rel="noopener">{}</a>', url, url)


# ─── User (extended) ─────────────────────────────────────────────────────────


admin.site.unregister(User)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = BaseUserAdmin.list_display + (
        "uploads_count",
        "dashboards_count",
        "total_spent",
    )

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.annotate(
            _uploads_count=Count("uploads", distinct=True),
            _dashboards_count=Count("dashboards", distinct=True),
            _total_spent=Sum("payments__amount_cents"),
        )

    @admin.display(description="Uploads", ordering="_uploads_count")
    def uploads_count(self, obj):
        return obj._uploads_count

    @admin.display(description="Dashboards", ordering="_dashboards_count")
    def dashboards_count(self, obj):
        return obj._dashboards_count

    @admin.display(description="Total Spent", ordering="_total_spent")
    def total_spent(self, obj):
        cents = obj._total_spent or 0
        return f"${cents / 100:.2f}"


# ─── UserProfile ──────────────────────────────────────────────────────────────


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "display_name", "has_paid", "timezone", "created_at")
    list_filter = ("has_paid", "timezone")
    list_editable = ("has_paid",)
    search_fields = ("user__username", "display_name")


# ─── GlobalBenchmark ──────────────────────────────────────────────────────────


@admin.register(GlobalBenchmark)
class GlobalBenchmarkAdmin(admin.ModelAdmin):
    list_display = ("metric", "sample_size", "computed_at")
    search_fields = ("metric",)


# ─── Admin Metrics Dashboard ─────────────────────────────────────────────────


def metrics_dashboard_view(request):
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    thirty_days_ago = now - timedelta(days=30)

    completed_payments = Payment.objects.filter(status=Payment.Status.COMPLETED)
    total_revenue_cents = completed_payments.aggregate(s=Sum("amount_cents"))["s"] or 0
    today_revenue_cents = completed_payments.filter(
        created_at__gte=today_start
    ).aggregate(s=Sum("amount_cents"))["s"] or 0
    month_revenue_cents = completed_payments.filter(
        created_at__gte=month_start
    ).aggregate(s=Sum("amount_cents"))["s"] or 0

    total_uploads = Upload.objects.count()
    today_uploads = Upload.objects.filter(created_at__gte=today_start).count()
    completed_uploads = Upload.objects.filter(status=Upload.Status.COMPLETED).count()
    success_rate = (completed_uploads / total_uploads * 100) if total_uploads else 0

    active_users_30d = (
        Upload.objects.filter(created_at__gte=thirty_days_ago)
        .values("user")
        .distinct()
        .count()
    )
    total_users = User.objects.count()

    total_storage_bytes = Upload.objects.aggregate(s=Sum("file_size_bytes"))["s"] or 0

    context = {
        **admin.site.each_context(request),
        "title": "Metrics Dashboard",
        "total_revenue": f"${total_revenue_cents / 100:.2f}",
        "today_revenue": f"${today_revenue_cents / 100:.2f}",
        "month_revenue": f"${month_revenue_cents / 100:.2f}",
        "total_uploads": total_uploads,
        "today_uploads": today_uploads,
        "success_rate": f"{success_rate:.1f}%",
        "active_users_30d": active_users_30d,
        "total_users": total_users,
        "total_storage": f"{total_storage_bytes / (1024 * 1024 * 1024):.2f} GB",
    }
    return TemplateResponse(request, "admin/metrics_dashboard.html", context)


# Inject the metrics URL into the admin site
_original_get_urls = admin.AdminSite.get_urls


def _custom_get_urls(self):
    custom = [
        path("metrics/", self.admin_view(metrics_dashboard_view), name="metrics-dashboard"),
    ]
    return custom + _original_get_urls(self)


admin.AdminSite.get_urls = _custom_get_urls
