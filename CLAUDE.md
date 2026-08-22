# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WrapEx (WrappedExtended) — a PaaS where users upload their Spotify Extended Streaming History ZIP export and receive a comprehensive dashboard with visualizations. Monorepo with a Django backend and Next.js frontend.

## Quick Start

```bash
./wrapex dev       # Start Django (:8000) + Next.js (:3050) — auto-installs deps, runs migrations
./wrapex docker    # Full stack via Docker Compose (Postgres, Redis, MinIO, backend, Celery, frontend)
./wrapex migrate   # Shorthand for Django migrations
```

Requires: Python 3.12+, Node 22+, `uv`, `pnpm`. For Docker mode: Docker with Compose.

## Commands

### Backend (run from `backend/`)
```bash
uv sync                                    # Install deps, including the dev group (ruff, pytest)
uv run python manage.py check              # Django system check
uv run python manage.py makemigrations     # Generate migrations
uv run python manage.py migrate            # Apply migrations
uv run python manage.py runserver          # Dev server on :8000
uv run pytest                              # Run tests (~300, no services needed)
uv run ruff check .                        # Lint
uv run ruff format .                       # Format
```

Dev tools live in `[dependency-groups]`, not `[project.optional-dependencies]`, so a
plain `uv sync` installs them — no `--extra dev` needed.

Tests run against `wrapex.settings.test` (in-memory SQLite, Celery eager, S3 and Redis
stubbed), so `uv run pytest` needs nothing running. Fixtures in `api/tests/factories.py`
build synthetic plays and push them **through the real `clean` stage**, which is what keeps
the test schema from drifting from the pipeline's.

### Frontend (run from `frontend/`)
```bash
pnpm install    # Install deps
pnpm dev        # Dev server on :3050
pnpm build      # Production build
pnpm lint       # ESLint (flat config in eslint.config.mjs)
pnpm typecheck  # tsc --noEmit
pnpm test       # Vitest (pure logic only — no rendered components)
```

## Architecture

```
User uploads .zip → Frontend → Django API → S3 (MinIO) → Celery task → Polars pipeline → Dashboard JSON → Frontend renders charts
```

**Backend**: Django 5.1 + DRF + SimpleJWT auth + Celery (Redis broker) + PostgreSQL + S3-compatible storage (MinIO dev, R2 prod)

**Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Recharts + D3.js + SWR

**Data processing**: Polars (not pandas) — 5-stage async pipeline run by Celery workers.

### Backend Apps

- **`api/`** — Models (`UserProfile`, `Upload`, `ProcessedDashboard`, `Payment`, `GlobalBenchmark`, `MLInsight`), DRF serializers, views, URL routing. All API endpoints live under `/api/v1/`. Interactive dashboard features (Time Machine, search, chart builder, what-if, journey, benchmarks, **entity browse/detail, period compare**) live in `views_dashboard_features.py` / `serializers_features.py`; ML insights live in `views_ml.py`.
- **`processing/`** — Celery tasks (`tasks.py`), pipeline orchestrator (`pipeline.py`), and 5 stages in `stages/`:
  1. `ingest.py` — Extract streaming history JSONs from Spotify ZIP, strip PII (`ip_addr`), validate, create LazyFrame
  2. `clean.py` — Parse timestamps, extract date parts, normalize platform names, rename columns
  3. `persist.py` — Write the cleaned DataFrame to S3 as zstd Parquet; returns the key stored on `ProcessedDashboard.parquet_key`
  4. `aggregate.py` — Thin wrapper that delegates to the `stages/analyzers/` package
  5. `export.py` — Save result dict into `ProcessedDashboard.dashboard_data` JSONField
