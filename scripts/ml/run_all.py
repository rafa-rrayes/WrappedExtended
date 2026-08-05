"""Run the full ML/DL insight pipeline on a Spotify export ZIP.

Usage:
    uv run --with pandas --with numpy --with scikit-learn --with gensim \\
           --with matplotlib --with statsmodels --with torch \\
           python scripts/ml/run_all.py ".local-data/my_spotify_data 3.zip"

Outputs land in scripts/ml/outputs/: taste_map.png, listening_modes.png,
skip_drivers.png, sequence_model.png, forecast.png, insights.json, report.html
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import load
import embeddings
import clustering
import skip_model
import sequence_model
import forecast
import report


def _step(name, fn, *args):
    t0 = time.time()
    print(f"\n▶ {name} …", flush=True)
    try:
        out = fn(*args)
        print(f"  ✓ {name} done in {time.time()-t0:.1f}s", flush=True)
        return out
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"  ✗ {name} FAILED: {e}", flush=True)
        return {"error": str(e)}


def main():
    zip_path = sys.argv[1] if len(sys.argv) > 1 else ".local-data/my_spotify_data 3.zip"
    outdir = HERE / "outputs"
    outdir.mkdir(exist_ok=True)

    print(f"Loading {zip_path} …", flush=True)
    df = load.load_history(zip_path)
    summary = load.quick_summary(df)
    print(f"  {summary['rows']:,} plays · {summary['sessions']:,} sessions · "
          f"{summary['unique_artists']:,} artists", flush=True)

    insights = {"summary": summary}
    insights["embeddings"] = _step("Artist/track embeddings (PPMI-SVD)", embeddings.run, df, outdir)
    insights["clustering"] = _step("Listening-mode clustering (KMeans)", clustering.run, df, outdir)
    insights["skip_model"] = _step("Skip prediction (GBM + PyTorch MLP)", skip_model.run, df, outdir)
    insights["sequence_model"] = _step("Next-artist LSTM (PyTorch)", sequence_model.run, df, outdir)
    insights["forecast"] = _step("Forecast + anomalies", forecast.run, df, outdir)

    (outdir / "insights.json").write_text(json.dumps(insights, indent=2, default=str))
    report_path = _step("HTML report", report.build, insights, outdir)

    print("\n" + "=" * 60)
    print("ALL DONE — outputs in", outdir)
    for p in sorted(outdir.glob("*")):
        print(f"  {p.name:24s} {p.stat().st_size/1024:8.1f} KB")
    print("=" * 60)
    if isinstance(report_path, Path):
        print("Open the report:", report_path)


if __name__ == "__main__":
    main()
