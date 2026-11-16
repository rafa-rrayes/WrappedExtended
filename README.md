# WrappedExtended

Upload your Spotify Extended Streaming History and get an interactive dashboard of your whole listening life, not just the last year.

Spotify Wrapped covers 12 months. Spotify's "Extended streaming history" export covers every play on your account (often a decade), but it arrives as raw JSON. WrappedExtended (WrapEx) turns that export into charts, rankings, and per-artist, per-track, and per-album pages.

<!-- TODO: add a screenshot or GIF of the dashboard here, e.g. docs/screenshot.png -->

## Features

- Upload the `.zip` Spotify gives you; processing runs in the background with live progress.
- Precomputed stats from 14 analyzer modules: overall totals and averages, top artists/tracks/albums, plays over time, hour-of-day and weekday patterns, heatmaps, listening-duration distributions, geographic breakdown by connection country, platform breakdown, skip/shuffle/offline/incognito stats, "nostalgia" and lifecycle views, weekend vs. weekday and late-night listening, a per-year Wrapped-style summary, and a heuristic mood estimate.
- Interactive dashboard (Next.js): Overview, a scrolling "story" view, artists / tracks / albums with detail pages, time, habits, discovery, compare periods, insights, and a lab. A global date-range filter lives in the URL, so filtered views are linkable.
- Interactive tools that re-run the analysis on a subset of your history (time machine, what-if, search, chart builder, journey).
- Optional ML insights (taste embeddings, session clustering, skip drivers, forecast and anomalies), computed on demand. The LSTM next-artist model needs `torch`, which is not installed by default; without it that model reports itself as unavailable.
- Public share links per dashboard (off by default) and a read-only `/demo` route that renders a public dashboard.
- Accounts (username, email and password; JWT auth), a one-time Stripe payment to unlock uploads (optional for self-hosters, see below), and an admin analytics page.

## How to get your data from Spotify

