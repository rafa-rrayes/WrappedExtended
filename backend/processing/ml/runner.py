"""Orchestrates the five ML models and merges their output into one JSON payload.

Every sub-model runs inside its own try/except: a model that raises records
`{"error": ...}` under its own key and the rest still ship. The emitted shape is a frozen
contract the frontend is typed against — see `docs` in the ML views / the task that stores
it. Top-level keys, always present:

    summary · embeddings · clustering · skip_model · sequence_model · forecast

No Django imports — `run_ml_insights` is a pure function of a DataFrame.
"""

from __future__ import annotations

import logging
import time

from . import clustering, embeddings, forecast, sequence_model, skip_model
from .features import build_features, quick_summary

logger = logging.getLogger(__name__)

# (payload key, module, human label)
_MODELS = (
    ("embeddings", embeddings, "Artist/track embeddings (PPMI-SVD)"),
    ("clustering", clustering, "Listening-mode clustering (KMeans)"),
    ("skip_model", skip_model, "Skip prediction (GBM + PyTorch MLP)"),
    ("sequence_model", sequence_model, "Next-artist LSTM (PyTorch)"),
    ("forecast", forecast, "Forecast + anomalies"),
)

# Keys merged into a model's failure payload so the frontend's discriminated unions
# still resolve when the model blows up rather than degrading on its own.
_FAILURE_DEFAULTS = {"sequence_model": {"available": False}}


def _run_model(key: str, module, label: str, df) -> dict:
    started = time.perf_counter()
    try:
        result = module.run(df)
        logger.info("ML %s finished in %.1fs", label, time.perf_counter() - started)
        return result
    except Exception as exc:
        logger.exception("ML %s failed after %.1fs", label, time.perf_counter() - started)
        return {**_FAILURE_DEFAULTS.get(key, {}), "error": str(exc)[:500]}


def run_ml_insights(df) -> dict:
    """Run the full ML suite over a cleaned DataFrame and return the insights payload.

    `df` is the app's cleaned Polars DataFrame (as produced by `processing/stages/clean.py`
    and loaded by `query_engine.load_dataframe`); a pandas frame is also accepted.
    """
    started = time.perf_counter()
    frame = build_features(df)

    insights: dict = {"summary": quick_summary(frame)}
    for key, module, label in _MODELS:
        insights[key] = _run_model(key, module, label, frame)

    logger.info(
        "ML suite completed in %.1fs (%d plays)",
        time.perf_counter() - started,
        insights["summary"]["rows"],
    )
    return insights
