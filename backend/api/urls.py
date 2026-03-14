from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from . import views
from . import views_dashboard_features as feature_views

app_name = "api"

urlpatterns = [
    # Auth
    path("auth/register/", views.RegisterView.as_view(), name="register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="login"),
    path("auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("auth/me/", views.MeView.as_view(), name="me"),
    path("auth/logout/", views.LogoutView.as_view(), name="logout"),
    path("auth/password/change/", views.ChangePasswordView.as_view(), name="password-change"),
    # Account
    path("auth/account/", views.DeleteAccountView.as_view(), name="account-delete"),
    # Payments
    path("payments/", views.PaymentListView.as_view(), name="payment-list"),
    path("payments/webhook/", views.stripe_webhook, name="stripe-webhook"),
    path("payments/billing-portal/", views.create_billing_portal_session, name="billing-portal"),
    # Uploads
    path("uploads/", views.UploadCreateView.as_view(), name="upload-create"),
    path("uploads/list/", views.UploadListView.as_view(), name="upload-list"),
    path("uploads/<uuid:id>/status/", views.UploadStatusView.as_view(), name="upload-status"),
    path("uploads/<uuid:id>/", views.UploadDeleteView.as_view(), name="upload-delete"),
    # Dashboards
    path("dashboards/", views.DashboardListView.as_view(), name="dashboard-list"),
    path("dashboards/<uuid:id>/", views.DashboardDetailView.as_view(), name="dashboard-detail"),
    path(
        "dashboards/shared/<slug:share_slug>/",
        views.DashboardPublicView.as_view(),
        name="dashboard-public",
    ),
    # Dashboard features
    path(
        "dashboards/<uuid:dashboard_id>/time-machine/",
        feature_views.TimeMachineView.as_view(),
        name="time-machine",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/search/suggest/",
        feature_views.SearchSuggestView.as_view(),
        name="search-suggest",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/search/",
        feature_views.SearchEntityView.as_view(),
        name="search-entity",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/chart/",
        feature_views.ChartBuilderView.as_view(),
        name="chart-builder",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/what-if/",
        feature_views.WhatIfView.as_view(),
        name="what-if",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/benchmarks/",
        feature_views.BenchmarksView.as_view(),
        name="benchmarks",
    ),
    path(
        "dashboards/<uuid:dashboard_id>/journey/",
        feature_views.JourneyView.as_view(),
        name="journey",
    ),
]
