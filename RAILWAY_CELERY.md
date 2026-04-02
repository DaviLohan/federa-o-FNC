# Celery no Railway

O backend HTTP ja esta publicado. Para ativar as tarefas assicronas da integracao com a EA, crie dois servicos extras no Railway usando a mesma pasta `backend`.

## Servico 1: Worker

- Source: mesmo repositorio atual
- Root Directory: `backend`
- Builder: Dockerfile
- Start Command: `./start-celery-worker.sh`

Variaveis recomendadas:

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DATABASE_URL=<mesma do backend>`
- `REDIS_URL=<mesma do backend>`
- `SECRET_KEY=<mesma do backend>`
- `ALLOWED_HOSTS=.railway.app`
- `CELERY_WORKER_CONCURRENCY=2`

## Servico 2: Beat

- Source: mesmo repositorio atual
- Root Directory: `backend`
- Builder: Dockerfile
- Start Command: `./start-celery-beat.sh`

Variaveis recomendadas:

- `DJANGO_SETTINGS_MODULE=config.settings.production`
- `DATABASE_URL=<mesma do backend>`
- `REDIS_URL=<mesma do backend>`
- `SECRET_KEY=<mesma do backend>`
- `ALLOWED_HOSTS=.railway.app`

## Observacoes

- Copie para os dois servicos as mesmas envs do backend que o Django precisa para inicializar.
- Nao exponha porta nos servicos de worker e beat. Eles nao recebem trafego HTTP.
- O `worker` processa as tasks e o `beat` agenda as tasks periodicas definidas em `backend/config/settings/base.py`.
- As tarefas atuais sao `ea_integration.sync_all_matches` a cada 3 minutos e `ea_integration.health_check_ea_api` a cada 10 minutos.
