#!/bin/sh
set -e

export DJANGO_SETTINGS_MODULE="${DJANGO_SETTINGS_MODULE:-config.settings.production}"

echo "Starting Celery beat..."
exec celery -A config beat \
  --loglevel="${CELERY_LOG_LEVEL:-info}" \
  --pidfile= \
  --schedule=/tmp/celerybeat-schedule
