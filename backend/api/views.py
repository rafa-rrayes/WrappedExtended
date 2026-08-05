import uuid
from datetime import timedelta

import stripe
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.db.models import Avg, Count, Q, Sum
from django.db.models.functions import TruncDate, TruncWeek
from django.http import HttpResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from processing.tasks import process_upload
from storage.client import delete_file_from_s3, upload_file_to_s3

from .models import Payment, ProcessedDashboard, Upload, UserProfile
from .serializers import (
    ChangePasswordSerializer,
    DashboardDetailSerializer,
    DashboardSummarySerializer,
    LogoutSerializer,
    PaymentSerializer,
    RegisterSerializer,
    UploadSerializer,
    UploadStatusSerializer,
    UserProfileSerializer,
)

stripe.api_key = django_settings.STRIPE_SECRET_KEY

User = get_user_model()


def get_or_create_stripe_customer(user):
    # get_or_create, not get: a profile row is not guaranteed for users created
    # outside RegisterSerializer (superusers, admin, fixtures).
    profile, _ = UserProfile.objects.get_or_create(user=user)
    if profile.stripe_customer_id:
        return profile.stripe_customer_id
    customer = stripe.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
    profile.stripe_customer_id = customer.id
    profile.save(update_fields=["stripe_customer_id"])
    return customer.id


# ─── Auth ──────────────────────────────────────────────────────────────────────


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"detail": "Account created."}, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer

    def get_object(self):
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile


class LogoutView(generics.GenericAPIView):
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(status=status.HTTP_205_RESET_CONTENT)


class ChangePasswordView(generics.GenericAPIView):
    serializer_class = ChangePasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": ["Wrong password."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"detail": "Password updated."})


# ─── Uploads ───────────────────────────────────────────────────────────────────