1. Open your Spotify [privacy settings](https://www.spotify.com/account/privacy/) and scroll to **Download your data**.
2. Select **Extended streaming history** (not "Account data", which only covers about a year) and request it.
3. Spotify emails a confirmation link, then a download link. This can take up to roughly 30 days.
4. Download the `.zip` (typically `my_spotify_data.zip`). **Upload that zip as is**; do not unpack it.

The app reads the files named `Streaming_History_Audio_*.json` and `Streaming_History_Video_*.json` inside the zip and ignores everything else. Uploads must be `.zip` files, up to 500 MB (`MAX_UPLOAD_SIZE_MB` in `backend/wrapex/settings/base.py`).

## Requirements

- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node 22+ and [pnpm](https://pnpm.io/)
- Docker (for PostgreSQL, Redis and MinIO; also for the all-in-Docker mode)

## Quickstart

### Option A: everything in Docker

```bash
cp .env.example .env
docker compose up --build
```

Frontend on <http://localhost:3050>, API on <http://localhost:8000/api/v1/>, MinIO console on <http://localhost:9001>. The Compose file runs Postgres, Redis, MinIO, the Django dev server, a Celery worker, Celery beat, and the Next.js dev server. The bucket is created automatically in dev (`DEBUG=True`).

### Option B: local processes with Docker for infrastructure

```bash
./wrapex dev
```

This starts Postgres, Redis and MinIO in Docker, installs dependencies if missing, creates `backend/.env` and `frontend/.env.local` from the examples, runs migrations, and starts Django (:8000) and Next.js (:3050). `./wrapex docker` and `./wrapex migrate` are shortcuts for the Docker stack and migrations.

Or manually:

```bash
docker compose up -d postgres redis minio
cd backend && cp .env.example .env && uv sync
uv run python manage.py migrate
uv run python manage.py runserver            # API on :8000
uv run celery -A wrapex worker -l info       # in another terminal; processes uploads
cd ../frontend && cp .env.example .env.local && pnpm install && pnpm dev   # :3050
```

Register an account in the UI, then upload your zip. Without a Stripe configuration, uploads require an account that is exempt from payment, so create one:

```bash
cd backend && uv run python manage.py createsuperuser
```

Superusers skip payment. The same account can open `/admin/`.

### Tests

```bash
cd backend && uv run pytest                  # no services needed (SQLite, in-memory broker)
cd frontend && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

## Configuration

Copy `.env.example` (Docker) or `backend/.env.example` (local). Production variables are listed in `.env.production.example`. Highlights:

| Variable | Purpose |
|---|---|
| `DJANGO_SECRET_KEY` | Required, no default. |
| `DB_*` | PostgreSQL connection. |
| `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` | Redis. |
| `S3_*` | Any S3-compatible store (MinIO, Cloudflare R2, AWS S3). In production you must create the bucket yourself. |
| `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`, `FRONTEND_URL` | Production host settings. |
| `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | Must be set in the environment but may be empty. |
| `SENTRY_DSN` | Optional, production only. |
| `NEXT_PUBLIC_API_URL` | Frontend: API base URL, e.g. `http://localhost:8000/api/v1`. |
| `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_DEMO_SLUG` | Frontend: canonical URL for metadata, and slug of the public dashboard shown at `/demo` (default `demo`). |

### Payments

Payments are one-time: a user pays once through Stripe Checkout and can then upload without limit. All Stripe configuration comes from the four `STRIPE_*` environment variables above; nothing is hard-coded.

- **No payments (self-hosting):** leave the four variables empty. Checkout will fail for normal users, so make your account a superuser (superusers skip payment) or tick `has_paid` on a user's profile in the Django admin.
- **Test mode:** use `sk_test_...` / `pk_test_...` keys and a test-mode price and webhook secret. The webhook endpoint is `/api/v1/payments/webhook/` and listens for `checkout.session.completed`.
- The frontend still contains pricing and payment pages; there is no switch to hide them yet.

## Self-hosting

`docker-compose.dokploy.yml` is a production backend stack (Postgres, Redis, MinIO, gunicorn, Celery worker, Celery beat, all env-driven) and `DEPLOYMENT.md` walks through it, with the frontend on Vercel. `backend/Procfile` and the Dockerfiles in `backend/` and `frontend/` are there if you prefer another platform. Run exactly one Celery beat process; it computes nightly global benchmarks.

## What happens to your data

This is what the code does; a hosted instance may add its own policy on top (see `frontend/src/app/privacy/page.tsx`).

- The uploaded zip is stored in S3-compatible storage under `uploads/{user_id}/{upload_id}/`.
- During ingest the `ip_addr` field is dropped from every record. Other fields (track, artist, album, timestamps, platform, connection country, skip/shuffle/offline/incognito flags, and so on) are kept.
- A cleaned copy of your history is written to storage as a Parquet file (`parquet/{user_id}/{upload_id}.parquet`), and the computed stats are stored as JSON in the database. The interactive features read the Parquet file.
- **The original zip is not deleted after processing.** It stays until you delete the upload (`DELETE` on the upload, which removes the zip) or your account. Deleting the account removes uploads, Parquet files and database rows. Note that the in-app privacy page says zips are deleted after processing; the code does not currently do that.
- Dashboards are private unless you turn on sharing, which exposes the whole interactive dashboard to anyone with the link.
- There is no automatic retention or expiry job.

If you self-host, you hold the data: put the bucket and database behind your own access controls and back them up as you see fit.

## Architecture

```
Browser (Next.js) -> Django REST API -> S3/MinIO -> Celery worker -> Polars pipeline -> Postgres (JSON) + Parquet in S3
```

- `backend/`: Django 5.1 + DRF + SimpleJWT. `api/` (models, views, routes), `processing/` (5-stage pipeline: ingest, clean, persist, aggregate, export; analyzers in `stages/analyzers/`; `query_engine.py` for interactive queries; `ml/` for ML insights), `storage/` (boto3 wrapper), `wrapex/` (settings and Celery app).
- `frontend/`: Next.js 15 (App Router), TypeScript, Tailwind v4, Recharts, D3, SWR.
- `scripts/ml/`: standalone ML experiments over a raw export, no database needed (see its README).
- `CLAUDE.md` has a more detailed tour aimed at contributors and coding agents.

## Status and limitations

- Early, single-maintainer project. The backend has an automated test suite (synthetic data only); the frontend tests cover pure logic, not rendered components.
- Only the Extended Streaming History format is supported, not the basic account-data export.
- Everything is computed over the whole export in memory; very large exports take longer and the worker has a 15-minute task limit.
- Mood and some other insights are heuristics, not Spotify audio features.
- No bundled screenshots or sample dataset: you need your own export, or a dashboard marked public to power `/demo`.

## License

[MIT](LICENSE)
