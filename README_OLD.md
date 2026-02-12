# Federação Nacional de Clubs (FNC)

Plataforma de gestão de federação de e-sports para FIFA/eFootball com sistema completo de gerenciamento de times, jogadores, campeonatos e estatísticas.

## 🚀 Stack Tecnológica

### Backend
- Django 5.0+
- Django REST Framework
- PostgreSQL 15+
- Redis (cache e Celery)
- Django Allauth (autenticação OAuth)

### Frontend
- Next.js 14+ (React)
- TypeScript
- TailwindCSS
- dnd-kit (drag & drop)
- Konva.js (escalação visual)
- React Query

## 📁 Estrutura do Projeto

```
FNC/
├── backend/           # Django API
│   ├── accounts/      # Autenticação e usuários
│   ├── teams/         # Gestão de times
│   ├── championships/ # Campeonatos
│   ├── matches/       # Partidas e reports
│   ├── statistics/    # Estatísticas
│   ├── notifications/ # Avisos
│   └── payments/      # Pagamentos
├── frontend/          # Next.js aplicação
└── docker-compose.yml
```

## 🐳 Começando com Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Aplicar migrações
docker-compose exec backend python manage.py migrate

# Criar superusuário
docker-compose exec backend python manage.py createsuperuser

# Acessar aplicação
Frontend: http://localhost:3000
Backend API: http://localhost:8000
Admin: http://localhost:8000/admin
```

## 📝 Desenvolvimento Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## 🎯 Funcionalidades Principais

- ✅ Cadastro de jogadores com perfil completo
- ✅ Sistema de criação e gestão de times
- ✅ Escalação visual com drag & drop
- ✅ Criação e gestão de campeonatos (mata-mata e pontos corridos)
- ✅ Sistema de convites para jogadores
- ✅ Report e contestação de resultados
- ✅ Estatísticas detalhadas (jogadores, times, rankings)
- ✅ Sistema de notificações in-app
- ✅ Integração com gateway de pagamento
- ✅ Login social com Google

## 📄 Licença

Proprietary - Todos os direitos reservados
