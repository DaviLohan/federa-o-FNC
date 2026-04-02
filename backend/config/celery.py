"""
config/celery.py

Configuração do Celery para o projeto IMPERIUM (FNC).
Descobre automaticamente tasks em todas as apps INSTALLED_APPS.
"""

import os

from celery import Celery

# Definir settings padrão do Django para o programa 'celery'
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')

app = Celery('config')

# Ler configuração do Django settings, prefixo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Descobrir tasks.py em todas as apps registradas
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Task de debug — imprime o request info."""
    print(f'Request: {self.request!r}')
