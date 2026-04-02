#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"

echo "Starting Celery worker..."
exec celery -A config worker \
  --loglevel="${CELERY_LOG_LEVEL:-info}" \
  --concurrency="${CELERY_WORKER_CONCURRENCY:-2}"
