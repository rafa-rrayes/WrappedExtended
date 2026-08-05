"""Production settings."""

import sentry_sdk
from decouple import Csv, config

from .base import *  # noqa: F401, F403

# Sentry
SENTRY_DSN = config("SENTRY_DSN", default="")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
    )

DEBUG = False

ALLOWED_HOSTS = config("ALLOWED_HOSTS", cast=Csv())

# Security
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
# Behind a TLS-terminating edge (Cloudflare Tunnel -> Traefik), Traefik rewrites
# X-Forwarded-Proto to the scheme *it* received (http), so Django can never see the
# original https and would redirect to itself forever. Disable the app-level redirect
# in that topology and let the edge enforce HTTPS instead.
SECURE_SSL_REDIRECT = config("SECURE_SSL_REDIRECT", default=True, cast=bool)
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
CSRF_TRUSTED_ORIGINS = config("CSRF_TRUSTED_ORIGINS", cast=Csv())
SECURE_REDIRECT_EXEMPT = [r"^api/v1/health/$"]  # Container healthcheck probes this over HTTP

# Database
DATABASES["default"]["CONN_MAX_AGE"] = 600  # noqa: F405

# Static files
STORAGES = {
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# Structured logging to stdout — collected by the container runtime
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "format": "{levelname} {asctime} {name} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO", "propagate": False},
        "processing": {"handlers": ["console"], "level": "INFO", "propagate": False},
    },
}
