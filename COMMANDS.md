# 🔧 Comandos Úteis - FNC

## Backend Django

### Desenvolvimento Inicial
```bash
# Ativar virtualenv
cd backend
source venv/bin/activate  # Windows: venv\Scripts\activate

# Instalar dependências
pip install -r requirements.txt

# Copiar .env
cp .env.example .env

# Criar migrations
python manage.py makemigrations

# Aplicar migrations
python manage.py migrate

# Criar superusuário
python manage.py createsuperuser

# Iniciar servidor
python manage.py runserver

# Acessar
# http://localhost:8000/admin
# http://localhost:8000/api
```

### Gerenciamento de Dados
```bash
# Criar dados de teste
python manage.py shell
>>> from users.models import User, PlayerProfile
>>> user = User.objects.create_user(
...     email='jogador@test.com',
...     password='senha123',
...     first_name='João',
...     last_name='Silva',
...     platform='PS'
... )
>>> PlayerProfile.objects.create(
...     user=user,
...     player_name='JoaoSilva',
...     gamer_tag='JoaoGamer',
...     shirt_number=10,
...     primary_position='ST',
...     birth_date='1995-05-15',
...     whatsapp='+5511999999999',
...     country='Brasil'
... )

# Resetar banco de dados
python manage.py flush

# Criar backup
python manage.py dumpdata > backup.json

# Restaurar backup
python manage.py loaddata backup.json
```

### Testes
```bash
# Rodar todos os testes
python manage.py test

# Testar app específico
python manage.py test users

# Com coverage
pip install coverage
coverage run --source='.' manage.py test
coverage report
coverage html  # Gera relatório HTML
```

### Django Admin Customizado
```bash
# Registrar modelo no admin
# Em users/admin.py
from django.contrib import admin
from .models import User, PlayerProfile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'full_name', 'user_type', 'date_joined']
    list_filter = ['user_type', 'platform', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']
    readonly_fields = ['date_joined', 'last_login']

@admin.register(PlayerProfile)
class PlayerProfileAdmin(admin.ModelAdmin):
    list_display = ['player_name', 'gamer_tag', 'primary_position', 'user']
    list_filter = ['primary_position', 'country', 'language']
    search_fields = ['player_name', 'gamer_tag', 'user__email']
```

## Docker

### Comandos Básicos
```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Parar serviços
docker-compose stop

# Reiniciar serviço específico
docker-compose restart backend

# Remover tudo
docker-compose down -v  # -v remove volumes
```

### Executar Comandos no Container
```bash
# Bash no container
docker-compose exec backend bash

# Migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Shell Django
docker-compose exec backend python manage.py shell

# Criar superusuário
docker-compose exec backend python manage.py createsuperuser

# Coletar arquivos estáticos
docker-compose exec backend python manage.py collectstatic --noinput
```

### Rebuild
```bash
# Rebuild imagem
docker-compose build backend

# Rebuild e subir
docker-compose up -d --build
```

## PostgreSQL

### Acessar Banco
```bash
# Via Docker
docker-compose exec db psql -U fnc_user -d fnc_db

# Local
psql -U fnc_user -h localhost -d fnc_db
```

### Comandos SQL Úteis
```sql
-- Ver todas as tabelas
\dt

-- Descrever tabela
\d users_user

-- Ver todos os usuários
SELECT email, first_name, user_type FROM users_user;

-- Ver times e seus donos
SELECT t.name, u.email 
FROM fnc_teams_team t 
JOIN users_user u ON t.owner_id = u.id;

-- Limpar tabela
TRUNCATE users_user CASCADE;

-- Backup
pg_dump -U fnc_user fnc_db > backup.sql

-- Restore
psql -U fnc_user fnc_db < backup.sql
```

## Git

### Workflow Básico
```bash
# Inicializar repo
git init
git add .
git commit -m "Initial commit - Backend structure"

# Criar branch
git checkout -b feature/auth

# Commit
git add .
git commit -m "feat: add user authentication"

# Push
git push origin feature/auth

# Merge para main
git checkout main
git merge feature/auth
```

## API Testing

### cURL
```bash
# Registrar usuário
curl -X POST http://localhost:8000/api/auth/registration/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password1": "senha123456",
    "password2": "senha123456",
    "first_name": "Test",
    "last_name": "User",
    "platform": "PS"
  }'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "senha123456"
  }'

# GET com autenticação
curl -X GET http://localhost:8000/api/players/ \
  -H "Authorization: Token SEU_TOKEN_AQUI"
```

