"""Offline-grade ML insights over a user's cleaned listening history.

Five model families, ported from the standalone `scripts/ml/` suite and stripped of all
plotting so they emit JSON the frontend renders natively:

| module            | technique                                          |
|-------------------|----------------------------------------------------|
| `embeddings`      | PPMI co-occurrence + Truncated SVD (word2vec-equiv) |
| `clustering`      | session feature engineering + KMeans                 |
| `skip_model`      | GradientBoosting + PyTorch MLP + permutation import. |
| `sequence_model`  | PyTorch LSTM over artist sequences                   |
| `forecast`        | Holt-Winters + IsolationForest                       |

torch and umap-learn are intentionally absent from the default install (they would add
>1GB to the web/worker image), so the two deep-learning halves report
`available: false` and the taste map projects with t-SNE instead of UMAP. Install the
`ml-deep` extra on a dedicated worker to light them up.

Entry point: `run_ml_insights(df)`.
"""

from .features import build_features, quick_summary
from .runner import run_ml_insights

__all__ = ["build_features", "quick_summary", "run_ml_insights"]
