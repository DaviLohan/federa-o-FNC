# Importar o app Celery para que fique disponível via `from config import celery_app`
from .celery import app as celery_app

__all__ = ('celery_app',)
