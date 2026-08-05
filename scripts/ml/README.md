# ML / DL insights pipeline

Standalone machine-learning + deep-learning analysis of a Spotify Extended
Streaming History export. Reads the raw `.zip` directly (PII-stripped), runs
five model families, and writes visuals + `insights.json` + a self-contained
`report.html`. No Django / MinIO / DB dependency.

## Run

```bash
uv run --with pandas --with numpy --with scipy --with scikit-learn \
       --with matplotlib --with statsmodels --with torch --with umap-learn --with plotly \
       python scripts/ml/run_all.py ".local-data/my_spotify_data 3.zip"

open scripts/ml/outputs/report.html          # full report (links to the interactive map)
open scripts/ml/outputs/taste_map.html       # interactive Plotly taste map
```

The taste map is projected with **UMAP** (cosine metric); if `umap-learn` is
missing the pipeline falls back to t-SNE automatically. An interactive Plotly
version (`taste_map.html`, hover for names) is generated alongside the PNG.

Full run ≈ 90s on CPU (first run also downloads the wheels above).

## Models

| Module | Technique | Output |
|--------|-----------|--------|
| `embeddings.py` | PPMI co-occurrence + Truncated SVD (word2vec-equivalent, Levy & Goldberg 2014) | taste map, scenes, similar-artist graph |
| `clustering.py` | Session feature engineering + KMeans | named listening modes |
| `skip_model.py` | GradientBoosting **+ PyTorch MLP** + permutation importance | skip AUC + drivers |
| `sequence_model.py` | **PyTorch LSTM** language model over artist sequences | next-artist top-1/top-5 |
| `forecast.py` | Holt-Winters + IsolationForest | 6-month forecast, anomaly days |

> Note: artist embeddings use PPMI+SVD rather than gensim's `Word2Vec` because
> gensim has no Python 3.13 wheel and its Cython source fails to compile against
> CPython ≥3.12 (`ma_version_tag` removed from `PyDictObject`). PPMI+SVD
> factorizes the same matrix skip-gram implicitly does, with no native build.

## Outputs (`scripts/ml/outputs/`)

`taste_map.png` · `listening_modes.png` · `skip_drivers.png` ·
`sequence_model.png` · `forecast.png` · `insights.json` · `report.html`
