FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install dependencies
COPY pyproject.toml .
RUN uv sync --no-dev --no-install-project

# Copy project
COPY . .

# Collect static files
RUN uv run python manage.py collectstatic --noinput 2>/dev/null || true

EXPOSE 8000

CMD ["sh", "-c", "uv run gunicorn wrapex.wsgi:application --bind 0.0.0.0:${PORT:-8000} --workers 3"]
