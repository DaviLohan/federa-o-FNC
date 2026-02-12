# 🎮⚽ Federação Nacional de Clubs (FNC)

<div align="center">

**Plataforma completa de gestão de federação de e-sports para FIFA/eFootball**

[![Django](https://img.shields.io/badge/Django-6.0-green.svg)](https://www.djangoproject.com/)
[![DRF](https://img.shields.io/badge/DRF-3.16-red.svg)](https://www.django-rest-framework.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-yellow.svg)]()

[Documentação](./COMPLETE_GUIDE.md) • [Quick Start](./QUICKSTART.md) • [Database Schema](./DATABASE_SCHEMA.md)

</div>

---

## 📋 Sobre o Projeto

A **FNC** é uma plataforma completa para gerenciamento de federações de e-sports focada em FIFA e eFootball. O sistema permite que jogadores se cadastrem, criem times, participem de campeonatos e acompanhem suas estatísticas em tempo real.

### ✨ Funcionalidades Principais

- 🎮 **Cadastro de Jogadores** com perfil completo Pro Club
- 👥 **Gestão de Times** com sistema de convites
- 📊 **Escalação Visual** com drag & drop (13 formações do FIFA)
- 🏆 **Campeonatos** (mata-mata e pontos corridos)
- 💰 **Pagamentos** integrados (Stripe/Mercado Pago)
- 📈 **Estatísticas** detalhadas de jogadores e times
- 🔔 **Notificações** em tempo real
- 👮 **Sistema de Contestação** de resultados
- 🔐 **Login Social** com Google OAuth

---

## 🏗️ Arquitetura

```
┌──────────────┐         API REST         ┌──────────────┐
│   Frontend   │◄──────────────────────────│   Backend    │
│   Next.js    │      JSON/WebSocket      │   Django     │
│  TypeScript  │                           │     DRF      │
└──────────────┘                           └───────┬──────┘
                                                   │
                                          ┌────────┴────────┐
                                          │                 │
                                     PostgreSQL         Redis
                                     (Database)      (Cache/Queue)
```

### Stack Tecnológica

#### Backend
- **Django 6.0** - Framework web Python
- **Django REST Framework** - API REST
- **PostgreSQL 15** - Banco de dados
- **Redis 7** - Cache e filas
- **Celery** - Tasks assíncronas
- **Django Allauth** - Autenticação OAuth

#### Frontend
- **Next.js 14** - Framework React
- **TypeScript** - Type safety
- **TailwindCSS** - Estilização
- **React Query** - Data fetching
- **dnd-kit** - Drag & drop
- **Konva.js** - Canvas para escalação visual

#### DevOps
- **Docker** - Containerização
- **Docker Compose** - Orquestração
- **Nginx** - Proxy reverso
- **Gunicorn** - WSGI server

---

## 🚀 Quick Start

### Pré-requisitos
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (ou use SQLite para desenvolvimento)
- Docker & Docker Compose (opcional)

### Instalação Rápida

```bash
# Clone o repositório
cd FNC

# Backend
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure o banco (SQLite para começar rápido)
# Edite config/settings.py e use SQLite

# Migrations
python manage.py makemigrations
python manage.py migrate

# Crie um superusuário
python manage.py createsuperuser

# Inicie o servidor
python manage.py runserver
```

Acesse: http://localhost:8000/admin

Para instruções detalhadas, veja [QUICKSTART.md](./QUICKSTART.md)

### Com Docker

```bash
docker-compose up -d
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
```

---

## 📊 Status do Desenvolvimento

| Componente | Status | Progresso |
|------------|--------|-----------|
| **Backend - Estrutura** | ✅ Completo | 100% |
| **Backend - Modelos** | 🟡 Parcial | 60% |
| **Backend - API** | ⏳ Pendente | 0% |
| **Frontend** | ⏳ Pendente | 0% |
| **Testes** | ⏳ Pendente | 0% |
| **Deploy** | ⏳ Pendente | 0% |

**Progresso Geral: 40%**

### ✅ Implementado

#### Modelos de Dados
- ✅ User (autenticação customizada)
- ✅ PlayerProfile (perfil de jogador)
- ✅ TeamOwnerProfile (perfil de dono)
- ✅ Team (times)
- ✅ TeamMembership (jogadores no time)
- ✅ TeamInvitation (convites)
- ✅ Formation (formações táticas)
- ✅ FormationPosition (posições dos jogadores)
- ✅ Championship (campeonatos)
- ✅ ChampionshipEnrollment (inscrições)
- ✅ Bracket (chaveamento mata-mata)
- ✅ Standings (classificação pontos corridos)

#### Configurações
- ✅ Django REST Framework
- ✅ CORS
- ✅ Django Allauth (Google OAuth)
- ✅ Celery + Redis
- ✅ Docker Compose
- ✅ Variáveis de ambiente

### ⏳ Em Desenvolvimento

- Match e MatchReport
- Contestation
- PlayerStatistics
- Notification
- Payment
- Serializers e ViewSets
- Frontend Next.js

---

## 📁 Estrutura do Projeto

```
FNC/
├── 📄 README.md                    # Este arquivo
├── 📄 QUICKSTART.md               # Guia rápido de início
├── 📄 COMPLETE_GUIDE.md           # Guia completo
├── 📄 DATABASE_SCHEMA.md          # Schema do banco
├── 📄 COMMANDS.md                 # Comandos úteis
├── 📄 PROJECT_SUMMARY.md          # Resumo do projeto
├── 📄 docker-compose.yml          # Docker config
│
├── 📁 backend/                    # Backend Django
│   ├── config/                    # Configurações
│   ├── users/                     # Usuários e autenticação
│   ├── fnc_teams/                 # Gestão de times
│   ├── fnc_championships/         # Campeonatos
│   ├── fnc_matches/               # Partidas
│   ├── player_stats/              # Estatísticas
│   ├── fnc_notifications/         # Notificações
│   └── fnc_payments/              # Pagamentos
│
└── 📁 frontend/                   # Frontend Next.js (a criar)
```

---

## 🎯 Funcionalidades Detalhadas

### Para Jogadores
- ✅ Cadastro com perfil completo Pro Club
- ✅ Dashboard com estatísticas pessoais
- ✅ Visualização de times e campeonatos
- ✅ Receber e aceitar convites de times
- ✅ Criar próprio time (transição para dono)

### Para Donos de Time
- ✅ Criar e gerenciar time
- ✅ Convidar jogadores
- ✅ Montar escalação visual
- ✅ Inscrever time em campeonatos
- ✅ Gerenciar semana de jogos
- ✅ Reportar resultados

### Para Administradores
- ✅ Criar campeonatos (mata-mata ou pontos corridos)
- ✅ Gerenciar inscrições
- ✅ Aprovar pagamentos
- ✅ Resolver contestações
- ✅ Gerar chaveamentos automáticos

### Sistema de Acesso
- 🔒 Jogador sem time: acesso ao dashboard
- 🔒 Dono com time: acesso limitado
- 🔓 Dono inscrito em campeonato: acesso total
- 🔒 Ao finalizar campeonato: perda de acesso até nova inscrição

---

## 🗃️ Modelos de Dados

### Principais Entidades

```python
User                    # Autenticação (email, tipo, plataforma)
  ├── PlayerProfile     # Perfil de jogador
  └── TeamOwnerProfile  # Perfil de dono

Team                    # Times
  ├── TeamMembership    # Jogadores do time
  ├── TeamInvitation    # Convites
  └── Formation         # Formações táticas
      └── FormationPosition  # Posições dos jogadores

Championship            # Campeonatos
  ├── ChampionshipEnrollment  # Inscrições
  ├── Bracket           # Chaveamento (mata-mata)
  ├── Standings         # Classificação (pontos corridos)
  └── ChampionshipPrize # Premiações

Match                   # Partidas
  ├── MatchReport       # Reports de resultado
  ├── Contestation      # Contestações
  └── MatchStatistic    # Estatísticas (gols, assistências)

PlayerStatistics        # Estatísticas agregadas
Notification           # Notificações
Payment                # Pagamentos
```

Para diagrama completo, veja [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

## 📚 Documentação

- **[QUICKSTART.md](./QUICKSTART.md)** - Como começar em 5 minutos
- **[COMPLETE_GUIDE.md](./COMPLETE_GUIDE.md)** - Guia completo de desenvolvimento
- **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)** - Schema do banco de dados
- **[COMMANDS.md](./COMMANDS.md)** - Comandos úteis
- **[PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md)** - Resumo e status
- **[DEVELOPMENT_STATUS.md](./DEVELOPMENT_STATUS.md)** - Progresso atual

---

## 🧪 Testes

```bash
# Rodar todos os testes
python manage.py test

# Com coverage
coverage run --source='.' manage.py test
coverage report
```

---

## 🚢 Deploy

### Checklist de Deploy
- [ ] Configurar SECRET_KEY segura
- [ ] DEBUG=False
- [ ] Configurar ALLOWED_HOSTS
- [ ] Configurar banco PostgreSQL
- [ ] Configurar Redis
- [ ] Configurar email (SMTP)
- [ ] Configurar Google OAuth
- [ ] Configurar Stripe/Mercado Pago
- [ ] Coletar arquivos estáticos
- [ ] Configurar Nginx
- [ ] Configurar HTTPS (Let's Encrypt)
- [ ] Configurar backup automático

Para detalhes, veja [COMMANDS.md](./COMMANDS.md)

---

## 📈 Roadmap

### Fase 1 - Backend Base (✅ 60% completo)
- ✅ Estrutura Django
- ✅ Modelos principais
- ⏳ Modelos restantes
- ⏳ Admin Django

### Fase 2 - API REST (⏳ 0%)
- ⏳ Serializers
- ⏳ ViewSets
- ⏳ Autenticação
- ⏳ Permissions

### Fase 3 - Frontend (⏳ 0%)
- ⏳ Setup Next.js
- ⏳ Design system
- ⏳ Autenticação
- ⏳ Dashboards

### Fase 4 - Funcionalidades (⏳ 0%)
- ⏳ Escalação visual
- ⏳ Campeonatos
- ⏳ Pagamentos
- ⏳ Estatísticas

### Fase 5 - Polish & Deploy (⏳ 0%)
- ⏳ Testes
- ⏳ Otimizações
- ⏳ Deploy

**Tempo estimado para MVP: 4-5 meses**

---

## 🤝 Contribuindo

Este é um projeto proprietário. Contribuições não são aceitas no momento.

---

## 📄 Licença

Proprietary - Todos os direitos reservados

---

## 📞 Contato

Para dúvidas ou suporte, consulte a documentação ou entre em contato com a equipe de desenvolvimento.

---

<div align="center">

**Desenvolvido com 💚 para a comunidade FIFA/eFootball**

[Voltar ao topo](#-federação-nacional-de-clubs-fnc)

</div>
