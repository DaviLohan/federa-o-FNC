#!/bin/sh
set -e

echo "Running migrations..."
python manage.py migrate --noinput

if [ -n "$DJANGO_SUPERUSER_EMAIL" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  echo "Ensuring admin user exists..."
  python manage.py shell -c "from users.models import User; email='${DJANGO_SUPERUSER_EMAIL}'; password='${DJANGO_SUPERUSER_PASSWORD}'; first_name='${DJANGO_SUPERUSER_FIRST_NAME:-Admin}'; last_name='${DJANGO_SUPERUSER_LAST_NAME:-Imperium}'; platform='${DJANGO_SUPERUSER_PLATFORM:-PC}'; u, created = User.objects.get_or_create(email=email, defaults={'first_name': first_name, 'last_name': last_name, 'platform': platform, 'user_type': 'ADMIN', 'is_staff': True, 'is_superuser': True, 'is_active': True, 'is_email_verified': True}); u.first_name = first_name; u.last_name = last_name; u.platform = platform; u.user_type = 'ADMIN'; u.is_staff = True; u.is_superuser = True; u.is_active = True; u.is_email_verified = True; u.set_password(password); u.save(); print('created' if created else 'updated', u.email)"
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput 2>/dev/null || true

echo "Starting gunicorn..."
exec gunicorn --bind "0.0.0.0:${PORT:-8000}" --workers 3 config.wsgi:application
