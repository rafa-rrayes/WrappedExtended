from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views

app_name = "api"

urlpatterns = [
    # Auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    # Uploads
    path("uploads/", views.UploadCreateView.as_view(), name="upload-create"),
    path("uploads/list/", views.UploadListView.as_view(), name="upload-list"),
    path("uploads/<uuid:id>/status/", views.UploadStatusView.as_view(), name="upload-status"),
    # Dashboards
    path("dashboards/", views.DashboardListView.as_view(), name="dashboard-list"),
    path("dashboards/<uuid:id>/", views.DashboardDetailView.as_view(), name="dashboard-detail"),
    path("dashboards/shared/<slug:share_slug>/", views.DashboardPublicView.as_view(), name="dashboard-public"),
]
