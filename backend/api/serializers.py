from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import ProcessedDashboard, Upload, UserProfile

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


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = UserProfile
        fields = ("username", "email", "display_name", "timezone", "max_uploads", "created_at")
        read_only_fields = ("max_uploads", "created_at")


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

    class Meta:
        model = Upload
        fields = ("id", "status", "progress_pct", "error_message", "dashboard_id")
        read_only_fields = ("id", "status", "progress_pct", "error_message")

    def get_dashboard_id(self, obj: Upload) -> str | None:
        if obj.status != Upload.Status.COMPLETED:
            return None
        dashboard = getattr(obj, "dashboard", None)
        return str(dashboard.id) if dashboard else None


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
