"""Serializers for interactive feature endpoints."""

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
    year = serializers.IntegerField()
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)
    day = serializers.IntegerField(required=False, min_value=1, max_value=31)
