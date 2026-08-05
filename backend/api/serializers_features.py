"""Serializers for interactive feature endpoints."""

from datetime import date

from rest_framework import serializers


class TimeMachineSerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()
    compare_start = serializers.DateField(required=False)
    compare_end = serializers.DateField(required=False)


class SearchSuggestSerializer(serializers.Serializer):
    q = serializers.CharField(min_length=1, max_length=200)


class SearchEntitySerializer(serializers.Serializer):
    q = serializers.CharField(min_length=1, max_length=200)
    type = serializers.ChoiceField(choices=["artist", "track"])


class ChartBuilderSerializer(serializers.Serializer):
    metric = serializers.ChoiceField(choices=["hours", "plays", "avg_hours"])
    group_by = serializers.ChoiceField(
        choices=[
            "artist_name", "track_name", "album_name", "platform",
            "year", "month", "hour", "weekday", "date",
        ]
    )
    limit = serializers.IntegerField(min_value=1, max_value=1000, default=100)


class WhatIfSerializer(serializers.Serializer):
    exclude_artists = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    exclude_tracks = serializers.ListField(
        child=serializers.CharField(), required=False, default=list
    )
    min_ms = serializers.IntegerField(required=False, min_value=0)


class JourneySerializer(serializers.Serializer):
    # Bounded so an absurd year cannot reach date() and raise there instead.
    year = serializers.IntegerField(min_value=1970, max_value=2100)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    day = serializers.IntegerField(required=False, min_value=1, max_value=31)

    def validate(self, attrs):
        """Reject day/month combinations that aren't a real calendar date.

        The view builds date(year, month or 1, day); without this, a request like
        year=2024&month=2&day=30 raised an uncaught ValueError and returned a 500.
        """
        day = attrs.get("day")
        if day is None:
            return attrs
        try:
            date(attrs["year"], attrs.get("month") or 1, day)
        except ValueError as exc:
            raise serializers.ValidationError(
                {"day": "Not a valid date for the given year and month."}
            ) from exc
        return attrs
