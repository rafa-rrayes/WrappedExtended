# WrapEx Deployment Guide

Deploy WrapEx to **Railway** (backend + Celery) + **Vercel** (frontend) + **Cloudflare R2** (file storage).

## Prerequisites

- Railway account with a project created
- Vercel account linked to your GitHub repo
- Cloudflare account with R2 enabled

---

## 1. Cloudflare R2 (File Storage)

1. Go to **Cloudflare Dashboard → R2 → Create bucket** → name it `wrapex-uploads`
2. Go to **R2 → Manage R2 API Tokens → Create API token**
   - Permissions: **Object Read & Write**
   - Specify bucket: `wrapex-uploads`
3. Copy the **Access Key ID**, **Secret Access Key**, and **Endpoint URL**
4. Set these as `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_ENDPOINT_URL` in Railway (step 2)

> R2 uses `S3_REGION=auto` — do not change this.

---

## 2. Railway (Backend + Worker)

### Add plugins

1. In your Railway project, add **PostgreSQL** and **Redis** plugins
2. Note the connection details from each plugin's **Variables** tab

### Backend service (web)

1. **New Service → GitHub Repo** → select this repo
2. Settings:
   - **Root Directory**: `backend`
   - **Build Command**: _(auto-detected from Dockerfile)_
   - **Start Command**: leave blank (uses Dockerfile CMD or Procfile `web` entry)
3. Add environment variables (see `.env.production.example`):
   - `DJANGO_SETTINGS_MODULE=wrapex.settings.production`
   - `DJANGO_SECRET_KEY` — generate one: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
   - `DB_*` — from PostgreSQL plugin variables
   - `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` — from Redis plugin variables
   - `S3_*` — from R2 setup above
   - `ALLOWED_HOSTS` — e.g. `api.yourdomain.com,.railway.app`
   - `CORS_ALLOWED_ORIGINS` — e.g. `https://yourdomain.com`
   - `CSRF_TRUSTED_ORIGINS` — e.g. `https://yourdomain.com`
4. Railway auto-detects the Dockerfile and exposes `$PORT`

### Worker service (Celery)

1. **New Service → GitHub Repo** → same repo
2. Settings:
   - **Root Directory**: `backend`
   - **Start Command**: `uv run celery -A wrapex worker --loglevel=info --concurrency=2`
3. Copy all the same env vars from the backend service
4. **No public port needed** — the worker only consumes from Redis

### Run migrations

After the first deploy, open the backend service's **shell** and run:

```bash
uv run python manage.py migrate
```

### Health check

Railway can probe `GET /api/v1/health/` (already exists). Set it in:
**Settings → Healthcheck Path**: `/api/v1/health/`

---

## 3. Vercel (Frontend)

1. **Import Project** → select this repo
2. Settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL` — e.g. `https://api.yourdomain.com/api/v1`
4. Deploy — Vercel handles build and CDN automatically

---

## 4. Custom Domains

### Backend (Railway)

1. **Backend service → Settings → Networking → Custom Domain**
2. Add `api.yourdomain.com`
3. Create a **CNAME** DNS record pointing to the Railway-provided hostname
4. Update `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to include the new domain

### Frontend (Vercel)

1. **Project → Settings → Domains**
2. Add `yourdomain.com` and `www.yourdomain.com`
3. Vercel will prompt for the required DNS records

---

## Checklist

- [ ] R2 bucket created with API token
- [ ] Railway: PostgreSQL + Redis plugins added
- [ ] Railway: Backend service deployed with all env vars
- [ ] Railway: Worker service deployed with same env vars
- [ ] Migrations run on first deploy
- [ ] Vercel: Frontend deployed with `NEXT_PUBLIC_API_URL`
- [ ] Custom domains configured with DNS records
- [ ] HTTPS working end-to-end (Railway + Vercel handle TLS automatically)
