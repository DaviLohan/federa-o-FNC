# IMPERIUM — Histórico de Sessões de Desenvolvimento

> **Plataforma**: IMPERIUM (gestão de ligas e campeonatos de EA SPORTS FC Pro Clubs)
> **Stack**: Next.js 15 + React 19 + TypeScript + Tailwind CSS + Framer Motion v12 (frontend) / Django 5 + DRF (backend)
> **Última atualização**: 09 de Março de 2026

---

## Identidade Visual

| Elemento | Valor |
|---|---|
| Fundo principal | `#07090D` |
| Destaque dourado | `#D6A11E` (`--gold`) |
| Superfície 1 | `bg-surface1` |
| Superfície 2 | `bg-surface2` |
| Bordas | `border-white/[0.06]` |
| Fontes | Space Grotesk (títulos) / Inter (corpo) |

Todo texto e toda mensagem do sistema estão em **português brasileiro**.

---

## Arquitetura Geral (Descobertas)

- Backend usa **soft delete** (`is_active=False`) — nunca deleta dados reais
- Backend retorna `{ message, token, user }` no login e no registro
- Login usa **email** (não username)
- Platform choices do backend: `'PS'`, `'XBOX'`, `'PC'`
- Interface `Match` usa `team_home` / `team_away` e `home_score` / `away_score`
- Auth token armazenado em dois lugares: Zustand store (`auth-storage` no localStorage) e `localStorage.getItem('token')` (lido diretamente pelo `apiClient`)
- A página `/profile` lê **tudo do store Zustand** — não faz fetch próprio ao montar

---

## Sessão 1 — Landing Page Profissional

### Objetivo
Criar uma landing page no estilo FACEIT/ESL, substituindo a página inicial genérica.

### Pacotes instalados
- `framer-motion` v12

### Arquivos criados / reescritos

| Arquivo | Status |
|---|---|
| `frontend/app/page.tsx` | Reescrito — nova ordem de seções |
| `frontend/components/landing/Hero.tsx` | Reescrito |
| `frontend/components/landing/Benefits.tsx` | Criado do zero |
| `frontend/components/landing/Stats.tsx` | Reescrito |
| `frontend/components/landing/HowItWorks.tsx` | Reescrito |
| `frontend/components/landing/Features.tsx` | Reescrito |
| `frontend/components/landing/ActiveChampionships.tsx` | Criado do zero |
| `frontend/components/landing/FinalCTA.tsx` | Reescrito |
| `frontend/tailwind.config.ts` | 4 novos keyframes de animação adicionados |

---

## Sessão 2 — Correção de Erros TypeScript (zero erros)

### Objetivo
Eliminar todos os erros de TypeScript do projeto para garantir build limpo.

### Arquivos corrigidos

| Arquivo | Problema corrigido |
|---|---|
| `app/matches/[id]/page.tsx` | Tipos incorretos em props e dados de partida |
| `app/matches/page.tsx` | Tipagem de match com campos errados |
| `app/notifications/page.tsx` | Tipos de notificação |
| `app/penalties/page.tsx` | Tipos de penalidade |
| `components/championships/modals/ContestationModal.tsx` | Tipos de contestação |
| `components/championships/modals/MatchReportModal.tsx` | Tipos de report |
| `components/championships/tabs/MatchesTab.tsx` | Campos de partida |
| `components/championships/tabs/ReportsTab.tsx` | Tipos de report |
| `lib/hooks/usePermissions.ts` | Tipo de retorno do hook |
| `components/dashboard/MatchCard.tsx` | Campos `team_a`/`team_b` → `team_home`/`team_away` |

---

## Sessão 3 — Bug: Perfil em Branco Após Registro

### Sintoma
Após o cadastro, o usuário era redirecionado para `/profile` mas a página ficava em branco — sem nome, sem dados.

### Causa raiz
O registro chamava `login(response.token, response.user)` com o objeto `user` **antes** de atualizar o perfil do jogador. O store Zustand guardava um user desatualizado (sem `player_profile` preenchido).

### Solução
Em `app/register/page.tsx`:
1. Após `playerProfilesAPI.updateWithToken()`, buscar `/api/v1/users/me/` via `apiClient.getWithToken()`
2. Salvar o user **atualizado** no store com `login(token, updatedUser)`

### Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `lib/api-client.ts` | Adicionado método `getWithToken<T>(url, token)` |
| `app/register/page.tsx` | Busca user atualizado antes de chamar `login()` |

