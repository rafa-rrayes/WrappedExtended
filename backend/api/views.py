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
    PaymentSerializer,
    RegisterSerializer,
    UploadSerializer,
    UploadStatusSerializer,
    UserProfileSerializer,
)

stripe.api_key = django_settings.STRIPE_SECRET_KEY

User = get_user_model()


def get_or_create_stripe_customer(user):
    profile = UserProfile.objects.get(user=user)
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

        # Upload to S3
        file_key = f"uploads/{request.user.id}/{file.name}"
        upload_file_to_s3(file, file_key)

        # Superusers and users who already paid skip Stripe
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        if profile.has_paid or request.user.is_superuser:
            # Already paid — skip Stripe checkout, start processing immediately
            upload = Upload.objects.create(
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
        payment.save(update_fields=["status", "stripe_payment_intent_id", "receipt_url", "updated_at"])

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