- **`processing/stages/analyzers/`** — Where the stats actually get computed. `__init__.py` holds a registry (`_ANALYZERS`) of `compute_*` functions across 14 modules (`core_stats`, `bar_charts`, `line_charts`, `time_patterns`, `distributions`, `heatmaps`, `scatter_plots`, `geographic`, `advanced`, `spotify_specific`, `nostalgia`, `context`, `wrapped`, `mood_heuristics`); `run_all_analyzers(df)` runs them all and merges the results. **Add new stats by adding a `compute_*` function and registering it here** — not by editing `aggregate.py`.
- **`processing/query_engine.py`** — Loads a user's Parquet from S3 (in-process + Redis cache) and powers the interactive feature endpoints. Re-runs `run_all_analyzers` on filtered subsets for Time Machine / What-If / compare, and serves paginated entity browse + entity detail. **Every endpoint here loads a full DataFrame per request**, so they all carry a DRF throttle scope.
- **`processing/ml/`** — Five models (PPMI+SVD taste embeddings, KMeans session clustering, gradient-boosted skip drivers, LSTM next-artist, Holt-Winters forecast + IsolationForest anomalies) run off the Parquet by a Celery task and cached on `MLInsight`. **`torch` is deliberately not in the backend image** (~1GB+): the sequence model reports `available: False` and the UI marks it unavailable rather than erroring. `features.py` re-derives `session_id` from a 30-minute gap, since `clean.py` doesn't persist one.
- **`storage/`** — boto3 S3 client wrapper (singleton pattern, auto-creates bucket **only when `DEBUG=True`** — production must create the bucket out of band)

### Scheduled work

`CELERY_BEAT_SCHEDULE` in `settings/base.py` runs `compute_global_benchmarks` nightly to
populate `GlobalBenchmark` percentiles. This needs a `celery -A wrapex beat` process
(the `celery-beat` service in both compose files). Until it has run at least once, the
benchmarks endpoint falls back to static values.

### Frontend Structure

- **`src/app/`** — Pages: landing (`/`), auth group (`(auth)/login`, `(auth)/register`), `upload/`, `processing/[jobId]/`, `dashboard/[dashboardId]/`
- **`src/lib/api-client.ts`** — Centralized API client with JWT auto-refresh. All backend calls go through `fetchWithAuth()`.
- **`src/lib/hooks/`** — SWR hooks: `use-upload-status` (polls every 2s), `use-dashboard`, `use-dashboards`, `use-admin-analytics`, plus `use-date-range` (the global filter) and UI hooks (`use-in-view`, `use-animated-counter`)
- **`src/types/`** — TypeScript interfaces matching backend serializers (`api.ts`, `dashboard.ts`, `admin.ts`)
- **`src/components/`** — `ui/` (primitives), `layout/`, `landing/`, `auth/`, `upload/`, `dashboards/` (list), `dashboard/` (the charts — the bulk of the code), `admin/`

### Dashboard routes

`dashboard/[dashboardId]/layout.tsx` is an app shell (sidebar, dashboard switcher, global
date-range control, ⌘K search) wrapping ten routes: Overview (`/`), `story` (the original
25-section scroll, kept verbatim), `artists` · `tracks` · `albums` (each with a
`[name]` detail page), `time`, `habits`, `discovery`, `compare`, `insights`, `lab`.

The `time` / `habits` / `discovery` routes **re-group the existing chart components** —
they import the same ones the story scroll does.

`/shared/[slug]` and `/demo` render **the same application**, read-only. Their layouts mount
`PublicDashboardShell` (no auth; `usePublicDashboard(slug)`), and a single optional
catch-all `[[...path]]` page hands every segment to `PublicDashboardRoute`, which maps it
onto the same view components the owner tree renders one file at a time. The three shells
share `ShellChrome`; what differs is `DashboardContext.basePath` (`/dashboard/{id}` |
`/shared/{slug}` | `/demo`) — **every in-dashboard link must be built from it** via
`navHref` / `libraryHref` / `entityHref`, never from a hard-coded `/dashboard/` — and
`isOwner`, which gates share/export, the dashboard switcher and the ML run/re-run
buttons. The backend mirrors this: the feature endpoints are `AllowAny` and
`resolve_dashboard()` serves a public dashboard to anyone (a private one is 404 to
everyone but its owner, anonymous included); only ML *compute* stays owner-only.

### Django Settings

