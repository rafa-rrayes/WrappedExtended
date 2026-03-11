import stripe
from django.conf import settings as django_settings
from django.contrib.auth import get_user_model
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from processing.tasks import process_upload
from storage.client import delete_file_from_s3, upload_file_to_s3

from .models import Payment, ProcessedDashboard, Upload, UserProfile
from .serializers import (
    ChangePasswordSerializer,
    DashboardDetailSerializer,
    DashboardSummarySerializer,
    LogoutSerializer,
    RegisterSerializer,
    UploadSerializer,
    UploadStatusSerializer,
    UserProfileSerializer,
)

stripe.api_key = django_settings.STRIPE_SECRET_KEY

User = get_user_model()


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

        # Upload to S3
        file_key = f"uploads/{request.user.id}/{file.name}"
        upload_file_to_s3(file, file_key)

        # Create Upload record — don't process until paid
        upload = Upload.objects.create(
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
                line_items=[{"price": django_settings.STRIPE_PRICE_ID, "quantity": 1}],
                mode="payment",
                success_url=f"{frontend_url}/processing/{upload.id}?payment=success",
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

        # Mark payment as completed
        payment.status = Payment.Status.COMPLETED
        payment.stripe_payment_intent_id = session.get("payment_intent", "")
        payment.save(update_fields=["status", "stripe_payment_intent_id", "updated_at"])

        # Start processing
        upload = payment.upload
        upload.status = Upload.Status.PENDING
        upload.save(update_fields=["status", "updated_at"])

        task = process_upload.delay(str(upload.id))
        upload.celery_task_id = task.id
        upload.save(update_fields=["celery_task_id"])

    return HttpResponse(status=200)
