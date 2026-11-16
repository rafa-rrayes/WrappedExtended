# WrapEx Deployment Guide

This describes one working topology (the one the author uses). Swap the pieces for
your own host; `.env.production.example` lists every variable. The domains below
(`example.com`) are placeholders.

Topology:

| Piece | Where | Notes |
|---|---|---|
| Backend + Celery worker + beat | **Dokploy** on your own server | `docker-compose.dokploy.yml` |
| Postgres, Redis, MinIO | Dokploy, internal-only | No published ports |
| Frontend | **Vercel** | `frontend/`, deployed from this repo |
| Ingress / TLS | Cloudflare Tunnel → Traefik | Managed by Dokploy Domains |

`api.example.com` → the `backend` service on port 8000.
`app.example.com` → Vercel, which reaches the API via `NEXT_PUBLIC_API_URL`.

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
   ALLOWED_HOSTS=api.example.com
   CORS_ALLOWED_ORIGINS=https://app.example.com
   CSRF_TRUSTED_ORIGINS=https://app.example.com,https://api.example.com
   FRONTEND_URL=https://app.example.com
   STRIPE_SECRET_KEY=<sk_... or blank, see Payments>
   STRIPE_PUBLISHABLE_KEY=<pk_... or blank>
   STRIPE_PRICE_ID=<price_... or blank>
   STRIPE_WEBHOOK_SECRET=<whsec_... or blank>
   ```

   Generate a secret key with:

   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

4. Under **Domains**, map `api.example.com` → service `backend`, port `8000`.

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
   - `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1`
4. Deploy — Vercel handles build and CDN.

---

## 3. Payments (Stripe) and the webhook

Payments are optional for a self-hoster. The four `STRIPE_*` variables must be
*present* in the environment (Django reads them without a default) but may be empty.

- **Payments off:** leave them empty. Checkout will fail for ordinary accounts, so
  give accounts a free pass instead: superusers skip payment entirely
  (`python manage.py createsuperuser`), and any user can be unlocked by ticking
  `has_paid` on their profile in the Django admin (`/admin/`).
- **Test mode:** use `sk_test_` / `pk_test_` keys and a test-mode price and webhook
  secret from the Stripe dashboard (or `stripe listen --forward-to` for local work).
- **Live:** use live keys, and register the webhook as below.

The model is a single one-time payment that unlocks unlimited uploads for the user.

Point the Stripe webhook at `https://api.example.com/api/v1/payments/webhook/`
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
- [ ] Domain mapped: `api.example.com` → `backend:8000`
- [ ] `SECURE_SSL_REDIRECT=False` for the tunnel topology
- [ ] `celery-beat` running at exactly one replica
- [ ] Stripe webhook registered and signing secret set (or payments left blank and users unlocked via admin)
- [ ] Vercel deployed with `NEXT_PUBLIC_API_URL`
- [ ] `GET /api/v1/health/` returns 200 through the domain