Split into `wrapex/settings/base.py` (shared), `development.py` (DEBUG=True), `production.py` (SSL, HSTS). All env vars via `python-decouple` (`config()`). Default settings module: `wrapex.settings.development`.

### Upload Flow

Users upload a single `.zip` file (the raw Spotify data export). The ZIP contains `Spotify Extended Streaming History/Streaming_History_Audio_*.json` files nested in a folder. The ingest stage handles this structure, extracting and merging all audio + video JSON files.

### Pipeline Progress

Upload status transitions: `pending_payment` → `pending` → `validating` (10%) → `processing` (20→75%) → `completed` (100%) or `failed`. Users who have already paid (or superusers) skip `pending_payment` entirely. Frontend polls `/uploads/{id}/status/` via SWR with 2s interval.

## Key Conventions

- **API prefix**: All endpoints under `/api/v1/`
- **Auth**: SimpleJWT — 30min access tokens, 7-day refresh tokens with rotation. Rotation blacklists the old token, so the frontend refresh must stay **single-flight** (see `refreshInFlight` in `api-client.ts`) or concurrent requests will log the user out.
- **API errors**: `fetchWithAuth` throws `ApiError` carrying the backend's `detail`/field message. Catch it and show `err.message` rather than a generic string.
- **UUIDs**: `Upload`, `ProcessedDashboard`, and `Payment` use UUID primary keys
- **S3 keys**: uploads are `uploads/{user_id}/{upload_id}/{filename}` — the `upload_id` segment is what keeps repeat uploads of the same filename from clobbering each other. Parquet is `parquet/{user_id}/{upload_id}.parquet`.
- **Upload limit**: `MAX_UPLOAD_SIZE_MB` in `settings/base.py`, enforced in `UploadCreateView` before anything is written to S3
- **Global filter lives in the URL**: the date range is `?from=&to=` on every dashboard route, read through `use-date-range.ts`. It has to stay there — a filtered view is only linkable, shareable and back-button-restorable if it is. Don't reintroduce a store for it. The four routes that legitimately ignore it (`compare`, `lab`, `story`, `insights`) say so with `ScopeIgnoredNotice`, since a visible control that silently does nothing reads as a bug.
- **Entities are keyed by (name, artist)**, not name alone — two different songs are called "Alive". `browse_entities`, `search_entity` and `_entity_rank` all group the same way, or a detail page shows a rank disagreeing with the library it was opened from. Names are URL-encoded path segments (artists contain `/`, `?`, `#`) and looked up by exact match.
- **Ruff**: Python linter/formatter, line-length 99, target Python 3.12. Migrations are exempt from `E501`/`I001`.
- **Theme**: Dark theme with CSS custom properties — colors (`--color-green: #1DB954`, `--color-gold: #F5A623`, `--color-negative: #F87171`), fonts (Syne display, Outfit body). Defined in `frontend/src/app/globals.css` via `@theme`.
- **Focus rings**: one unlayered `:focus-visible` rule in `globals.css` covers the whole app. Unlayered beats *any* Tailwind utility under v4's cascade layers, which is what lets it override the `outline-none` classes already scattered through the components. Don't add per-component focus styles unless you want something richer.
- **Public dashboards**: Toggle `is_public` + set `share_slug` on `ProcessedDashboard` for unauthenticated access. Sharing opens the whole interactive app (Time Machine, library browse, journey, compare, ML reads) to the link's holder — anonymous calls are throttled per IP under the same `dashboard_query` scope. The demo is just a public dashboard whose slug is `NEXT_PUBLIC_DEMO_SLUG` (default `demo`).

## Environment

Copy `.env.example` → `.env` at both root and `backend/` levels. Root `.env` feeds Docker Compose; `backend/.env` feeds `./wrapex dev`. Docker Compose overrides `DB_HOST`/`S3_ENDPOINT_URL` to use service names.

`DJANGO_SECRET_KEY` and the four `STRIPE_*` vars are read with **no default** — Django refuses to start without them. Everything else (`DB_*`, `CELERY_*`, `S3_*`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`) has a local-dev default.

For production env vars and the deployment topology, see `DEPLOYMENT.md`.
