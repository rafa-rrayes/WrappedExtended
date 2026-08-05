# WrapEx Deployment Guide

Current topology:

| Piece | Where | Notes |
|---|---|---|
| Backend + Celery worker + beat | **Dokploy** on RRserver | `docker-compose.dokploy.yml` |
| Postgres, Redis, MinIO | Dokploy, internal-only | No published ports |
| Frontend | **Vercel** | `frontend/`, deployed from this repo |
| Ingress / TLS | Cloudflare Tunnel → Traefik | Managed by Dokploy Domains |

`api.wrappedextended.com` → the `backend` service on port 8000.
`wrappedextended.com` → Vercel, which reaches the API via `NEXT_PUBLIC_API_URL`.

> An earlier revision of this file described a Railway deployment. That is no longer
> how WrapEx runs; the Railway-specific steps have been removed.

---

## 1. Backend stack (Dokploy)

1. In Dokploy, create a **Compose** application pointed at this repo.
2. Set the compose file to `docker-compose.dokploy.yml`.
3. Fill in the **Environment** tab — every value is interpolated as `${VAR}`:

   ```
   DJANGO_SETTINGS_MODULE=wrapex.settings.production
   DJANGO_SECRET_KEY=<generate, see below>
   DB_NAME=wrapex
   DB_USER=wrapex
   DB_PASSWORD=<strong password>
   DB_HOST=postgres
   DB_PORT=5432
   CELERY_BROKER_URL=redis://redis:6379/0
   CELERY_RESULT_BACKEND=redis://redis:6379/0
   S3_ENDPOINT_URL=http://minio:9000
   S3_ACCESS_KEY=<MINIO_ROOT_USER>
   S3_SECRET_KEY=<MINIO_ROOT_PASSWORD>
   S3_BUCKET_NAME=wrapex-uploads
   S3_REGION=us-east-1
   MINIO_ROOT_USER=<user>
   MINIO_ROOT_PASSWORD=<password>
   SECURE_SSL_REDIRECT=False
   ALLOWED_HOSTS=api.wrappedextended.com
   CORS_ALLOWED_ORIGINS=https://wrappedextended.com
   CSRF_TRUSTED_ORIGINS=https://wrappedextended.com,https://api.wrappedextended.com
   FRONTEND_URL=https://wrappedextended.com
   STRIPE_SECRET_KEY=sk_live_...
   STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

   Generate a secret key with:

   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

4. Under **Domains**, map `api.wrappedextended.com` → service `backend`, port `8000`.

### Why `SECURE_SSL_REDIRECT=False`

TLS terminates at the edge (Cloudflare Tunnel → Traefik). Traefik rewrites
`X-Forwarded-Proto` to the scheme *it* received (`http`), so Django never sees the
original `https` and would redirect to itself forever. The edge enforces HTTPS
instead. Set this to `True` only if you put Django behind a proxy that forwards the
original scheme faithfully.

### Services in the stack

- `backend` — migrates on boot, then gunicorn with 3 workers
- `celery-worker` — consumes the upload processing queue
- `celery-beat` — fires `CELERY_BEAT_SCHEDULE` (nightly benchmark percentiles).
  Keep this at **one replica**; two beats double-fire the schedule.
- `minio-init` — one-shot bucket creation. Needed because `storage/client.py` only
  auto-creates the bucket when `DEBUG=True`, and production runs `DEBUG=False`.

Migrations run automatically as part of the `backend` service command, so there is
no separate migration step.

### Health check

`GET /api/v1/health/` is exempt from the SSL redirect and is what the compose
healthcheck probes.

---

## 2. Frontend (Vercel)

1. **Import Project** → select this repo
2. Settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
3. Environment variables:
   - `NEXT_PUBLIC_API_URL=https://api.wrappedextended.com/api/v1`
4. Deploy — Vercel handles build and CDN.

---

## 3. Stripe webhook

Point the Stripe webhook at `https://api.wrappedextended.com/api/v1/payments/webhook/`
and subscribe to `checkout.session.completed`. Put the signing secret in
`STRIPE_WEBHOOK_SECRET`. The handler is idempotent — a replayed event for an
already-completed payment is a no-op.

---

## 4. Object storage

The stack ships MinIO internally. To use Cloudflare R2 instead, drop the `minio`
and `minio-init` services and point the `S3_*` vars at R2:

- `S3_ENDPOINT_URL` — your R2 S3 API endpoint
- `S3_REGION=auto`
- Token permissions: **Object Read & Write**, scoped to the bucket

Create the bucket yourself; nothing auto-creates it when `DEBUG=False`.

---

## Checklist

- [ ] Dokploy compose app created against `docker-compose.dokploy.yml`
- [ ] All environment variables set in the Dokploy Environment tab
- [ ] Domain mapped: `api.wrappedextended.com` → `backend:8000`
- [ ] `SECURE_SSL_REDIRECT=False` for the tunnel topology
- [ ] `celery-beat` running at exactly one replica
- [ ] Stripe webhook registered and signing secret set
- [ ] Vercel deployed with `NEXT_PUBLIC_API_URL`
- [ ] `GET /api/v1/health/` returns 200 through the domain
