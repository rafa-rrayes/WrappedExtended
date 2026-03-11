"""Views for interactive dashboard features (Time Machine, Search, Chart Builder, etc.)."""

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import GlobalBenchmark, ProcessedDashboard
from .serializers_features import (
    ChartBuilderSerializer,
    JourneySerializer,
    SearchEntitySerializer,
    TimeMachineSerializer,
    WhatIfSerializer,
)

logger = logging.getLogger(__name__)


class DashboardFeatureMixin:
    """Shared logic for loading dashboard + Parquet DataFrame."""

    def get_dashboard(self, request, dashboard_id):
        try:
            return ProcessedDashboard.objects.get(id=dashboard_id, user=request.user)
        except ProcessedDashboard.DoesNotExist:
            return None

    def load_df(self, dashboard):
        if not dashboard.parquet_key:
            return None
        from processing.query_engine import load_dataframe

        return load_dataframe(dashboard.parquet_key)


class TimeMachineView(DashboardFeatureMixin, APIView):
    def post(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = TimeMachineSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        df = self.load_df(dashboard)
        if df is None:
            return Response(
                {"detail": "Parquet data not available. Re-upload to enable this feature."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from processing.query_engine import time_machine

        result = time_machine(
            df,
            start=str(data["start"]),
            end=str(data["end"]),
            compare_start=str(data["compare_start"]) if data.get("compare_start") else None,
            compare_end=str(data["compare_end"]) if data.get("compare_end") else None,
        )
        return Response(result)


class SearchSuggestView(DashboardFeatureMixin, APIView):
    def get(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        q = request.query_params.get("q", "").strip().lower()
        if len(q) < 1:
            return Response({"artists": [], "tracks": []})

        df = self.load_df(dashboard)
        if df is None:
            # Fall back to dashboard_data for client-side search
            return Response({"artists": [], "tracks": []})

        from processing.query_engine import get_unique_names

        names = get_unique_names(df)
        # Filter by query
        artists = [a for a in names["artists"] if q in a.lower()][:10]
        tracks = [t for t in names["tracks"] if q in t["track_name"].lower()][:10]
        return Response({"artists": artists, "tracks": tracks})


class SearchEntityView(DashboardFeatureMixin, APIView):
    def get(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SearchEntitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        df = self.load_df(dashboard)
        if df is None:
            return Response(
                {"detail": "Parquet data not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from processing.query_engine import search_entity

        result = search_entity(df, data["type"], data["q"])
        if not result:
            return Response({"detail": "Entity not found."}, status=status.HTTP_404_NOT_FOUND)
        return Response(result)


class ChartBuilderView(DashboardFeatureMixin, APIView):
    def post(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = ChartBuilderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        df = self.load_df(dashboard)
        if df is None:
            return Response(
                {"detail": "Parquet data not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from processing.query_engine import custom_aggregate

        try:
            result = custom_aggregate(df, data["metric"], data["group_by"], data["limit"])
        except ValueError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"data": result})


class WhatIfView(DashboardFeatureMixin, APIView):
    def post(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = WhatIfSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        df = self.load_df(dashboard)
        if df is None:
            return Response(
                {"detail": "Parquet data not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from processing.query_engine import what_if

        result = what_if(
            df,
            exclude_artists=data.get("exclude_artists"),
            exclude_tracks=data.get("exclude_tracks"),
            min_ms=data.get("min_ms"),
        )
        return Response(result)


class BenchmarksView(APIView):
    def get(self, request, dashboard_id):
        try:
            dashboard = ProcessedDashboard.objects.get(id=dashboard_id, user=request.user)
        except ProcessedDashboard.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        benchmarks = {
            b.metric: b.percentiles
            for b in GlobalBenchmark.objects.all()
        }

        if not benchmarks:
            # Static fallbacks based on public Spotify averages
            benchmarks = _static_benchmarks()

        # Compare user's stats against benchmarks
        user_stats = {
            "total_hours": dashboard.total_hours,
            "total_streams": dashboard.total_streams,
            "unique_artists": dashboard.unique_artists,
            "unique_tracks": dashboard.unique_tracks,
        }

        comparisons = {}
        for metric, value in user_stats.items():
            if metric in benchmarks:
                pcts = benchmarks[metric]
                percentile = _compute_user_percentile(value, pcts)
                comparisons[metric] = {
                    "value": value,
                    "percentile": percentile,
                    "benchmarks": pcts,
                }

        return Response({
            "comparisons": comparisons,
            "has_real_data": bool(GlobalBenchmark.objects.exists()),
        })


class JourneyView(DashboardFeatureMixin, APIView):
    def get(self, request, dashboard_id):
        dashboard = self.get_dashboard(request, dashboard_id)
        if not dashboard:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

        serializer = JourneySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        df = self.load_df(dashboard)
        if df is None:
            return Response(
                {"detail": "Parquet data not available."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from processing.query_engine import journey_page

        result = journey_page(
            df,
            year=data["year"],
            month=data.get("month"),
            day=data.get("day"),
        )
        return Response(result)


def _static_benchmarks():
    """Fallback benchmarks based on general Spotify usage data."""
    return {
        "total_hours": {
            "p10": 50, "p25": 150, "p50": 400, "p75": 800,
            "p90": 1500, "p95": 2500, "p99": 5000,
        },
        "total_streams": {
            "p10": 2000, "p25": 5000, "p50": 15000, "p75": 35000,
            "p90": 70000, "p95": 120000, "p99": 250000,
        },
        "unique_artists": {
            "p10": 50, "p25": 150, "p50": 500, "p75": 1200,
            "p90": 2500, "p95": 4000, "p99": 8000,
        },
        "unique_tracks": {
            "p10": 200, "p25": 600, "p50": 2000, "p75": 5000,
            "p90": 10000, "p95": 18000, "p99": 35000,
        },
    }


def _compute_user_percentile(value: float, percentiles: dict) -> int:
    """Estimate user's percentile based on benchmark distribution."""
    sorted_pcts = sorted(percentiles.items(), key=lambda x: int(x[0].replace("p", "")))
    for label, threshold in sorted_pcts:
        pct = int(label.replace("p", ""))
        if value <= threshold:
            return pct
    return 99
