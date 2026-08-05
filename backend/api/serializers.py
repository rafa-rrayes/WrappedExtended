import uuid

from django.contrib.auth import get_user_model
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Payment, ProcessedDashboard, Upload, UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password")

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()

    def validate_refresh(self, value):
        try:
            self.token = RefreshToken(value)
        except Exception as exc:
            raise serializers.ValidationError("Invalid or expired token.") from exc
        return value

    def save(self):
        try:
            self.token.blacklist()
        except Exception:
            pass  # Token may already be blacklisted


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)
    upload_count = serializers.SerializerMethodField()

    class Meta:
        model = UserProfile
        fields = (
            "username", "email", "display_name", "timezone",
            "max_uploads", "has_paid", "is_staff", "upload_count", "created_at",
        )
        read_only_fields = ("max_uploads", "has_paid", "is_staff", "upload_count", "created_at")

    def get_upload_count(self, obj: UserProfile) -> int:
        return Upload.objects.filter(user=obj.user).count()


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id", "amount_cents", "currency", "status",
            "stripe_payment_intent_id", "receipt_url", "created_at",
        )
        read_only_fields = fields


class UploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Upload
        fields = (
            "id", "status", "original_filename", "file_size_bytes",
            "progress_pct", "error_message", "created_at",
        )
        read_only_fields = fields


class UploadStatusSerializer(serializers.ModelSerializer):
    """Lightweight serializer for polling."""

    dashboard_id = serializers.SerializerMethodField()
    checkout_url = serializers.SerializerMethodField()

    class Meta:
        model = Upload
        fields = ("id", "status", "progress_pct", "error_message", "dashboard_id", "checkout_url")
        read_only_fields = ("id", "status", "progress_pct", "error_message")

    def get_dashboard_id(self, obj: Upload) -> str | None:
        if obj.status != Upload.Status.COMPLETED:
            return None
        dashboard = getattr(obj, "dashboard", None)
        return str(dashboard.id) if dashboard else None

    def get_checkout_url(self, obj: Upload) -> str | None:
        if obj.status != Upload.Status.PENDING_PAYMENT:
            return None
        payment = getattr(obj, "payment", None)
        if not payment:
            return None
        # Retrieve fresh checkout URL from Stripe
        import stripe
        from django.conf import settings as django_settings

        stripe.api_key = django_settings.STRIPE_SECRET_KEY
        try:
            session = stripe.checkout.Session.retrieve(payment.stripe_checkout_session_id)
            return session.url
        except stripe.StripeError:
            return None


class DashboardSummarySerializer(serializers.ModelSerializer):
    original_filename = serializers.CharField(source="upload.original_filename", read_only=True)

    class Meta:
        model = ProcessedDashboard
        fields = (
            "id", "original_filename", "total_hours", "total_streams",
            "unique_artists", "unique_tracks", "date_range_start", "date_range_end",
            "is_public", "share_slug", "created_at",
        )
        read_only_fields = (
            "id", "original_filename", "total_hours", "total_streams",
            "unique_artists", "unique_tracks", "date_range_start", "date_range_end",
            "created_at",
        )

    def update(self, instance, validated_data):
        if validated_data.get("is_public") and not instance.share_slug:
            validated_data["share_slug"] = uuid.uuid4().hex[:8]
        return super().update(instance, validated_data)


class DashboardDetailSerializer(serializers.ModelSerializer):
    original_filename = serializers.CharField(source="upload.original_filename", read_only=True)

    class Meta:
        model = ProcessedDashboard
        fields = (
            "id", "original_filename", "dashboard_data",
            "total_hours", "total_streams", "unique_artists", "unique_tracks",
            "date_range_start", "date_range_end",
            "is_public", "share_slug", "created_at",
        )
        read_only_fields = (
            "id", "original_filename", "dashboard_data",
            "total_hours", "total_streams", "unique_artists", "unique_tracks",
            "date_range_start", "date_range_end", "created_at",
        )