class UploadCreateView(generics.CreateAPIView):
    serializer_class = UploadSerializer
    parser_classes = (MultiPartParser,)

    def create(self, request, *args, **kwargs):
        file = request.FILES.get("file")
        if not file:
            return Response({"detail": "No file provided."}, status=status.HTTP_400_BAD_REQUEST)

        if not file.name.endswith(".zip"):
            return Response(
                {"detail": "Please upload the .zip file from your Spotify data export."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Enforce the size cap *before* writing to S3, so an oversized (or hostile)
        # upload cannot consume storage. Unauthenticated-adjacent cost control.
        max_bytes = django_settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
        if file.size > max_bytes:
            return Response(
                {
                    "detail": (
                        f"File is too large ({file.size / 1024 / 1024:.0f} MB). "
                        f"The limit is {django_settings.MAX_UPLOAD_SIZE_MB} MB."
                    )
                },
                status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            )

        # Upload to S3 under a key unique per upload. Keying on the filename alone
        # let a repeat upload of "my_spotify_data.zip" overwrite the previous object —
        # and made deleting one upload destroy another upload's data.
        upload_id = uuid.uuid4()
        file_key = f"uploads/{request.user.id}/{upload_id}/{file.name}"
        upload_file_to_s3(file, file_key)

        # Superusers and users who already paid skip Stripe
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.has_paid or request.user.is_superuser:
            # Already paid — skip Stripe checkout, start processing immediately
            upload = Upload.objects.create(
                id=upload_id,
                user=request.user,
                file_key=file_key,
                original_filename=file.name,
                file_size_bytes=file.size,
                status=Upload.Status.PENDING,
            )
            task = process_upload.delay(str(upload.id))
            upload.celery_task_id = task.id
            upload.save(update_fields=["celery_task_id"])
            return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)

        # First-time payment — create upload in pending_payment state
        upload = Upload.objects.create(
            id=upload_id,
            user=request.user,
            file_key=file_key,
            original_filename=file.name,
            file_size_bytes=file.size,
            status=Upload.Status.PENDING_PAYMENT,
        )

        # Create Stripe Checkout Session
        frontend_url = django_settings.FRONTEND_URL
        try:
            checkout_session = stripe.checkout.Session.create(
                customer=get_or_create_stripe_customer(request.user),
                line_items=[{"price": django_settings.STRIPE_PRICE_ID, "quantity": 1}],
                mode="payment",
                success_url=f"{frontend_url}/payment/success?upload_id={upload.id}",
                cancel_url=f"{frontend_url}/upload?payment=cancelled",
                metadata={"upload_id": str(upload.id), "user_id": str(request.user.id)},
            )
        except stripe.StripeError as e:
            upload.delete()
            delete_file_from_s3(file_key)
            return Response(
                {"detail": f"Payment setup failed: {e}"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Create Payment record
        Payment.objects.create(
            upload=upload,
            user=request.user,
            stripe_checkout_session_id=checkout_session.id,
        )

        return Response(
            {**UploadSerializer(upload).data, "checkout_url": checkout_session.url},
            status=status.HTTP_201_CREATED,
        )


class UploadListView(generics.ListAPIView):
    serializer_class = UploadSerializer

    def get_queryset(self):
        return Upload.objects.filter(user=self.request.user)


class UploadStatusView(generics.RetrieveAPIView):
    serializer_class = UploadStatusSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Upload.objects.filter(user=self.request.user)


class UploadDeleteView(generics.DestroyAPIView):
    lookup_field = "id"

    def get_queryset(self):
        return Upload.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        try:
            delete_file_from_s3(instance.file_key)
        except Exception:
            pass  # S3 cleanup is best-effort
        instance.delete()


# ─── Dashboards ────────────────────────────────────────────────────────────────


class DashboardListView(generics.ListAPIView):
    serializer_class = DashboardSummarySerializer

    def get_queryset(self):
        return ProcessedDashboard.objects.filter(user=self.request.user)


class DashboardDetailView(generics.RetrieveUpdateDestroyAPIView):
    lookup_field = "id"

    def get_serializer_class(self):
        if self.request.method == "GET":
            return DashboardDetailSerializer
        return DashboardSummarySerializer

    def get_queryset(self):
        return ProcessedDashboard.objects.filter(user=self.request.user)


class DashboardPublicView(generics.RetrieveAPIView):
    serializer_class = DashboardDetailSerializer
    permission_classes = (permissions.AllowAny,)
    lookup_field = "share_slug"

    def get_queryset(self):
        return ProcessedDashboard.objects.filter(is_public=True)


# ─── Stripe Webhook ──────────────────────────────────────────────────────────


@csrf_exempt
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def stripe_webhook(request):
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, django_settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError):
        return HttpResponse(status=400)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        checkout_session_id = session["id"]

        try:
            payment = Payment.objects.select_related("upload").get(
                stripe_checkout_session_id=checkout_session_id
            )
        except Payment.DoesNotExist:
            return HttpResponse(status=200)

        # Idempotency: skip if already processed
        if payment.status == Payment.Status.COMPLETED:
            return HttpResponse(status=200)

        # Mark payment as completed
        payment.status = Payment.Status.COMPLETED
        payment_intent_id = session.get("payment_intent", "")
        payment.stripe_payment_intent_id = payment_intent_id

        # Retrieve receipt URL from the charge
        receipt_url = ""
        if payment_intent_id:
            try:
                pi = stripe.PaymentIntent.retrieve(payment_intent_id)
                if pi.latest_charge:
                    charge = stripe.Charge.retrieve(pi.latest_charge)
                    receipt_url = charge.receipt_url or ""
            except stripe.StripeError:
                pass
        payment.receipt_url = receipt_url
        payment.save(
            update_fields=[
                "status",
                "stripe_payment_intent_id",
                "receipt_url",
                "updated_at",
            ]
        )

        # Mark user as paid (one-time unlock) and backfill stripe_customer_id
        profile, _ = UserProfile.objects.get_or_create(user=payment.user)
        update_fields = ["updated_at"]
        if not profile.has_paid:
            profile.has_paid = True
            update_fields.append("has_paid")
        customer_id = session.get("customer", "")
        if customer_id and not profile.stripe_customer_id:
            profile.stripe_customer_id = customer_id
            update_fields.append("stripe_customer_id")
        profile.save(update_fields=update_fields)

        # Start processing
        upload = payment.upload
        upload.status = Upload.Status.PENDING
        upload.save(update_fields=["status", "updated_at"])

        task = process_upload.delay(str(upload.id))
        upload.celery_task_id = task.id
        upload.save(update_fields=["celery_task_id"])

    return HttpResponse(status=200)


# ─── Payments ────────────────────────────────────────────────────────────────


class PaymentListView(generics.ListAPIView):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user).order_by("-created_at")


# ─── Account Deletion ────────────────────────────────────────────────────────


class DeleteAccountView(generics.GenericAPIView):
    def delete(self, request):
        user = request.user

        # Delete S3 files for all uploads
        for upload in Upload.objects.filter(user=user):
            try:
                delete_file_from_s3(upload.file_key)
            except Exception:
                pass

        # Delete parquet files for dashboards
        for dashboard in ProcessedDashboard.objects.filter(user=user):
            if dashboard.parquet_key:
                try:
                    delete_file_from_s3(dashboard.parquet_key)
                except Exception:
                    pass

        # Delete user — CASCADE handles related objects
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ─── Billing Portal ──────────────────────────────────────────────────────────


@api_view(["POST"])
def create_billing_portal_session(request):
    try:
        profile = UserProfile.objects.get(user=request.user)
    except UserProfile.DoesNotExist:
        return Response({"detail": "Profile not found."}, status=status.HTTP_404_NOT_FOUND)

    if not profile.stripe_customer_id:
        return Response(
            {"detail": "No billing history found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    try:
        session = stripe.billing_portal.Session.create(
            customer=profile.stripe_customer_id,
            return_url=f"{django_settings.FRONTEND_URL}/settings",
        )
    except stripe.StripeError as e:
        return Response(
            {"detail": f"Failed to create billing portal session: {e}"},
            status=status.HTTP_502_BAD_GATEWAY,
        )

    return Response({"url": session.url})


# ─── Admin Analytics ──────────────────────────────────────────────────────────


class AdminAnalyticsView(APIView):
    permission_classes = [permissions.IsAdminUser]

    RANGE_MAP = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
    }

    def get(self, request):
        range_param = request.query_params.get("range", "30d")
        days = self.RANGE_MAP.get(range_param)
        now = timezone.now()

        # Date filter
        if days:
            start_date = now - timedelta(days=days)
            date_filter = Q(created_at__gte=start_date)
            joined_filter = Q(date_joined__gte=start_date)
        else:
            start_date = None
            date_filter = Q()
            joined_filter = Q()

        # Use weekly buckets for ranges > 90 days
        trunc_fn = TruncWeek if range_param == "all" else TruncDate

        # ── KPIs ──
        total_revenue = Payment.objects.filter(
            status=Payment.Status.COMPLETED
        ).aggregate(total=Sum("amount_cents"))["total"] or 0

        period_revenue = Payment.objects.filter(
            status=Payment.Status.COMPLETED
        ).filter(date_filter).aggregate(total=Sum("amount_cents"))["total"] or 0

        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_revenue = Payment.objects.filter(
            status=Payment.Status.COMPLETED, created_at__gte=today_start
        ).aggregate(total=Sum("amount_cents"))["total"] or 0

        total_users = User.objects.count()
        period_new_users = User.objects.filter(joined_filter).count()
        active_users_30d = Upload.objects.filter(
            created_at__gte=now - timedelta(days=30)
        ).values("user").distinct().count()

        total_uploads = Upload.objects.count()
        period_uploads = Upload.objects.filter(date_filter).count()

        completed_uploads = Upload.objects.filter(status=Upload.Status.COMPLETED).count()
        success_rate = (completed_uploads / total_uploads * 100) if total_uploads > 0 else 0.0

        total_storage = Upload.objects.aggregate(total=Sum("file_size_bytes"))["total"] or 0
        total_dashboards = ProcessedDashboard.objects.count()
        paid_users = UserProfile.objects.filter(has_paid=True).count()
        conversion_rate = (paid_users / total_users * 100) if total_users > 0 else 0.0

        kpis = {
            "total_revenue_cents": total_revenue,
            "period_revenue_cents": period_revenue,
            "today_revenue_cents": today_revenue,
            "total_users": total_users,
            "period_new_users": period_new_users,
            "active_users_30d": active_users_30d,
            "total_uploads": total_uploads,
            "period_uploads": period_uploads,
            "success_rate": round(success_rate, 1),
            "total_storage_bytes": total_storage,
            "total_dashboards": total_dashboards,
            "paid_users": paid_users,
            "conversion_rate": round(conversion_rate, 1),
        }

        # ── Revenue series ──
        revenue_qs = (
            Payment.objects.filter(status=Payment.Status.COMPLETED)
            .filter(date_filter)
            .annotate(date=trunc_fn("created_at"))
            .values("date")
            .annotate(amount_cents=Sum("amount_cents"))
            .order_by("date")
        )
        revenue_series = []
        cumulative = 0
        for row in revenue_qs:
            cumulative += row["amount_cents"]
            revenue_series.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "amount_cents": row["amount_cents"],
                "cumulative_cents": cumulative,
            })

        # ── User growth series ──
        user_qs = (
            User.objects.filter(joined_filter)
            .annotate(date=trunc_fn("date_joined"))
            .values("date")
            .annotate(count=Count("id"))
            .order_by("date")
        )
        user_growth_series = []
        cumulative = 0
        for row in user_qs:
            cumulative += row["count"]
            user_growth_series.append({
                "date": row["date"].strftime("%Y-%m-%d"),
                "new_users": row["count"],
                "cumulative_users": cumulative,
            })

        # ── Upload series ──
        upload_qs = (
            Upload.objects.filter(date_filter)
            .annotate(date=trunc_fn("created_at"))
            .values("date")
            .annotate(
                total=Count("id"),
                completed=Count("id", filter=Q(status=Upload.Status.COMPLETED)),
                failed=Count("id", filter=Q(status=Upload.Status.FAILED)),
            )
            .order_by("date")
        )
        upload_series = [
            {
                "date": row["date"].strftime("%Y-%m-%d"),
                "total": row["total"],
                "completed": row["completed"],
                "failed": row["failed"],
            }
            for row in upload_qs
        ]

        # ── Upload funnel ──
        funnel_qs = (
            Upload.objects.filter(date_filter)
            .values("status")
            .annotate(count=Count("id"))
        )
        upload_funnel = {
            "pending_payment": 0, "pending": 0, "validating": 0,
            "processing": 0, "completed": 0, "failed": 0,
        }
        for row in funnel_qs:
            upload_funnel[row["status"]] = row["count"]

        # ── Platform insights ──
        insights = ProcessedDashboard.objects.aggregate(
            avg_total_hours=Avg("total_hours"),
            avg_total_streams=Avg("total_streams"),
            avg_unique_artists=Avg("unique_artists"),
            avg_unique_tracks=Avg("unique_tracks"),
        )
        platform_insights = {
            "avg_total_hours": round(insights["avg_total_hours"] or 0, 1),
            "avg_total_streams": round(insights["avg_total_streams"] or 0, 1),
            "avg_unique_artists": round(insights["avg_unique_artists"] or 0, 1),
            "avg_unique_tracks": round(insights["avg_unique_tracks"] or 0, 1),
            "total_public_dashboards": ProcessedDashboard.objects.filter(is_public=True).count(),
        }

        # ── Recent activity ──
        recent_uploads = list(
            Upload.objects.select_related("user")
            .order_by("-created_at")[:20]
            .values_list("created_at", "user__username", "original_filename", "status")
        )
        recent_payments = list(
            Payment.objects.filter(status=Payment.Status.COMPLETED)
            .select_related("user")
            .order_by("-created_at")[:20]
            .values_list("created_at", "user__username", "amount_cents", "status")
        )
        recent_registrations = list(
            User.objects.order_by("-date_joined")[:20]
            .values_list("date_joined", "username")
        )

        activity = []
        for created_at, username, filename, upload_status in recent_uploads:
            activity.append({
                "type": "upload",
                "user": username,
                "detail": filename,
                "status": upload_status,
                "created_at": created_at.isoformat(),
            })
        for created_at, username, amount, pay_status in recent_payments:
            activity.append({
                "type": "payment",
                "user": username,
                "detail": f"${amount / 100:.2f}",
                "status": pay_status,
                "created_at": created_at.isoformat(),
            })
        for joined, username in recent_registrations:
            activity.append({
                "type": "registration",
                "user": username,
                "detail": "New account",
                "status": None,
                "created_at": joined.isoformat(),
            })

        activity.sort(key=lambda x: x["created_at"], reverse=True)
        recent_activity = activity[:20]

        return Response({
            "kpis": kpis,
            "revenue_series": revenue_series,
            "user_growth_series": user_growth_series,
            "upload_series": upload_series,
            "upload_funnel": upload_funnel,
            "platform_insights": platform_insights,
            "recent_activity": recent_activity,
        })
