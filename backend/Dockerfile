FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies
COPY pyproject.toml uv.lock ./
RUN uv sync --no-dev --no-install-project

# Copy project
COPY . .

# Collect static files at build time with whitenoise manifest generation
RUN DJANGO_SETTINGS_MODULE=wrapex.settings.production \
    DJANGO_SECRET_KEY=build-placeholder \
    ALLOWED_HOSTS=* CSRF_TRUSTED_ORIGINS=https://placeholder.example.com \
    STRIPE_SECRET_KEY=x STRIPE_PUBLISHABLE_KEY=x STRIPE_PRICE_ID=x STRIPE_WEBHOOK_SECRET=x \
    uv run python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["sh", "-c", "uv run gunicorn wrapex.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]
