# 🎮 Federação Nacional de Clubs (FNC)
## Guia Completo de Desenvolvimento

## ✅ O Que Foi Criado

### Estrutura Backend (Django)
```
backend/
├── config/              # Configurações do projeto
│   ├── settings.py     # ✅ Totalmente configurado
│   ├── urls.py
│   └── wsgi.py
├── users/              # ✅ Autenticação e perfis
│   └── models.py       # User, PlayerProfile, TeamOwnerProfile
├── fnc_teams/          # ✅ Gestão de times
│   └── models.py       # Team, TeamMembership, TeamInvitation, Formation
├── fnc_championships/  # ✅ Campeonatos
│   └── models.py       # Championship, ChampionshipEnrollment, Bracket, Standings
├── fnc_matches/        # Partidas
├── player_stats/       # Estatísticas
├── fnc_notifications/  # Notificações
└── fnc_payments/       # Pagamentos
```

### Arquivos de Configuração
- ✅ `docker-compose.yml` - PostgreSQL + Redis + Backend + Frontend
- ✅ `requirements.txt` - Todas as dependências Python
- ✅ `Dockerfile` - Container do backend
- ✅ `.env.example` e `.env` - Variáveis de ambiente
- ✅ `.gitignore` - Arquivos ignorados pelo Git
- ✅ `README.md` - Documentação principal

### Modelos de Dados Implementados

#### users/models.py
1. **User** (AbstractBaseUser customizado)
   - email, first_name, last_name
   - user_type (PLAYER, TEAM_OWNER, ADMIN)
   - platform (PS, XBOX, PC)

2. **PlayerProfile**
   - player_name, gamer_tag, shirt_number
   - primary_position, secondary_position
   - birth_date, whatsapp, country, language
   - avatar

3. **TeamOwnerProfile**
   - bio, avatar
   - Link com User

#### fnc_teams/models.py
1. **Team**
   - name, abbreviation, logo
   - owner (FK User)
   - players (M2M PlayerProfile)

2. **TeamMembership**
   - Relacionamento Team ↔ Player
   - role (OWNER, CAPTAIN, PLAYER)

3. **TeamInvitation**
   - team → player
   - status (PENDING, ACCEPTED, DECLINED)

4. **Formation**
   - schema (4-4-2, 4-3-3, 4-2-3-1, etc)
   - Todas as 13 formações do FIFA

5. **FormationPosition**
   - Posição de cada jogador na formação
   - x_position, y_position (coordenadas)

#### fnc_championships/models.py
1. **Championship**
   - name, description, rules
   - championship_type (KNOCKOUT, LEAGUE)
   - enrollment_start, enrollment_end
   - enrollment_fee, prize_pool
   - status (DRAFT, OPEN, IN_PROGRESS, FINISHED)

2. **ChampionshipEnrollment**
   - championship, team
   - payment_status, payment_id

3. **ChampionshipPrize**
   - position, amount
   - winner_team

4. **Bracket**
   - Chaveamento (mata-mata)
   - structure (JSONField)

5. **Standings**
   - Classificação (pontos corridos)
   - matches_played, wins, draws, losses
   - goals_for, goals_against, points

## 🚀 Como Iniciar o Projeto

### Opção 1: Desenvolvimento Local

1. **Instalar dependências**:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

2. **Configurar banco de dados**:
Edite `backend/.env` e configure o PostgreSQL:
```
DATABASE_URL=postgresql://fnc_user:fnc_password123@localhost:5432/fnc_db
```

Ou use SQLite para desenvolvimento rápido:
```python
# Em config/settings.py, substitua a linha do DATABASES por:
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
```

3. **Executar migrations**:
```bash
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
```

4. **Iniciar servidor**:
```bash
python manage.py runserver
```

Acesse:
- API: http://localhost:8000
- Admin: http://localhost:8000/admin

### Opção 2: Com Docker

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f backend

# Executar migrations
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Criar superusuário
docker-compose exec backend python manage.py createsuperuser

# Parar serviços
docker-compose down
```

## 📋 Próximos Passos

### 1. Completar Modelos Backend (1-2 semanas)

Criar modelos em:
- `fnc_matches/models.py` - Match, MatchReport, Goal, Assist, Card, Contestation
- `player_stats/models.py` - PlayerStatistics
- `fnc_notifications/models.py` - Notification
- `fnc_payments/models.py` - Payment, Transaction

### 2. Django Admin (3 dias)

Registrar todos os modelos no admin para gerenciamento:
```python
# users/admin.py
from django.contrib import admin
from .models import User, PlayerProfile, TeamOwnerProfile

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'full_name', 'user_type', 'platform']
    list_filter = ['user_type', 'platform', 'is_active']
    search_fields = ['email', 'first_name', 'last_name']

# ... fazer para todos os modelos
```

### 3. Serializers e API (2 semanas)

Criar serializers DRF e ViewSets:
```python
# users/serializers.py
from rest_framework import serializers
from .models import User, PlayerProfile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'user_type', 'platform']

class PlayerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = PlayerProfile
        fields = '__all__'

# users/views.py
from rest_framework import viewsets
from .models import PlayerProfile
from .serializers import PlayerProfileSerializer

class PlayerProfileViewSet(viewsets.ModelViewSet):
    queryset = PlayerProfile.objects.all()
    serializer_class = PlayerProfileSerializer
```

### 4. URLs e Routers (2 dias)

```python
# config/urls.py
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import PlayerProfileViewSet
# ... outros ViewSets

