"""S3-compatible storage client (MinIO for dev, Cloudflare R2 for prod)."""

import logging

import boto3
from django.conf import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.S3_ENDPOINT_URL,
            aws_access_key_id=settings.S3_ACCESS_KEY,
            aws_secret_access_key=settings.S3_SECRET_KEY,
            region_name=settings.S3_REGION,
        )
        # Ensure bucket exists (dev convenience)
        try:
            _client.head_bucket(Bucket=settings.S3_BUCKET_NAME)
        except Exception:
            _client.create_bucket(Bucket=settings.S3_BUCKET_NAME)
            logger.info("Created S3 bucket: %s", settings.S3_BUCKET_NAME)
    return _client


def upload_file_to_s3(file_obj, key: str) -> None:
    """Upload a file-like object to S3."""
    client = _get_client()
    client.upload_fileobj(file_obj, settings.S3_BUCKET_NAME, key)
    logger.info("Uploaded %s to S3", key)


def download_file_from_s3(key: str) -> bytes:
    """Download a file from S3 and return its bytes."""
    client = _get_client()
    response = client.get_object(Bucket=settings.S3_BUCKET_NAME, Key=key)
    return response["Body"].read()
