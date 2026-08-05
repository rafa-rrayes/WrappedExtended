"""`processing/ml/` — mostly that it degrades correctly, which is how it ships.

torch and umap-learn are deliberately not in the default install (see the `ml-deep`
extra in pyproject.toml), so the assertions below describe the *normal* production
configuration: the two deep-learning models report `available: false` and everything
else still runs.
"""

import json

import pandas as pd
import pytest

from processing.ml import clustering, sequence_model, skip_model
from processing.ml.features import build_features, quick_summary
from processing.ml.runner import run_ml_insights

from . import factories

TOP_LEVEL_KEYS = {
    "summary",
    "embeddings",
    "clustering",
    "skip_model",
    "sequence_model",
    "forecast",
}


@pytest.fixture(scope="module")
def ml_frame():
    """360 plays over ~8 months — small enough to fit every model in about a second."""
    return factories.ml_df()


@pytest.fixture(scope="module")
def insights(ml_frame):
    return run_ml_insights(ml_frame)


# ── The payload contract ─────────────────────────────────────────────────────────────


def test_every_top_level_key_is_present(insights):
    assert set(insights) == TOP_LEVEL_KEYS


def test_the_payload_is_json_serializable(insights):
    """It is stored in a JSONField and typed by the frontend — no numpy scalars allowed."""
    round_tripped = json.loads(json.dumps(insights))
    assert set(round_tripped) == TOP_LEVEL_KEYS


def test_summary_block(insights):
    summary = insights["summary"]
    assert set(summary) == {
        "rows",
        "date_min",
        "date_max",
        "total_hours",
        "unique_artists",
        "unique_tracks",
        "sessions",
        "skip_rate",
    }
    assert summary["rows"] == 360
    assert summary["unique_artists"] == 8
    assert summary["sessions"] == 60
    assert 0.0 <= summary["skip_rate"] <= 1.0


def test_embeddings_block(insights):
    embeddings = insights["embeddings"]
    assert {"method", "projection", "points", "scenes", "similar_artists", "model"} <= set(
        embeddings
    )
    assert embeddings["artists_plotted"] == len(embeddings["points"])
    assert set(embeddings["points"][0]) == {"artist", "x", "y", "scene", "hours"}
    assert embeddings["scenes"], "at least one scene must be discovered"


def test_umap_is_absent_so_the_projection_falls_back_to_tsne(insights):
    assert insights["embeddings"]["projection"] == "t-SNE"


def test_clustering_block(insights):
    modes = insights["clustering"]["modes"]
    assert insights["clustering"]["n_sessions"] == 60
    assert modes and all(isinstance(m["name"], str) for m in modes)
    assert len({m["name"] for m in modes}) == len(modes), "mode names must be unique"
    assert sum(m["n_sessions"] for m in modes) == 60


def test_forecast_block(insights):
    forecast = insights["forecast"]
    assert len(forecast["forecast_next_6_months"]) == 6
    for point in forecast["forecast_next_6_months"]:
        assert point["lower"] <= point["hours"] <= point["upper"]
        assert point["hours"] >= 0
    assert forecast["history"]
    assert forecast["history_months"] == len(forecast["history"])


def test_skip_model_block(insights):
    model = insights["skip_model"]
    assert set(model) == {"baseline_skip_rate", "gradient_boosting_auc", "pytorch_mlp", "drivers"}
    assert 0.0 <= model["gradient_boosting_auc"] <= 1.0
    assert {d["feature"] for d in model["drivers"]} >= {"hour", "weekday", "shuffle"}


# ── Degrading without torch ──────────────────────────────────────────────────────────


def test_pytorch_mlp_reports_itself_unavailable(insights):
    mlp = insights["skip_model"]["pytorch_mlp"]
    assert mlp["available"] is False
    assert "torch" in mlp["error"]


def test_sequence_model_reports_itself_unavailable(insights):
    model = insights["sequence_model"]
    assert model["available"] is False
    assert "torch" in model["error"]


def test_the_run_succeeds_despite_the_missing_deep_learning_models(insights):
    assert insights["skip_model"]["gradient_boosting_auc"] is not None
    assert "error" not in insights["skip_model"]


# ── One model failing must not take down the run ─────────────────────────────────────


def test_a_raising_model_is_isolated(ml_frame, monkeypatch):
    def _boom(df):
        raise RuntimeError("kmeans exploded")

    monkeypatch.setattr(clustering, "run", _boom)
    result = run_ml_insights(ml_frame)

    assert set(result) == TOP_LEVEL_KEYS
    assert result["clustering"] == {"error": "kmeans exploded"}
    assert result["embeddings"]["points"]  # the others still ran
    assert result["summary"]["rows"] == 360


def test_every_model_can_fail_at_once_and_the_payload_still_holds(ml_frame, monkeypatch):
    from processing.ml import embeddings, forecast

    for module in (clustering, embeddings, forecast, skip_model, sequence_model):
        monkeypatch.setattr(module, "run", lambda df: 1 / 0)

    result = run_ml_insights(ml_frame)
    assert set(result) == TOP_LEVEL_KEYS
    assert result["summary"]["rows"] == 360
    for key in TOP_LEVEL_KEYS - {"summary"}:
        assert "error" in result[key]
    json.dumps(result)


def test_a_failed_sequence_model_still_carries_the_available_flag(ml_frame, monkeypatch):
    """The frontend's discriminated union needs `available` even on a hard failure."""
    monkeypatch.setattr(sequence_model, "run", lambda df: 1 / 0)
    result = run_ml_insights(ml_frame)
    assert result["sequence_model"]["available"] is False
    assert "error" in result["sequence_model"]