router = DefaultRouter()
router.register(r'players', PlayerProfileViewSet)
# ... outros registros

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    path('api/auth/', include('dj_rest_auth.urls')),
    path('api/auth/registration/', include('dj_rest_auth.registration.urls')),
]
```

### 5. Frontend Next.js (4-6 semanas)

Criar estrutura frontend:
```bash
cd frontend
npx create-next-app@latest . --typescript --tailwind --app
npm install axios react-query zustand
npm install @dnd-kit/core @dnd-kit/sortable
npm install konva react-konva
```

Estrutura de pastas:
```
frontend/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (player)/
│   │   └── dashboard/page.tsx
│   ├── (owner)/
│   │   └── team/
│   │       ├── manage/page.tsx
│   │       └── formation/page.tsx
│   └── championships/
│       └── [id]/page.tsx
├── components/
│   ├── ui/              # Componentes genéricos
│   ├── formations/      # Campo visual
│   └── statistics/      # Gráficos
├── lib/
│   ├── api.ts          # Chamadas API
│   └── auth.ts         # Autenticação
└── types/
    └── index.ts        # TypeScript types
```

### 6. Funcionalidades Chave

#### A. Registro de Jogador
```typescript
// app/(auth)/register/page.tsx
export default function RegisterPage() {
  const handleRegister = async (data: RegisterData) => {
    const response = await fetch('http://localhost:8000/api/auth/registration/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    // ...
  };

  return (
    <form onSubmit={handleSubmit(handleRegister)}>
      {/* Campos do formulário */}
    </form>
  );
}
```

#### B. Transição Jogador → Dono
```python
# users/views.py
from rest_framework.decorators import action
from rest_framework.response import Response

class PlayerProfileViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['post'])
    def become_owner(self, request):
        user = request.user
        if user.user_type != 'PLAYER':
            return Response({'error': 'Apenas jogadores podem virar donos'}, status=400)
        
        # Criar perfil de dono
        TeamOwnerProfile.objects.create(user=user)
        user.user_type = 'TEAM_OWNER'
        user.save()
        
        # Desativar perfil de jogador
        user.player_profile.is_active = False
        user.player_profile.save()
        
        return Response({'message': 'Agora você é um dono de time!'})
```

#### C. Escalação Visual (Campo com Drag & Drop)
```typescript
// components/formations/PitchFormation.tsx
import { Stage, Layer, Image, Circle, Text } from 'react-konva';
import { useDndKit } from '@dnd-kit/core';

export function PitchFormation({ formation, players }) {
  return (
    <Stage width={800} height={600}>
      <Layer>
        {/* Imagem do campo */}
        <Image src="/pitch.png" />
        
        {/* Jogadores */}
        {players.map(player => (
          <Circle
            key={player.id}
            x={player.x}
            y={player.y}
            radius={20}
            draggable
            onDragEnd={(e) => handleDragEnd(player.id, e)}
          />
        ))}
      </Layer>
    </Stage>
  );
}
```

#### D. Controle de Acesso por Inscrição
```python
# fnc_teams/permissions.py
from rest_framework import permissions

class HasActiveChampionshipEnrollment(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if user.user_type != 'TEAM_OWNER':
            return False
        
        team = user.owned_teams.first()
        if not team:
            return False
        
        return team.has_active_championship
```

### 7. Integração de Pagamentos (1 semana)

```python
# fnc_payments/stripe_service.py
import stripe
from django.conf import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

def create_payment_intent(amount, championship_enrollment):
    intent = stripe.PaymentIntent.create(
        amount=int(amount * 100),  # Centavos
        currency='brl',
        metadata={'enrollment_id': championship_enrollment.id}
    )
    return intent

# fnc_payments/views.py
from rest_framework.decorators import api_view

@api_view(['POST'])
def create_enrollment_payment(request):
    enrollment_id = request.data.get('enrollment_id')
    enrollment = ChampionshipEnrollment.objects.get(id=enrollment_id)
    
    intent = create_payment_intent(
        enrollment.championship.enrollment_fee,
        enrollment
    )
    
    return Response({'client_secret': intent.client_secret})
```

## 📊 Cronograma Completo

| Fase | Tarefa | Tempo Estimado |
|------|--------|----------------|
| 1 | ✅ Estrutura base Django | Completo |
| 2 | Completar modelos restantes | 1 semana |
| 3 | Admin Django | 3 dias |
| 4 | Serializers e ViewSets | 2 semanas |
| 5 | Autenticação e OAuth | 1 semana |
| 6 | Setup Frontend Next.js | 3 dias |
| 7 | Componentes UI base | 1 semana |
| 8 | Telas de autenticação | 3 dias |
| 9 | Dashboard jogador | 1 semana |
| 10 | Gestão de times | 2 semanas |
| 11 | Escalação visual | 2 semanas |
| 12 | Campeonatos | 2 semanas |
| 13 | Sistema de partidas | 2 semanas |
| 14 | Contestações | 1 semana |
| 15 | Estatísticas | 1 semana |
| 16 | Pagamentos | 1 semana |
| 17 | Testes | 2 semanas |
| 18 | Deploy | 1 semana |

**Total: ~5 meses**

## 🎯 MVP (2-3 meses)

Para um MVP funcional, focar em:
1. ✅ Cadastro e login
2. ✅ Perfil de jogador
3. ✅ Criação de time
4. Escalação básica (sem drag & drop)
5. Campeonato simples (mata-mata)
6. Report de partidas (sem contestação)
7. Estatísticas básicas

## 📞 Contato e Suporte

Para dúvidas:
- Documentação Django: https://docs.djangoproject.com/
- DRF: https://www.django-rest-framework.org/
- Next.js: https://nextjs.org/docs
- TailwindCSS: https://tailwindcss.com/docs

---

**Status Atual: Base sólida criada, pronto para desenvolvimento de features!** 🚀
