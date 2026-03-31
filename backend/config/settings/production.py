"""
config/settings/production.py

Configurações para produção.
Requer variáveis de ambiente configuradas (ver backend/.env.example).

Uso:
    DJANGO_SETTINGS_MODULE=config.settings.production gunicorn config.wsgi
"""

import dj_database_url
from .base import *  # noqa: F401, F403
from decouple import config

# ─── Debug ─────────────────────────────────────────────────────────────────────

DEBUG = False

# ─── Segurança ─────────────────────────────────────────────────────────────────

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# ─── Banco de dados (PostgreSQL obrigatório) ───────────────────────────────────

DATABASES = {
    'default': dj_database_url.config(
        default=config(
            'DATABASE_URL',
            default='postgresql://fnc_user:fnc_password123@db:5432/fnc_db'
        ),
        conn_max_age=600,
        conn_health_checks=True,
    )
}

# ─── Email ─────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = config(
    'EMAIL_BACKEND',
    default='django.core.mail.backends.smtp.EmailBackend'
)

# ─── CORS ──────────────────────────────────────────────────────────────────────

# Em produção, lista explícita de origens permitidas (configurada via .env)
CORS_ALLOW_ALL_ORIGINS = False

# ─── Logs ──────────────────────────────────────────────────────────────────────

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': config('DJANGO_LOG_LEVEL', default='INFO'),
            'propagate': False,
        },
    },
}
