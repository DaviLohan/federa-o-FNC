# 📊 Schema do Banco de Dados - FNC

## Diagrama de Relacionamentos

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USERS & PROFILES                              │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────┐
         │      User        │
         ├──────────────────┤
         │ PK id            │
         │ email (unique)   │
         │ first_name       │
         │ last_name        │
         │ user_type        │◄───────┐
         │ platform         │        │
         │ is_active        │        │
         │ date_joined      │        │
         └────────┬─────────┘        │
                  │                  │
         ┌────────┴────────┐         │
         │                 │         │
    ┌────▼────┐      ┌─────▼─────┐  │
    │ Player  │      │TeamOwner  │  │
    │ Profile │      │  Profile  │  │
    ├─────────┤      ├───────────┤  │
    │ FK user │      │ FK user   │  │
    │ player_n│      │ bio       │  │
    │ gamer_ta│      │ avatar    │  │
    │ shirt_nu│      └───────────┘  │
    │ primary_│                     │
    │ position│                     │
    │ birth_da│                     │
    │ whatsapp│                     │
    └─────────┘                     │
                                    │
┌─────────────────────────────────────────────────────────────────────────┐
│                              TEAMS                                       │
└─────────────────────────────────────────────────────────────────────────┘

              ┌──────────────────┐
              │      Team        │
              ├──────────────────┤
              │ PK id            │
              │ FK owner ────────┼──────────┐
              │ name (unique)    │          │
              │ abbreviation     │          │
              │ logo             │          │
              │ description      │          │
              └────┬──────┬──────┘          │
                   │      │                 │
      ┌────────────┘      └────────────┐    │
      │                                │    │
      │                                │    │
┌─────▼──────────┐              ┌─────▼────▼──────┐
│ TeamMembership │              │ TeamInvitation  │
├────────────────┤              ├─────────────────┤
│ FK team        │              │ FK team         │
│ FK player      │              │ FK player       │
│ role           │              │ FK invited_by   │
│ joined_at      │              │ status          │
└────────────────┘              │ message         │
                                └─────────────────┘

      ┌────────────────┐
      │   Formation    │
      ├────────────────┤
      │ PK id          │
      │ FK team        │◄──┐
      │ name           │   │
      │ schema         │   │
      │ is_default     │   │
      └────────┬───────┘   │
               │           │
        ┌──────▼──────────┐│
        │FormationPosition││
        ├─────────────────┤│
        │ FK formation    ││
        │ FK player       ││
        │ position        ││
        │ x_position      ││
        │ y_position      ││
        └─────────────────┘│

┌─────────────────────────────────────────────────────────────────────────┐
│                          CHAMPIONSHIPS                                   │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────────┐
         │   Championship       │
         ├──────────────────────┤
         │ PK id                │
         │ name                 │
         │ description          │
         │ rules                │
         │ championship_type    │ (KNOCKOUT/LEAGUE)
         │ status               │ (DRAFT/OPEN/IN_PROGRESS/FINISHED)
         │ enrollment_start     │
         │ enrollment_end       │
         │ start_date           │
         │ enrollment_fee       │
         │ prize_pool           │
         │ FK created_by        │
         └──┬────────┬──────┬───┘
            │        │      │
   ┌────────┘        │      └──────────┐
   │                 │                 │
┌──▼─────────────┐ ┌─▼─────────┐ ┌────▼──────┐
│Championship    │ │  Bracket  │ │ Standings │
│  Enrollment    │ ├───────────┤ ├───────────┤
├────────────────┤ │ FK champ  │ │ FK champ  │
│ FK championship│ │ structure │ │ FK team   │
│ FK team        │ │ (JSON)    │ │ matches   │
│ status         │ └───────────┘ │ wins/draws│
│ payment_status │               │ losses    │
│ payment_id     │               │ goals_for │
└────────────────┘               │ goals_agai│
                                 │ points    │
┌─────────────────┐              └───────────┘
│Championship     │
│    Prize        │
├─────────────────┤
│ FK championship │
│ position        │
│ amount          │
│ FK winner_team  │
└─────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                            MATCHES                                       │
└─────────────────────────────────────────────────────────────────────────┘

         ┌──────────────────┐
         │      Match       │
         ├──────────────────┤
         │ PK id            │
         │ FK championship  │
         │ FK home_team     │
         │ FK away_team     │
         │ match_date       │
         │ status           │
         │ home_score       │
         │ away_score       │
         └────┬──────┬──────┘
              │      │
     ┌────────┘      └────────┐
     │                        │
