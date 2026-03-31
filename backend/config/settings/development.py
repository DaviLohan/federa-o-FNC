"""
config/settings/development.py

Configurações para desenvolvimento local.
Usa SQLite por padrão (sem necessidade de Docker).

Uso:
    DJANGO_SETTINGS_MODULE=config.settings.development python manage.py runserver
    ou simplesmente: python manage.py runserver  (se configurado no manage.py)
"""

from .base import *  # noqa: F401, F403

# ─── Debug ─────────────────────────────────────────────────────────────────────

DEBUG = True

ALLOWED_HOSTS = ['*']

# ─── Banco de dados ────────────────────────────────────────────────────────────

# SQLite para desenvolvimento local (sem configuração extra)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
    }
}

# ─── Email ─────────────────────────────────────────────────────────────────────

# Exibe emails no console em vez de enviar
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── CORS ──────────────────────────────────────────────────────────────────────

# Em desenvolvimento, permite todas as origens
CORS_ALLOW_ALL_ORIGINS = True

# ─── Django Debug Toolbar (opcional) ──────────────────────────────────────────

# Para habilitar: pip install django-debug-toolbar e descomentar abaixo
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
# INTERNAL_IPS = ['127.0.0.1']
