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
uv sync                                    # Install/update Python deps
uv run python manage.py check              # Django system check
uv run python manage.py makemigrations     # Generate migrations
uv run python manage.py migrate            # Apply migrations
uv run python manage.py runserver          # Dev server on :8000
uv run pytest                              # Run tests
uv run pytest api/tests/test_foo.py::test_bar  # Single test
uv run ruff check .                        # Lint
uv run ruff format .                       # Format
```

### Frontend (run from `frontend/`)
```bash
pnpm install    # Install deps
pnpm dev        # Dev server on :3050
pnpm build      # Production build
pnpm lint       # Lint
npx tsc --noEmit  # Type check without build
```

## Architecture

```
User uploads .zip → Frontend → Django API → S3 (MinIO) → Celery task → Polars pipeline → Dashboard JSON → Frontend renders charts
```

**Backend**: Django 5.1 + DRF + SimpleJWT auth + Celery (Redis broker) + PostgreSQL + S3-compatible storage (MinIO dev, R2 prod)

**Frontend**: Next.js 15 (App Router) + TypeScript + Tailwind CSS v4 + Recharts + D3.js + SWR

**Data processing**: Polars (not pandas) — 4-stage async pipeline run by Celery workers.

### Backend Apps

- **`api/`** — Models (`UserProfile`, `Upload`, `ProcessedDashboard`), DRF serializers, views, URL routing. All API endpoints live under `/api/v1/`.
- **`processing/`** — Celery task (`tasks.py`), pipeline orchestrator (`pipeline.py`), and 4 stages in `stages/`:
  1. `ingest.py` — Extract streaming history JSONs from Spotify ZIP, strip PII (`ip_addr`), validate, create LazyFrame
  2. `clean.py` — Parse timestamps, extract date parts, normalize platform names, rename columns
  3. `aggregate.py` — Compute all stats (top artists/tracks/albums, time distributions, habits) into a single dict
  4. `export.py` — Save result dict into `ProcessedDashboard.dashboard_data` JSONField
- **`storage/`** — boto3 S3 client wrapper (singleton pattern, auto-creates bucket in dev)

### Frontend Structure

- **`src/app/`** — Pages: landing (`/`), auth group (`(auth)/login`, `(auth)/register`), `upload/`, `processing/[jobId]/`, `dashboard/[dashboardId]/`
- **`src/lib/api-client.ts`** — Centralized API client with JWT auto-refresh. All backend calls go through `fetchWithAuth()`.
- **`src/lib/hooks/`** — SWR hooks: `useUploadStatus` (polls every 2s), `useDashboard`
- **`src/types/`** — TypeScript interfaces matching backend serializers (`api.ts`, `dashboard.ts`)
- **`src/components/`** — `ui/` (card, button, badge, progress, skeleton), `layout/` (side-nav, header, footer), `dashboard/` (hero-stats, top-artists-chart, top-tracks-table), `upload/` (dropzone)

### Django Settings

Split into `wrapex/settings/base.py` (shared), `development.py` (DEBUG=True), `production.py` (SSL, HSTS). All env vars via `python-decouple` (`config()`). Default settings module: `wrapex.settings.development`.

### Upload Flow

Users upload a single `.zip` file (the raw Spotify data export). The ZIP contains `Spotify Extended Streaming History/Streaming_History_Audio_*.json` files nested in a folder. The ingest stage handles this structure, extracting and merging all audio + video JSON files.

### Pipeline Progress

Upload status transitions: `pending` → `validating` (10%) → `processing` (25→75%) → `completed` (100%) or `failed`. Frontend polls `/uploads/{id}/status/` via SWR with 2s interval.

## Key Conventions

- **API prefix**: All endpoints under `/api/v1/`
- **Auth**: SimpleJWT — 30min access tokens, 7-day refresh tokens with rotation
- **UUIDs**: `Upload` and `ProcessedDashboard` use UUID primary keys
- **Ruff**: Python linter/formatter, line-length 99, target Python 3.12
- **Theme**: Dark theme with CSS custom properties — colors (`--color-green: #1DB954`, `--color-gold: #F5A623`), fonts (Syne display, Outfit body). Defined in `frontend/src/app/globals.css` via `@theme`.
- **Public dashboards**: Toggle `is_public` + set `share_slug` on `ProcessedDashboard` for unauthenticated access

## Environment

Copy `.env.example` → `.env` at both root and `backend/` levels. Key vars: `DJANGO_SECRET_KEY`, `DB_*`, `CELERY_BROKER_URL`, `S3_*`, `CORS_ALLOWED_ORIGINS`. Docker Compose overrides DB_HOST/S3_ENDPOINT_URL to use service names.
