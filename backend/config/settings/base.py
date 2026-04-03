"""
config/settings/base.py

Configurações base compartilhadas entre todos os ambientes.
Não use este arquivo diretamente — use development.py ou production.py.
"""

from pathlib import Path
from decouple import config

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# ─── Segurança ─────────────────────────────────────────────────────────────────

SECRET_KEY = config('SECRET_KEY')  # Obrigatório — sem fallback por segurança

ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1').split(',')
# Remove entradas vazias e whitespace
ALLOWED_HOSTS = [h.strip() for h in ALLOWED_HOSTS if h.strip()]

# ─── Apps instalados ───────────────────────────────────────────────────────────

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.sites',

    # Third party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'allauth',
    'allauth.account',
    'allauth.socialaccount',
    'allauth.socialaccount.providers.google',
    'dj_rest_auth',
    'dj_rest_auth.registration',
    'django_filters',
    'drf_spectacular',

    # Local apps
    'users',
    'fnc_teams',
    'fnc_championships',
    'fnc_matches',
    'player_stats',
    'fnc_notifications',
    'fnc_payments',
    'ea_integration',
]

SITE_ID = 1

# ─── Middleware ────────────────────────────────────────────────────────────────

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'allauth.account.middleware.AccountMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ─── Auth ──────────────────────────────────────────────────────────────────────

AUTH_USER_MODEL = 'users.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internacionalização ───────────────────────────────────────────────────────

LANGUAGE_CODE = 'pt-br'
TIME_ZONE = 'America/Sao_Paulo'
USE_I18N = True
USE_TZ = True

# ─── Arquivos estáticos e de mídia ────────────────────────────────────────────

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── REST Framework ────────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '30/minute',
        'user': '120/minute',
    },
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# ─── CORS ──────────────────────────────────────────────────────────────────────

CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000'
).split(',')
CORS_ALLOW_CREDENTIALS = True

# ─── Django Allauth ────────────────────────────────────────────────────────────

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
    'allauth.account.auth_backends.AuthenticationBackend',
]

ACCOUNT_LOGIN_METHODS = {'email'}
ACCOUNT_SIGNUP_FIELDS = ['email*', 'password1*', 'password2*']
ACCOUNT_EMAIL_VERIFICATION = config('ACCOUNT_EMAIL_VERIFICATION', default='mandatory')
ACCOUNT_USER_MODEL_USERNAME_FIELD = None

# ─── Google OAuth ──────────────────────────────────────────────────────────────

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': config('GOOGLE_CLIENT_ID', default=''),
            'secret': config('GOOGLE_CLIENT_SECRET', default=''),
        }
    }
}

# ─── dj-rest-auth ─────────────────────────────────────────────────────────────

REST_AUTH = {
    'USE_JWT': True,
    'JWT_AUTH_COOKIE': 'fnc-auth',
    'JWT_AUTH_REFRESH_COOKIE': 'fnc-refresh-token',
    'JWT_AUTH_HTTPONLY': True,
    'JWT_AUTH_SAMESITE': 'Lax',
    'USER_DETAILS_SERIALIZER': 'users.serializers.UserSerializer',
}

# ─── Simple JWT ────────────────────────────────────────────────────────────────

from datetime import timedelta  # noqa: E402

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ─── Celery ────────────────────────────────────────────────────────────────────

CELERY_BROKER_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE

# Celery Beat — tarefas periódicas
CELERY_BEAT_SCHEDULE = {
    'sync-ea-matches-every-3-min': {
        'task': 'ea_integration.sync_all_matches',
        'schedule': 180.0,  # 3 minutos
        'kwargs': {'match_types': ['friendlyMatch']},
    },
    'ea-api-health-check-every-10-min': {
        'task': 'ea_integration.health_check_ea_api',
        'schedule': 600.0,  # 10 minutos
    },
}

# ─── Cache (Redis) ─────────────────────────────────────────────────────────────

CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': config('REDIS_URL', default='redis://localhost:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# ─── Email ─────────────────────────────────────────────────────────────────────

EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_USE_SSL = config('EMAIL_USE_SSL', default=False, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@fnc.com')
SITE_URL = config('SITE_URL', default='http://localhost:3000')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:3000')
BREVO_API_KEY = config('BREVO_API_KEY', default='')

# ─── Verificação de Email ──────────────────────────────────────────────────────

VERIFICATION_CODE_EXPIRY_MINUTES = 15       # Tempo de validade do código (minutos)
VERIFICATION_CODE_MAX_ATTEMPTS = 5          # Máximo de tentativas por código
VERIFICATION_CODE_RESEND_INTERVAL_SECONDS = 60  # Cooldown entre reenvios (segundos)

# ─── Pagamentos ────────────────────────────────────────────────────────────────

STRIPE_PUBLIC_KEY = config('STRIPE_PUBLIC_KEY', default='')
STRIPE_SECRET_KEY = config('STRIPE_SECRET_KEY', default='')
STRIPE_WEBHOOK_SECRET = config('STRIPE_WEBHOOK_SECRET', default='')

# Mercado Pago (gateway ativo)
MP_ACCESS_TOKEN = config('MP_ACCESS_TOKEN', default='')
MP_WEBHOOK_SECRET = config('MP_WEBHOOK_SECRET', default='')
MP_SANDBOX_PAYER_EMAIL = config('MP_SANDBOX_PAYER_EMAIL', default='')

# Asaas (legado — mantido para histórico)
ASAAS_API_KEY = config('ASAAS_API_KEY', default='')
ASAAS_BASE_URL = config('ASAAS_BASE_URL', default='https://api-sandbox.asaas.com/v3')
ASAAS_WEBHOOK_ACCESS_TOKEN = config('ASAAS_WEBHOOK_ACCESS_TOKEN', default='')
ASAAS_WITHDRAWAL_WEBHOOK_TOKEN = config('ASAAS_WITHDRAWAL_WEBHOOK_TOKEN', default='')

# ─── DRF Spectacular (API Docs) ───────────────────────────────────────────────

SPECTACULAR_SETTINGS = {
    'TITLE': 'FNC API',
    'DESCRIPTION': 'API da Federação Nacional de Clubs',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
