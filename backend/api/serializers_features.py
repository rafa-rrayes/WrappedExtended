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
    type = serializers.ChoiceField(choices=["artist", "track", "album"])


class DateRangeParamsMixin:
    """Adds the optional `from` / `to` query params.

    They can't be declared as class attributes (`from` is a Python keyword), so they are
    injected in get_fields() and read out of validated_data by key.
    """

    def get_fields(self):
        fields = super().get_fields()
        fields["from"] = serializers.DateField(required=False)
        fields["to"] = serializers.DateField(required=False)
        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        start, end = attrs.get("from"), attrs.get("to")
        if start and end and start > end:
            raise serializers.ValidationError({"to": "`to` must be on or after `from`."})
        return attrs


class EntityBrowseSerializer(DateRangeParamsMixin, serializers.Serializer):
    type = serializers.ChoiceField(choices=["artist", "track", "album"])
    q = serializers.CharField(required=False, allow_blank=True, max_length=200)
    sort = serializers.ChoiceField(
        choices=["hours", "plays", "name", "first", "last"], default="hours"
    )
    order = serializers.ChoiceField(choices=["asc", "desc"], default="desc")
    page = serializers.IntegerField(min_value=1, max_value=100_000, default=1)
    page_size = serializers.IntegerField(min_value=1, max_value=200, default=50)


class EntityDetailSerializer(DateRangeParamsMixin, serializers.Serializer):
    type = serializers.ChoiceField(choices=["artist", "track", "album"])
    name = serializers.CharField(min_length=1, max_length=500)
    # Optional: two tracks can share a title, and `browse_entities` keys them by
    # (name, artist). Omitting it keeps the older merged-by-name behaviour.
    artist = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class ComparePeriodsSerializer(serializers.Serializer):
    a_start = serializers.DateField()
    a_end = serializers.DateField()
    b_start = serializers.DateField()
    b_end = serializers.DateField()

    def validate(self, attrs):
        for period in ("a", "b"):
            if attrs[f"{period}_start"] > attrs[f"{period}_end"]:
                raise serializers.ValidationError(
                    {f"{period}_end": f"`{period}_end` must be on or after `{period}_start`."}
                )
        return attrs


class ChartBuilderSerializer(serializers.Serializer):
    metric = serializers.ChoiceField(choices=["hours", "plays", "avg_hours"])
    group_by = serializers.ChoiceField(
        choices=[
            "artist_name",
            "track_name",
            "album_name",
            "platform",
            "year",
            "month",
            "hour",
            "weekday",
            "date",
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
