"""Development settings."""

from .base import *  # noqa: F401, F403

DEBUG = True

ALLOWED_HOSTS = ["*"]

# Use console email backend in dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Celery: run tasks eagerly in dev (optional, disable for testing async)
# CELERY_TASK_ALWAYS_EAGER = True
