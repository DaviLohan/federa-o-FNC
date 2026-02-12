# 🚀 Quick Start - FNC

## Começar em 5 Minutos

### Opção 1: Desenvolvimento Rápido (SQLite)

```bash
# 1. Entre no backend
cd backend

# 2. Ative o virtualenv (já existe!)
source venv/bin/activate  # Windows: venv\Scripts\activate

# 3. Instale as dependências restantes
pip install -r requirements.txt

# 4. Configure para usar SQLite (mais rápido para começar)
# Edite backend/config/settings.py e substitua a seção DATABASES por:
# DATABASES = {
#     'default': {
#         'ENGINE': 'django.db.backends.sqlite3',
#         'NAME': BASE_DIR / 'db.sqlite3',
#     }
# }

# 5. Crie as tabelas
python manage.py makemigrations users
python manage.py makemigrations fnc_teams
python manage.py makemigrations fnc_championships
python manage.py migrate

# 6. Crie um superusuário
python manage.py createsuperuser
# Email: admin@fnc.com
# Password: admin123 (ou o que preferir)

# 7. Inicie o servidor
python manage.py runserver

# 8. Abra o navegador
# Admin: http://localhost:8000/admin
# API: http://localhost:8000/api (quando configurada)
```

### Opção 2: Com Docker (Produção-Like)

```bash
# 1. Certifique-se de ter Docker e Docker Compose instalados
docker --version
docker-compose --version

# 2. Suba os serviços
docker-compose up -d

# 3. Aguarde os serviços iniciarem (30 segundos)
docker-compose logs -f backend

# 4. Execute as migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# 5. Crie um superusuário
docker-compose exec backend python manage.py createsuperuser

# 6. Acesse
# Backend: http://localhost:8000
# Frontend (quando criado): http://localhost:3000
# PostgreSQL: localhost:5432
# Redis: localhost:6379

# 7. Para parar
docker-compose down
```

## Testando a Instalação

### 1. Admin Django
```
URL: http://localhost:8000/admin
Login: admin@fnc.com (ou o email que criou)
Password: sua senha

Você deve ver:
- Users
- Player profiles
- Team owner profiles
- Teams
- Team memberships
- Team invitations
- Formations
- Championships
- Championship enrollments
- Standings
```

### 2. Criar Dados de Teste

```bash
python manage.py shell
```

```python
# No shell Django:
from users.models import User, PlayerProfile
from fnc_teams.models import Team
from django.utils import timezone

# Criar jogador
user = User.objects.create_user(
    email='jogador@test.com',
    password='senha123',
    first_name='João',
    last_name='Silva',
    platform='PS'
)

player = PlayerProfile.objects.create(
    user=user,
    player_name='João Silva',
    gamer_tag='JoaoGamer10',
    shirt_number=10,
    primary_position='ST',
    birth_date='1995-05-15',
    whatsapp='+5511999999999',
    country='Brasil'
)

print(f"✅ Jogador criado: {player}")

# Criar dono de time
owner_user = User.objects.create_user(
    email='dono@test.com',
    password='senha123',
    first_name='Carlos',
    last_name='Souza',
    platform='PS',
    user_type='TEAM_OWNER'
)

# Criar time
team = Team.objects.create(
    owner=owner_user,
    name='FC Test',
    abbreviation='FCT',
    description='Time de teste'
)

print(f"✅ Time criado: {team}")

# Sair
exit()
```

### 3. Verificar no Admin

Volte para http://localhost:8000/admin e veja:
- 2 usuários (você + os criados)
- 1 player profile
- 1 time

## Estrutura de Arquivos Criados

```
✅ README.md                 - Documentação principal
✅ PROJECT_SUMMARY.md        - Resumo completo
✅ COMPLETE_GUIDE.md         - Guia de desenvolvimento
✅ DATABASE_SCHEMA.md        - Schema do banco
✅ COMMANDS.md               - Comandos úteis
✅ DEVELOPMENT_STATUS.md     - Status do projeto
✅ docker-compose.yml        - Docker config
✅ .gitignore               - Git ignore

backend/
✅ requirements.txt         - Dependências Python
✅ Dockerfile               - Container backend
✅ .env.example             - Exemplo de variáveis
✅ .env                     - Variáveis locais
✅ manage.py                - Django CLI

✅ config/settings.py       - Configurações (COMPLETO)
✅ users/models.py          - User, PlayerProfile, TeamOwnerProfile
✅ fnc_teams/models.py      - Team, Formation, etc
✅ fnc_championships/models.py - Championship, Bracket, Standings
```

## Problemas Comuns

### Erro: "No module named 'decouple'"
```bash
pip install python-decouple dj-database-url whitenoise
```

### Erro: "relation does not exist"
```bash
python manage.py migrate
```

### Erro: "Port 8000 already in use"
```bash
# Mate o processo
kill -9 $(lsof -ti:8000)

# Ou use outra porta
python manage.py runserver 8080
```

### Erro no Docker: "password authentication failed"
```bash
# Remova os volumes e recomece
docker-compose down -v
docker-compose up -d
```

## Próximos Passos

1. ✅ **Teste o admin** - Entre e explore os modelos
2. ⏳ **Registre os modelos no admin** - Facilita o gerenciamento
3. ⏳ **Crie os modelos restantes** - Matches, Stats, Notifications
4. ⏳ **Configure a API REST** - Serializers e ViewSets
5. ⏳ **Setup do Frontend** - Next.js + TypeScript

## Documentação Completa

Para informações detalhadas, consulte:
- `COMPLETE_GUIDE.md` - Guia completo passo a passo
- `DATABASE_SCHEMA.md` - Estrutura do banco
- `COMMANDS.md` - Todos os comandos úteis
- `PROJECT_SUMMARY.md` - Visão geral do projeto

## Suporte

Se tiver problemas:
1. Verifique os logs: `python manage.py runserver --verbosity 3`
2. Consulte `COMMANDS.md` para comandos úteis
3. Leia `COMPLETE_GUIDE.md` para detalhes
4. Veja a documentação oficial do Django

---

**🎮 Boa sorte com o desenvolvimento da FNC! ⚽**
