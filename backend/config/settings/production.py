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
SECURE_SSL_REDIRECT = config('SECURE_SSL_REDIRECT', default=True, cast=bool)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# ─── CSRF ──────────────────────────────────────────────────────────────────────

CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='',
).split(',')
# Remove entradas vazias (quando a variável não está configurada)
CSRF_TRUSTED_ORIGINS = [o.strip() for o in CSRF_TRUSTED_ORIGINS if o.strip()]

# ─── Banco de dados (PostgreSQL obrigatório) ───────────────────────────────────

# Sem fallback — falha explicitamente se DATABASE_URL não estiver configurado
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL'),
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

# ─── API Docs ──────────────────────────────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    'TITLE': 'FNC API',
    'DESCRIPTION': 'API da Federação Nacional de Clubs',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'SERVE_PERMISSIONS': ['rest_framework.permissions.IsAdminUser'],
}

# ─── JWT em produção ───────────────────────────────────────────────────────────

REST_AUTH['JWT_AUTH_SECURE'] = True  # noqa: F405

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