### HTTPie (mais amigável)
```bash
# Instalar
pip install httpie

# Registrar
http POST http://localhost:8000/api/auth/registration/ \
  email=test@example.com \
  password1=senha123456 \
  password2=senha123456 \
  first_name=Test \
  last_name=User \
  platform=PS

# Login
http POST http://localhost:8000/api/auth/login/ \
  email=test@example.com \
  password=senha123456

# GET com token
http GET http://localhost:8000/api/players/ \
  "Authorization: Token SEU_TOKEN"
```

## Frontend (Quando Criado)

### Setup Inicial
```bash
cd frontend

# Instalar dependências
npm install

# Desenvolvimento
npm run dev

# Build produção
npm run build

# Lint
npm run lint
```

### Adicionar Bibliotecas
```bash
# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu

# Formulários
npm install react-hook-form @hookform/resolvers zod

# Gráficos
npm install recharts

# Data fetching
npm install @tanstack/react-query axios

# Estado global
npm install zustand

# Drag and drop
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Canvas para escalação
npm install konva react-konva
```

## Celery (Tasks Assíncronas)

### Configurar
```python
# config/celery.py
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('fnc')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# config/__init__.py
from .celery import app as celery_app
__all__ = ('celery_app',)
```

### Iniciar Worker
```bash
# Terminal 1: Django
python manage.py runserver

# Terminal 2: Celery Worker
celery -A config worker -l info

# Terminal 3: Celery Beat (tarefas agendadas)
celery -A config beat -l info
```

### Criar Task
```python
# fnc_notifications/tasks.py
from celery import shared_task
from django.core.mail import send_mail

@shared_task
def send_match_notification(match_id):
    match = Match.objects.get(id=match_id)
    send_mail(
        'Partida Agendada',
        f'Você tem uma partida: {match}',
        'noreply@fnc.com',
        [match.home_team.owner.email],
    )
```

## Debugging

### Django Debug Toolbar
```bash
pip install django-debug-toolbar

# settings.py
INSTALLED_APPS += ['debug_toolbar']
MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
INTERNAL_IPS = ['127.0.0.1']

# urls.py
if settings.DEBUG:
    import debug_toolbar
    urlpatterns += [path('__debug__/', include(debug_toolbar.urls))]
```

### Logs
```python
# settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': 'debug.log',
        },
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
        },
    },
}

# Usar em views
import logging
logger = logging.getLogger(__name__)
logger.info('Log message')
```

## Performance

### Query Optimization
```python
# Ruim (N+1 queries)
teams = Team.objects.all()
for team in teams:
    print(team.owner.email)  # Query extra!

# Bom (1 query)
teams = Team.objects.select_related('owner').all()
for team in teams:
    print(team.owner.email)

# Many-to-Many
teams = Team.objects.prefetch_related('players').all()
```

### Caching
```python
from django.core.cache import cache

# Salvar
cache.set('my_key', 'value', 300)  # 5 minutos

# Recuperar
value = cache.get('my_key')

# Decorator
from django.views.decorators.cache import cache_page

@cache_page(60 * 15)  # 15 minutos
def my_view(request):
    ...
```

## Deploy

### Checklist
```bash
# 1. Coletar arquivos estáticos
python manage.py collectstatic --noinput

# 2. Verificar configurações
python manage.py check --deploy

# 3. Migrations
python manage.py migrate

# 4. Criar superusuário (se necessário)
python manage.py createsuperuser

# 5. Configurar variáveis de ambiente
# DEBUG=False
# SECRET_KEY=nova-chave-segura
# ALLOWED_HOSTS=seudominio.com

# 6. Configurar servidor web (Nginx/Apache)
# 7. Configurar HTTPS (Let's Encrypt)
# 8. Configurar backup automático
```

### Gunicorn
```bash
# Instalar
pip install gunicorn

# Rodar
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --workers 3

# Com arquivo de config
gunicorn -c gunicorn_config.py config.wsgi:application
```

### Nginx Config
```nginx
server {
    listen 80;
    server_name seudominio.com;
    
    location /static/ {
        alias /path/to/staticfiles/;
    }
    
    location /media/ {
        alias /path/to/media/;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

**Para mais informações, consulte:**
- COMPLETE_GUIDE.md
- DATABASE_SCHEMA.md
- DEVELOPMENT_STATUS.md