def test_a_models_error_message_is_truncated(ml_frame, monkeypatch):
    monkeypatch.setattr(clustering, "run", lambda df: (_ for _ in ()).throw(ValueError("x" * 900)))
    result = run_ml_insights(ml_frame)
    assert len(result["clustering"]["error"]) == 500


# ── build_features: the Polars → pandas bridge ───────────────────────────────────────


def test_build_features_renames_timestamp_and_keeps_utc(library):
    frame = build_features(library)
    assert "ts" in frame.columns
    assert str(frame["ts"].dt.tz) == "UTC"
    assert frame["ts"].is_monotonic_increasing


def test_build_features_uses_the_pandas_weekday_convention(library):
    """Polars' cleaned frame is 1-7 Monday-first; the models expect 0-6."""
    frame = build_features(library)
    assert frame["weekday"].min() >= 0
    assert frame["weekday"].max() <= 6
    monday = frame[frame["ts"].dt.date == pd.Timestamp("2023-01-02").date()]
    assert (monday["weekday"] == 0).all()
    assert not monday["is_weekend"].any()


def test_build_features_derives_sessions_on_a_thirty_minute_gap(sessions_frame):
    frame = build_features(sessions_frame)
    assert frame["session_id"].nunique() == 3
    assert frame["session_id"].iloc[0] == 1


def test_build_features_drops_non_music_rows(library):
    from datetime import datetime

    df = factories.make_df(
        factories.library_records(),
        factories.play(datetime(2023, 8, 1, 12, 0), artist=None, track=None, album=None),
    )
    assert len(build_features(df)) == factories.LIBRARY_TOTAL_PLAYS


def test_build_features_fills_in_missing_optional_columns(library):
    stripped = library.drop("platform", "conn_country", "reason_start", "offline")
    frame = build_features(stripped)
    assert (frame["platform"] == "unknown").all()
    assert (frame["reason_start"] == "unknown").all()
    assert frame["offline"].dtype == bool
    assert not frame["offline"].any()


def test_build_features_treats_null_flags_as_false(library):
    frame = build_features(library)
    gamma = frame[frame["artist_name"] == "Gamma"]  # `skipped` is null on every row
    assert gamma["skipped"].dtype == bool
    assert not gamma["skipped"].any()


def test_build_features_raises_when_nothing_is_left_to_model(empty_frame):
    with pytest.raises(ValueError, match="No music plays"):
        build_features(empty_frame)


def test_build_features_raises_without_a_timestamp(library):
    with pytest.raises(ValueError, match="no timestamp column"):
        build_features(library.drop("timestamp", "ts"))


def test_quick_summary_counts(library):
    summary = quick_summary(build_features(library))
    assert summary["rows"] == factories.LIBRARY_TOTAL_PLAYS
    assert summary["unique_artists"] == len(factories.LIBRARY_ARTIST_PLAYS)
    assert summary["unique_tracks"] == 8  # distinct titles; "Intro" is shared
    assert summary["total_hours"] == 33.0


# ── Degenerate input ─────────────────────────────────────────────────────────────────


def test_a_few_hundred_rows_with_nulls_everywhere_still_produce_a_payload():
    """Every nullable column null — the models must impute rather than crash."""
    import polars as pl

    df = factories.ml_df(sessions=40).with_columns(
        [pl.lit(None, dtype=pl.Boolean).alias(c) for c in factories.NULLABLE_FLAGS]
        + [
            pl.lit(None, dtype=pl.String).alias(c)
            for c in ("conn_country", "reason_start", "reason_end", "album_name", "platform")
        ]
    )
    result = run_ml_insights(df)
    assert set(result) == TOP_LEVEL_KEYS
    assert result["summary"]["rows"] == 240
    json.dumps(result)


def test_a_single_valued_skip_flag_is_reported_not_raised():
    df = factories.ml_df(sessions=30).with_columns(skipped=False)
    result = run_ml_insights(df)
    assert result["skip_model"] == {"error": "skip flag has a single value — nothing to learn"}
    assert result["embeddings"].get("points")


def test_missing_optional_columns_do_not_break_the_run():
    df = factories.ml_df(sessions=30).drop(
        "platform", "reason_start", "reason_end", "conn_country"
    )
    result = run_ml_insights(df)
    assert set(result) == TOP_LEVEL_KEYS
    assert "error" not in result["clustering"]


def test_a_tiny_history_degrades_per_model(library):
    """33 plays across 7 artists: too little to embed, still enough to cluster."""
    result = run_ml_insights(library)
    assert set(result) == TOP_LEVEL_KEYS
    assert result["embeddings"] == {"error": "not enough data to embed artists"}
    assert "modes" in result["clustering"]
    json.dumps(result)


def test_a_two_play_history_leaves_errors_rather_than_exceptions():
    from datetime import date

    df = factories.make_df(
        factories.plays(artist="Solo", track="Only", album="LP", start=date(2023, 1, 1), count=2)
    )
    result = run_ml_insights(df)
    assert set(result) == TOP_LEVEL_KEYS
    assert "error" in result["embeddings"]
    assert "error" in result["skip_model"]
    json.dumps(result)


def test_two_identical_sessions_get_disambiguated_mode_names():
    """KMeans is asked for one cluster per session here, so the names would collide."""
    from datetime import date

    df = factories.make_df(
        factories.plays(artist="Solo", track="Only", album="LP", start=date(2023, 1, 1), count=2)
    )
    modes = run_ml_insights(df)["clustering"]["modes"]
    assert [m["n_sessions"] for m in modes] == [1, 1]
    assert len({m["name"] for m in modes}) == 2


def test_a_single_session_is_too_little_to_cluster():
    from datetime import date

    df = factories.make_df(factories.plays(artist="Solo", start=date(2023, 1, 1), count=1))
    assert run_ml_insights(df)["clustering"] == {"error": "not enough sessions to cluster"}