┌────▼─────────┐        ┌─────▼─────────┐
│ MatchReport  │        │ Contestation  │
├──────────────┤        ├───────────────┤
│ FK match     │        │ FK match_rep  │
│ FK reported_ │        │ FK contested_ │
│    by_team   │        │    by_team    │
│ status       │        │ reason        │
└──────────────┘        │ status        │
                        │ resolution    │
                        └───────────────┘

┌────────────────┐
│ MatchStatistic │ (Goals, Assists, Cards)
├────────────────┤
│ FK match       │
│ FK player      │
│ type           │ (GOAL/ASSIST/YELLOW_CARD/RED_CARD)
│ minute         │
└────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                      STATISTICS & NOTIFICATIONS                          │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│ PlayerStatistics │         │  Notification    │
├──────────────────┤         ├──────────────────┤
│ FK player        │         │ FK user          │
│ FK championship  │         │ type             │
│ total_matches    │         │ title            │
│ goals            │         │ message          │
│ assists          │         │ is_read          │
│ wins             │         │ created_at       │
│ draws            │         └──────────────────┘
│ losses           │
│ win_rate         │         ┌──────────────────┐
└──────────────────┘         │    Payment       │
                             ├──────────────────┤
┌──────────────────┐         │ FK user          │
│  TeamStatistics  │         │ FK championship_ │
├──────────────────┤         │    enrollment    │
│ FK team          │         │ amount           │
│ FK championship  │         │ payment_method   │
│ total_matches    │         │ status           │
│ wins             │         │ external_id      │
│ goals_for        │         │ created_at       │
│ goals_against    │         └──────────────────┘
└──────────────────┘
```

## Relacionamentos Principais

### 1. User → Profiles (1:1)
- Um User pode ter um PlayerProfile OU um TeamOwnerProfile
- Quando jogador vira dono, PlayerProfile.is_active = False

### 2. Team → Players (M:N através de TeamMembership)
- Um Team pode ter vários Players
- Um Player pode estar em vários Teams (histórico)
- TeamMembership rastreia role e datas

### 3. Team → Formation (1:N)
- Um Team pode ter várias Formations
- Apenas uma pode ser is_default=True

### 4. Formation → Players (M:N através de FormationPosition)
- Armazena posição exata (x, y) de cada jogador

### 5. Championship → Teams (M:N através de ChampionshipEnrollment)
- Enrollment rastreia status de pagamento e aprovação
- Apenas times APPROVED têm acesso completo

### 6. Championship → Matches (1:N)
- Matches são geradas automaticamente ao iniciar o campeonato
- Bracket (mata-mata) ou Standings (pontos corridos)

### 7. Match → Reports e Contestations
- Report inicial feito por um time
- Outro time pode Contestar
- Admin resolve a contestação

## Regras de Negócio no Banco

### Triggers e Constraints

1. **TeamMembership**: unique_together=['team', 'player']
   - Um jogador não pode estar duplicado no mesmo time

2. **Formation**: Ao salvar com is_default=True
   - Remove is_default de outras formações do mesmo time

3. **ChampionshipEnrollment**: unique_together=['championship', 'team']
   - Um time só pode se inscrever uma vez por campeonato

4. **FormationPosition**: unique_together=['formation', 'player']
   - Um jogador só pode ter uma posição por formação

### Índices Recomendados

```python
# Em cada modelo:
class Meta:
    indexes = [
        models.Index(fields=['email']),           # User
        models.Index(fields=['gamer_tag']),       # PlayerProfile
        models.Index(fields=['status']),          # Championship, Match
        models.Index(fields=['-created_at']),     # Ordenação
    ]
```

## Queries Comuns

### 1. Times inscritos em campeonatos ativos
```python
Team.objects.filter(
    enrollments__championship__status='IN_PROGRESS',
    enrollments__status='APPROVED'
)
```

### 2. Jogadores de um time específico
```python
PlayerProfile.objects.filter(
    teammembership__team=team,
    teammembership__is_active=True
)
```

### 3. Estatísticas de um jogador
```python
PlayerStatistics.objects.filter(
    player=player
).aggregate(
    total_goals=Sum('goals'),
    total_assists=Sum('assists'),
    avg_win_rate=Avg('win_rate')
)
```

### 4. Ranking de artilheiros
```python
PlayerStatistics.objects.filter(
    championship=championship
).order_by('-goals')[:10]
```

### 5. Próximas partidas de um time
```python
Match.objects.filter(
    Q(home_team=team) | Q(away_team=team),
    status='SCHEDULED',
    match_date__gte=timezone.now()
).order_by('match_date')
```

---

**Total de Tabelas: ~20**
**Total de Relacionamentos: ~25**
