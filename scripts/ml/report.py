"""Render a self-contained HTML report embedding the PNGs and key insights."""

from __future__ import annotations

import base64
import json
from pathlib import Path


def _img(path: Path) -> str:
    if not path.exists():
        return "<p style='color:#888'>(not generated)</p>"
    b64 = base64.b64encode(path.read_bytes()).decode()
    return f"<img src='data:image/png;base64,{b64}' style='width:100%;border-radius:12px'/>"


def build(insights: dict, outdir: Path) -> Path:
    s = insights["summary"]
    emb = insights["embeddings"]
    clu = insights["clustering"]
    skip = insights["skip_model"]
    seq = insights.get("sequence_model", {})
    fc = insights["forecast"]

    scenes_rows = "".join(
        f"<tr><td>{i+1}</td><td>{sc['hours']:.0f}h</td><td>{sc['size']}</td>"
        f"<td>{', '.join(sc['top_artists'][:6])}</td></tr>"
        for i, sc in enumerate(emb["scenes"][:8])
    )
    modes_rows = "".join(
        f"<tr><td><b>{m['name']}</b></td><td>{m['total_hours']:.0f}h</td>"
        f"<td>{m['pct_sessions']}%</td><td>{m['avg_plays']}</td>"
        f"<td>{m['skip_rate']:.0%}</td><td>{m['shuffle_rate']:.0%}</td>"
        f"<td>{m['median_start_hour']:.0f}:00</td></tr>"
        for m in clu["modes"]
    )
    drivers_rows = "".join(
        f"<tr><td>{d['feature']}</td><td>{d['importance']:.3f}</td></tr>"
        for d in skip["drivers"][:8]
    )
    sim_rows = "".join(
        f"<tr><td><b>{a}</b></td><td>{', '.join(n['artist'] for n in neigh[:5])}</td></tr>"
        for a, neigh in list(emb["similar_artists"].items())[:10]
    )
    seq_samples = ""
    if seq.get("available"):
        seq_samples = "".join(
            f"<tr><td><b>{x['after']}</b></td><td>{' · '.join(x['predicts'])}</td></tr>"
            for x in seq["sample_predictions"]
        )
    anom_rows = "".join(
        f"<tr><td>{a['date']}</td><td>{a['hours']}h</td><td>{a['plays']}</td>"
        f"<td>{a['unique_artists']}</td></tr>"
        for a in fc["anomalous_days"][:8]
    )
    fc_rows = "".join(
        f"<tr><td>{f['month']}</td><td>{f['hours']}h</td></tr>"
        for f in fc["forecast_next_6_months"]
    )

    seq_card = ""
    if seq.get("available"):
        seq_card = f"""
        <div class="card">
          <h2>🔮 Next-artist prediction (PyTorch LSTM)</h2>
          <p>Top-1 <b>{seq['next_artist_top1']:.1%}</b> · Top-5 <b>{seq['next_artist_top5']:.1%}</b>
          · baseline {seq['baseline_top1']:.1%} (<b>{seq['lift_over_baseline']}×</b> lift)</p>
          {_img(outdir / "sequence_model.png")}
          <table><tr><th>If you just played…</th><th>the model expects next</th></tr>{seq_samples}</table>
        </div>"""

    mlp_auc = skip["pytorch_mlp"].get("auc", "n/a")
    html = f"""<!doctype html><html><head><meta charset="utf-8">
<title>WrapEx · ML Insights</title>
<style>
  body {{ background:#0b0b0d; color:#eee; font-family:-apple-system,Segoe UI,Roboto,sans-serif;
         max-width:1100px; margin:0 auto; padding:32px; }}
  h1 {{ font-size:34px; }} h2 {{ color:#1DB954; margin-top:0; }}
  .sub {{ color:#aaa; margin-top:-12px; }}
  .grid {{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:24px 0; }}
  .kpi {{ background:#15151a; border-radius:12px; padding:16px; }}
  .kpi .n {{ font-size:26px; font-weight:700; color:#1ed760; }}
  .kpi .l {{ color:#aaa; font-size:13px; }}
  .card {{ background:#15151a; border-radius:16px; padding:22px; margin:18px 0; }}
  table {{ width:100%; border-collapse:collapse; margin-top:12px; font-size:14px; }}
  th,td {{ text-align:left; padding:7px 10px; border-bottom:1px solid #262630; }}
  th {{ color:#888; font-weight:600; }}
</style></head><body>
<h1>🎧 Machine-Learning Insights</h1>
<p class="sub">Models trained on your Spotify Extended Streaming History · {s['rows']:,} plays · {s['date_min'][:10]} → {s['date_max'][:10]}</p>

<div class="grid">
  <div class="kpi"><div class="n">{s['total_hours']:,.0f}</div><div class="l">hours listened</div></div>
  <div class="kpi"><div class="n">{s['unique_artists']:,}</div><div class="l">unique artists</div></div>
  <div class="kpi"><div class="n">{s['sessions']:,}</div><div class="l">sessions</div></div>
  <div class="kpi"><div class="n">{s['skip_rate']:.0%}</div><div class="l">skip rate</div></div>
</div>

<div class="card">
  <h2>🗺️ Taste map — artist embeddings</h2>
  <p>{emb['model']['artists_embedded']:,} artists embedded into {emb['model']['vector_size']}-D space from {emb['model']['sessions_used']:,} sessions ({emb.get('method','')}), projected with {emb.get('projection','t-SNE')}.</p>
  <p><a href="taste_map.html" style="color:#1ed760;font-weight:600">🔗 Open the interactive 3-D map</a> — drag to rotate, scroll to zoom, hover any point for the artist.</p>
  {_img(outdir / "taste_map.png")}
  <h3>Auto-discovered scenes</h3>
  <table><tr><th>#</th><th>Hours</th><th>Artists</th><th>Top artists</th></tr>{scenes_rows}</table>
  <h3>Your personal "fans also play" graph</h3>
  <table><tr><th>Artist</th><th>You play them alongside…</th></tr>{sim_rows}</table>
</div>

<div class="card">
  <h2>🎚️ Listening modes</h2>
  {_img(outdir / "listening_modes.png")}
  <table><tr><th>Mode</th><th>Hours</th><th>% sessions</th><th>plays/session</th><th>skip</th><th>shuffle</th><th>typical start</th></tr>{modes_rows}</table>
</div>

<div class="card">
  <h2>⏭️ What drives your skips</h2>
  <p>GradientBoosting AUC <b>{skip['gradient_boosting_auc']}</b> · PyTorch MLP AUC <b>{mlp_auc}</b> · base skip rate {skip['baseline_skip_rate']:.1%}</p>
  {_img(outdir / "skip_drivers.png")}
  <table><tr><th>Driver</th><th>Importance</th></tr>{drivers_rows}</table>
</div>

{seq_card}

<div class="card">
  <h2>📈 Forecast & anomalies</h2>
  {_img(outdir / "forecast.png")}
  <div style="display:flex; gap:30px; flex-wrap:wrap">
    <div><h3>Next 6 months</h3><table><tr><th>Month</th><th>Forecast</th></tr>{fc_rows}</table></div>
    <div><h3>Most unusual days</h3><table><tr><th>Date</th><th>Hours</th><th>Plays</th><th>Artists</th></tr>{anom_rows}</table></div>
  </div>
</div>

<p style="color:#666;font-size:12px;margin-top:30px">Generated by scripts/ml · models: Word2Vec, KMeans/GMM, GradientBoosting, PyTorch MLP + LSTM, Holt-Winters, IsolationForest.</p>
</body></html>"""

    out = outdir / "report.html"
    out.write_text(html)
    return out
