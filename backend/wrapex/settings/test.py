"""Settings for the automated test suite.

`uv run pytest` points here (see `[tool.pytest.ini_options]` in pyproject.toml). Every
external service the app talks to in production is replaced with an in-process
equivalent, so the suite runs on a laptop or in CI with **nothing else running**:

    Postgres → SQLite in-memory        Redis (cache/throttle) → locmem
    Redis (broker) → in-memory kombu   S3/MinIO → never reached (see conftest.py)

Nothing here is imported by the app at runtime; production behaviour is unaffected.
"""

import os

# base.py reads these with no default and Django refuses to start without them. Set them
# before importing base so the suite never depends on a developer's local .env file.
os.environ.setdefault("DJANGO_SECRET_KEY", "test-only-secret-key")
for _var in (
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET",
):
    os.environ.setdefault(_var, f"sk_test_{_var.lower()}")

from .base import *  # noqa: E402, F403

# DEBUG=False also keeps storage.client from trying to auto-create an S3 bucket.
DEBUG = False
ALLOWED_HOSTS = ["testserver", "localhost"]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "TEST": {"NAME": ":memory:"},
    }
}

# DRF throttling stores counters in the default cache; locmem keeps that in-process.
# conftest.py clears it between tests so throttle state cannot leak across them.
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "wrapex-tests",
    }
}

# No broker. Tasks are never really enqueued — the tests that exercise an enqueue patch
# `.delay` — but an unpatched call must not reach out to Redis either.
CELERY_BROKER_URL = "memory://"
CELERY_RESULT_BACKEND = "cache+memory://"
CELERY_TASK_ALWAYS_EAGER = False

# Deliberately unroutable: any accidental boto3 call fails fast instead of finding a
# real MinIO on localhost:9000.
S3_ENDPOINT_URL = "http://s3.invalid"
S3_ACCESS_KEY = "test"
S3_SECRET_KEY = "test"
S3_BUCKET_NAME = "test-bucket"

# Pinned so a developer's DASHBOARD_QUERY_THROTTLE_RATE cannot make unrelated tests
# flaky. The throttle test lowers the rate itself (see test_api_entities.py).
REST_FRAMEWORK = {  # noqa: F405
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_RATES": {
        "anon": "1000/minute",
        "user": "1000/minute",
        "dashboard_query": "1000/minute",
    },
}

PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

# Analyzers log an exception per failure when handed a degenerate frame, which several
# tests do on purpose. Route it all to a null handler to keep the output readable.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"null": {"class": "logging.NullHandler"}},
    "root": {"handlers": ["null"], "level": "CRITICAL"},
}