---

## Sessão 4 — Funcionalidade: Exclusão / Desativação de Conta

### Objetivo
Permitir que o usuário exclua (desative) a própria conta diretamente pelo perfil.

### Comportamento implementado
- Seção "Zona de Perigo" no final da página `/profile`
- Modal de confirmação exige que o usuário **digite o próprio email** para confirmar
- Ao confirmar, chama `DELETE /api/v1/users/{id}/` (soft delete no backend)
- Faz logout automático e redireciona para `/`

### Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `lib/api.ts` | Adicionado `usersAPI.deleteAccount(id)` |
| `app/profile/page.tsx` | Seção "Zona de Perigo" + modal de confirmação com validação de email |

---

## Sessão 5 — Bug: "Email já existe" para Conta Desativada

### Sintoma
Ao tentar registrar com o email de uma conta que havia sido desativada (soft deleted), o backend retornava `"Um usuário com este email já existe."` — impedindo o cadastro.

### Causa raiz
O DRF gera automaticamente um `UniqueValidator` para campos com `unique=True`. Esse validator rodava **antes** do método `validate_email()` customizado, bloqueando o fluxo antes de verificar se a conta estava desativada.

### Solução

`backend/users/serializers.py`:
- `extra_kwargs = {'email': {'validators': []}}` — remove o `UniqueValidator` automático
- `validate_email()` customizado: se o email pertencer a conta desativada, permite continuar; se pertencer a conta ativa, levanta `ValidationError`
- `create()` com lógica de reativação: detecta conta desativada e reutiliza o registro existente

`backend/users/views.py`:
- `Token.objects.get_or_create(user=user)` em vez de `Token.objects.create()` — evita `IntegrityError` quando a conta é reativada e o token já existe

### Arquivos modificados

| Arquivo | O que mudou |
|---|---|
| `backend/users/serializers.py` | `extra_kwargs`, `validate_email()` customizado, `create()` com reativação |
| `backend/users/views.py` | `get_or_create` para Token no registro |

---

## Sessão 6 — Melhorias de Estabilidade (QueryClient e MatchCard)

### QueryClient global (`components/providers.tsx`)
- Adicionados `retry: false` e `throwOnError: false` como defaults para todas as queries
- Evita que o erro 404 de `/api/v1/teams/my-team/` (para usuários sem time) apareça como erro não tratado no console

### MatchCard (`components/dashboard/MatchCard.tsx`)
- Corrigidos campos: `team_a`/`team_b` e `score_a`/`score_b` → `team_home`/`team_away` e `home_score`/`away_score`
- Adicionados status `PENDING`, `IN_PROGRESS`, `CANCELLED` ao `statusConfig`

---

## Sessão 7 — Investigação do AxiosError 400 e Fix do ImportError

### Contexto
Um `AxiosError` aparecia no console do browser ao navegar pelo sistema. Foi adicionado log detalhado no interceptor do Axios (`api-client.ts`) para identificar a URL exata:

```ts
console.error(`[API ERROR] ${method} ${url} → ${status}`, data);
```

### Investigação

Durante a investigação, foi encontrado um bug real e crítico no backend:

**`backend/fnc_matches/views.py`** referenciava `TeamMember` (modelo inexistente) em 8 locais diferentes. O modelo correto é `TeamMembership`.

Isso causava `ImportError: cannot import name 'TeamMember' from 'fnc_teams.models'` em todos os endpoints afetados:

| Endpoint | Método | Resultado antes do fix |
|---|---|---|
| `/api/v1/confirmations/` | GET | 500 (Django HTML de erro) |
| `/api/v1/confirmations/` | POST | 500 |
| `/api/v1/confirmations/{id}/confirm/` | POST | 500 |
| `/api/v1/confirmations/{id}/decline/` | POST | 500 |
| `/api/v1/proposals/` | GET | 500 |
| `/api/v1/proposals/` | POST | 500 |
| `/api/v1/proposals/{id}/respond/` | POST | 500 |
| `/api/v1/penalties/` | GET | 500 |

### Causa do bug
O modelo `TeamMembership` tem os campos:
- `team` (ForeignKey → Team)
- `player` (ForeignKey → PlayerProfile)
- `is_active` (BooleanField)
- `role` (CharField)

O código incorreto usava `TeamMember` com campos `user` e `status='ACTIVE'`, que não existem nesse modelo.

### Correção aplicada (`backend/fnc_matches/views.py`)

