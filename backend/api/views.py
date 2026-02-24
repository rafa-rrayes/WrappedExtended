from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response

from processing.tasks import process_upload
from storage.client import upload_file_to_s3

from .models import ProcessedDashboard, Upload, UserProfile
from .serializers import (
    DashboardDetailSerializer,
    DashboardSummarySerializer,
    RegisterSerializer,
    UploadSerializer,
    UploadStatusSerializer,
    UserProfileSerializer,
)

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

        # Create Upload record
        upload = Upload.objects.create(
            user=request.user,
            file_key=file_key,
            original_filename=file.name,
            file_size_bytes=file.size,
            status=Upload.Status.PENDING,
        )

        # Dispatch Celery task
        task = process_upload.delay(str(upload.id))
        upload.celery_task_id = task.id
        upload.save(update_fields=["celery_task_id"])

        return Response(UploadSerializer(upload).data, status=status.HTTP_201_CREATED)


class UploadListView(generics.ListAPIView):
    serializer_class = UploadSerializer

    def get_queryset(self):
        return Upload.objects.filter(user=self.request.user)


class UploadStatusView(generics.RetrieveAPIView):
    serializer_class = UploadStatusSerializer
    lookup_field = "id"

    def get_queryset(self):
        return Upload.objects.filter(user=self.request.user)


# ─── Dashboards ────────────────────────────────────────────────────────────────


class DashboardListView(generics.ListAPIView):
    serializer_class = DashboardSummarySerializer

    def get_queryset(self):
        return ProcessedDashboard.objects.filter(user=self.request.user)


class DashboardDetailView(generics.RetrieveUpdateAPIView):
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
