"""
config/settings/development.py

Configurações para desenvolvimento local.
Usa SQLite por padrão (sem necessidade de Docker).

Uso:
    DJANGO_SETTINGS_MODULE=config.settings.development python manage.py runserver
    ou simplesmente: python manage.py runserver  (se configurado no manage.py)
"""

import dj_database_url

from .base import *  # noqa: F401, F403

# ─── Debug ─────────────────────────────────────────────────────────────────────

DEBUG = True

ALLOWED_HOSTS = ['*']

# ─── Banco de dados ────────────────────────────────────────────────────────────

# Em Docker/local com DATABASE_URL, usa PostgreSQL para aproximar de produção.
# Sem DATABASE_URL, mantém SQLite como fallback leve para desenvolvimento rápido.
DATABASE_URL = config('DATABASE_URL', default='').strip()  # noqa: F405

if DATABASE_URL:
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL, conn_max_age=0),
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',  # noqa: F405
        }
    }

# ─── Email ─────────────────────────────────────────────────────────────────────

# Em dev, o EMAIL_BACKEND vem do .env.
# Para voltar ao console (sem enviar emails de verdade), basta setar no .env:
#   EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Em dev, verificação de email é opcional (caso esteja usando console backend)
ACCOUNT_EMAIL_VERIFICATION = 'optional'

# ─── CORS ──────────────────────────────────────────────────────────────────────

# Em desenvolvimento, permite todas as origens
CORS_ALLOW_ALL_ORIGINS = True

# ─── Django Debug Toolbar (opcional) ──────────────────────────────────────────

# Para habilitar: pip install django-debug-toolbar e descomentar abaixo
# INSTALLED_APPS += ['debug_toolbar']
# MIDDLEWARE = ['debug_toolbar.middleware.DebugToolbarMiddleware'] + MIDDLEWARE
# INTERNAL_IPS = ['127.0.0.1']