1. Import top-level alterado:
```python
# antes
from fnc_teams.models import Team

# depois
from fnc_teams.models import Team, TeamMembership
```

2. Todos os `from fnc_teams.models import TeamMember` inline removidos

3. Filtros corrigidos:
```python
# antes (incorreto)
TeamMember.objects.filter(team=X, user=user, status='ACTIVE')

# depois (correto)
TeamMembership.objects.filter(team=X, player__user=user, is_active=True)
```

4. Filtros de Team corrigidos:
```python
# antes (incorreto)
Team.objects.filter(members__user=user, members__status='ACTIVE')

# depois (correto)
Team.objects.filter(teammembership__player__user=user, teammembership__is_active=True)
```

### Resultado após o fix

| Endpoint | Status |
|---|---|
| `GET /api/v1/confirmations/` | 200 |
| `GET /api/v1/proposals/` | 200 |
| `GET /api/v1/penalties/` | 200 |

---

## Resumo de Todos os Arquivos Modificados nas Sessões

### Frontend (`/home/davilohan/projects/FNC/frontend/`)

```
app/
  page.tsx                                    (landing page)
  register/page.tsx                           (bug perfil em branco)
  profile/page.tsx                            (exclusão de conta)
  matches/[id]/page.tsx                       (TypeScript)
  matches/page.tsx                            (TypeScript)
  notifications/page.tsx                      (TypeScript)
  penalties/page.tsx                          (TypeScript)

components/
  landing/
    Hero.tsx
    Benefits.tsx                              (novo)
    Stats.tsx
    HowItWorks.tsx
    Features.tsx
    ActiveChampionships.tsx                   (novo)
    FinalCTA.tsx
  dashboard/
    MatchCard.tsx                             (campos corrigidos)
  championships/
    modals/ContestationModal.tsx              (TypeScript)
    modals/MatchReportModal.tsx               (TypeScript)
    tabs/MatchesTab.tsx                       (TypeScript)
    tabs/ReportsTab.tsx                       (TypeScript)
  providers.tsx                               (retry:false, throwOnError:false)

lib/
  api-client.ts                               (getWithToken + log no interceptor)
  api.ts                                      (usersAPI.deleteAccount)
  hooks/usePermissions.ts                     (TypeScript)

tailwind.config.ts                            (4 novos keyframes)
```

### Backend (`/home/davilohan/projects/FNC/backend/`)

```
users/
  serializers.py    (extra_kwargs + validate_email + create com reativação)
  views.py          (get_or_create para Token + logout seguro)

fnc_matches/
  views.py          (TeamMember → TeamMembership em 8 locais)
```

---

## Como Rodar o Projeto

### Backend (Django)
```bash
cd /home/davilohan/projects/FNC/backend
/home/davilohan/projects/FNC/backend/venv/bin/python manage.py runserver 8000 > /tmp/django.log 2>&1 &
```

### Frontend (Next.js)
```bash
cd /home/davilohan/projects/FNC/frontend
npm run dev > /tmp/nextjs.log 2>&1 &
```

### Verificar servidores
```bash
# Django
tail -f /tmp/django.log

# Next.js
tail -f /tmp/nextjs.log

# Processos
ps aux | grep -E "manage.py|next" | grep -v grep
```

---

## Problemas Conhecidos / Em Aberto

| # | Descrição | Status |
|---|---|---|
| 1 | `AxiosError` no console após login — URL exata ainda não confirmada pelo usuário | Em investigação |
| 2 | Warnings do Django sobre `ACCOUNT_AUTHENTICATION_METHOD` depreciado (allauth) | Cosmético, não afeta funcionamento |

---

## Notas Técnicas Importantes

### Por que `TeamMembership` e não `TeamMember`?
O `Team` usa uma ManyToMany com `PlayerProfile` **através** de `TeamMembership`. A relação correta para filtrar por usuário é sempre via `player__user`, pois `PlayerProfile` tem ForeignKey para `User`.

### Por que `extra_kwargs = {'email': {'validators': []}}`?
O DRF adiciona `UniqueValidator` automaticamente a campos com `unique=True` no model. Esse validator roda na fase de campo (antes de `validate_email()`), então precisamos removê-lo para poder implementar a lógica de reativação de conta desativada.

### Por que `get_or_create` no Token?
Ao reativar uma conta desativada, o token de autenticação pode já existir no banco (foi criado antes da desativação). Usar `create()` nesse caso causaria `IntegrityError`. `get_or_create` é idempotente e seguro.
