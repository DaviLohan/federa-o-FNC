# Project Context - Pro Eleven / FNC Platform

Este documento serve como contexto mestre para outra IA (ex.: Claude) assumir a gestao tecnica e operacional deste projeto com o maximo de continuidade possivel.

## Objetivo deste documento

Dar a uma IA externa todo o contexto necessario para:
- entender a arquitetura do sistema
- entender o historico recente de mudancas
- entender as regras de negocio criticas
- entender o estado atual da producao
- saber quais areas sao sensiveis
- continuar execucao, suporte, manutencao e evolucao com seguranca

---

## 1. Visao geral do projeto

Este projeto e uma plataforma de campeonatos de futebol virtual/eSports.

Nome atual da marca:
- **Pro Eleven**

Dominio atual de producao:
- `https://proeleven11.tech`

Dominios antigos:
- `https://imperiumfederacao.com`
- `https://www.imperiumfederacao.com`

Os dominios antigos devem redirecionar para:
- `https://proeleven11.tech`

Hospedagem de producao:
- Hostinger VPS / servidor Linux
- aplicacao rodando via Docker Compose

Pasta do projeto no servidor:
- `/opt/fnc/app`

Objetivo principal da plataforma:
- gerenciar campeonatos
- times
- jogadores
- partidas
- reporte automatico/manual
- integracao com EA para reporte
- classificacao
- estatisticas
- chaveamento mata-mata
- contestacoes
- regras administrativas

---

## 2. Stack tecnica

### Backend
- Python
- Django
- Django REST Framework

### Frontend
- Next.js
- React
- TypeScript

### Banco
- PostgreSQL

### Infra
- Docker
- Docker Compose
- Nginx
- Certbot / Let's Encrypt

### Async / tasks
- Redis
- Celery worker
- Celery beat

---

## 3. Estrutura de producao

Servicos principais em producao:
- `backend`
- `frontend`
- `nginx`
- `db`
- `redis`
- `celery_worker`
- `celery_beat`

Compose de producao:
- `docker-compose.prod.yml`

Nginx:
- `nginx/nginx.conf`

Certificados:
- `nginx/certs/fullchain.pem`
- `nginx/certs/privkey.pem`

---

## 4. Estado atual do dominio

### Dominio principal atual
- `proeleven11.tech`

### WWW
- `www.proeleven11.tech`

### Redirecionamentos esperados
- `imperiumfederacao.com` -> `https://proeleven11.tech`
- `www.imperiumfederacao.com` -> `https://proeleven11.tech`

### Certificado atual
O certificado deve cobrir:
- `proeleven11.tech`
- `www.proeleven11.tech`
- `imperiumfederacao.com`
- `www.imperiumfederacao.com`

### Configuracoes criticas de dominio
Arquivos e variaveis sensiveis:
- `docker-compose.prod.yml`
  - `NEXT_PUBLIC_API_URL`
- `backend/.env`
  - `ALLOWED_HOSTS`
  - `CSRF_TRUSTED_ORIGINS`
  - `CORS_ALLOWED_ORIGINS`
  - `SITE_URL`
  - `FRONTEND_URL`
- `nginx/nginx.conf`
  - `server_name`

---

## 5. Arquitetura da API atual

A API principal do sistema e a `api/v1`.

Arquivo principal de rotas:
- `backend/config/urls.py`

Inclui:
- `users`
- `fnc_teams`
- `fnc_championships`
- `fnc_matches`
- `player_stats`
- `fnc_notifications`
- `fnc_payments`
- `ea_integration`

### Observacao importante
Existe intencao comercial/tecnica de criar uma **nova API dedicada**, separada da API principal, para uso externo/controlado.
Essa nova API ainda nao esta formalizada no codigo como camada independente.
A recomendacao e:
- **nao expor a API interna atual diretamente para clientes externos**
- criar uma nova camada dedicada em outro app, com payloads limitados e escopo fechado

---

## 6. Regras de negocio criticas

### 6.1 Regras de report de partidas
O sistema suporta:
- reporte via EA
- reporte manual
- contestacao de report
- confirmacao de resultado
- WO (walkover)

### 6.2 Regras de permissoes de report
Quem pode reportar, conforme regra atual:
- owner do time
- captain
- commission
- supervisor/admin

Usuario comum:
- nao deve reportar, salvo excecao explicita do sistema

### 6.3 Fluxo ideal de report
Para uma partida reportavel:
1. partida fica `IN_PROGRESS` ou `FINISHED`
2. usuario elegivel pode reportar
3. fluxo EA tenta localizar a partida correspondente
4. ao confirmar:
   - placar
   - gols
   - assistencias
   - cartoes
   - estatisticas
   - status do report
   - estatisticas derivadas
   - atualizacao do chaveamento, se aplicavel

---

## 7. Integracao EA

Arquivo central:
- `backend/ea_integration/report_service.py`

Classe principal:
- `MatchReportEAService`

Responsabilidades principais:
- `fetch_ea_report(match, user)`
- `confirm_report(match, ea_match_id, user)`
- `contest_report(match, ea_match_id, user, reason, description)`

A integracao EA e uma area critica do sistema.
Ela precisa ser preservada com cuidado.
Mudancas no fluxo de report podem quebrar:
- estatisticas
- gols
- assistencias
- atualizacao de mata-mata
- consistencia de resultados

### Limitacoes conhecidas
- relay pode sofrer rate-limit
- disponibilidade da EA pode variar
- alguns cenarios antigos exigem reconciliacao manual

---

## 8. Estado atual do mata-mata / chaveamento

Esta e uma das areas mais sensiveis do projeto.

### Arquivos principais do frontend
- `frontend/components/championships/tabs/BracketTabV2.tsx`
- `frontend/components/championships/tabs/BracketMatchCard.tsx`
- `frontend/app/championships/[id]/page.tsx`

### Arquivos principais do backend
- `backend/fnc_championships/services/__init__.py`
- `backend/fnc_championships/services/schedule_utils.py`
- `backend/fnc_matches/views.py`
- `backend/fnc_matches/contestation_services.py`
- `backend/fnc_matches/match_services/walkover.py`
- `backend/ea_integration/report_service.py`

### Problemas historicos ja encontrados
- times sumindo do bracket
- avanco prematuro de vencedor
- ida/volta sendo tratada como jogo unico
- agregado aparecendo como `0x0` falso
- botao de report em confronto ja encerrado
- semifinal/final preenchidas cedo demais
- diferencas entre `bracket.structure` e `Match` real do banco

### Decisao de negocio atual para mata-mata
- **Quartas:** ida e volta
- **Semi-final:** ida e volta
- **Final:** jogo unico

### Regra de fechamento do confronto
Se houver ida e volta:
- o confronto **nao fecha na ida**
- o vencedor so deve ser definido apos as duas pernas finalizadas
- salvo decisao administrativa explicita

### Regra de WO definida
A interpretacao do WO foi um ponto delicado.
Regra operacional adotada:
- `walkover_team` representa o time que sofreu WO/perdeu
- nao assumir automaticamente que WO na ida encerra todo confronto, a menos que exista decisao administrativa

---

## 9. Estado especifico do campeonato 3

Campeonato sensivel e ja bastante manipulado em producao.

### Situacao geral
- tipo: `GROUPS_KNOCKOUT`
- fase atual: `KNOCKOUT`

### Quartas
Ja houve varios ajustes manuais e automaticos.

### Semis
Estado desejado:
- ida hoje as 21:10
- volta amanha as 21:10
- duas partidas por confronto
- report da ida hoje
- report da volta amanha
- agregado so apos resultados reais

Partidas da semi:
- `63` Xumbrega SC x Alianca EC
- `64` Gorillas Team x Favela eSports
- `65` Alianca EC x Xumbrega SC
- `66` Favela eSports x Gorillas Team

### Final
- deve permanecer jogo unico
- sem criar volta

### Regras visuais esperadas no bracket
Se a perna ainda nao ocorreu:
- mostrar data/hora
- nao mostrar `0x0` como resultado oficial
- mostrar:
  - ida: hoje/amanha as 21:10
  - volta: data/hora correspondente
  - agregado: aguardando resultados

Se ja ocorreu e nao tem report:
- status: `Aguardando report`

Se ha report pendente:
- status: `Report pendente`

Se ha report aprovado:
- status: `Resultado aprovado`

---

## 10. Decisao sobre visibilidade de partidas

### `/matches`
Comportamento desejado:
- mostrar somente partidas do(s) time(s) do usuario

### `/championships/[id]` > aba de partidas
Comportamento desejado:
- mostrar todas as partidas do campeonato
- mas permitir report apenas nas partidas em que o usuario tem permissao

### Implementacao recente
Foi introduzida logica para:
- manter `/matches` restrito
- liberar todos os jogos do campeonato via parametro especifico no contexto da aba do campeonato

Arquivos envolvidos:
- `backend/fnc_matches/views.py`
- `frontend/lib/hooks/useChampionship.ts`

---

## 11. Decisoes recentes de UI/UX no bracket

### Estado correto para jogos futuros
Jogos futuros nao devem mostrar:
- `0 x 0` como placar real
- agregado numerico falso

Devem mostrar:
- `Hoje as HH:mm`
- `Amanha as HH:mm`
- ou data/hora formatada

### Botao de report
Deve seguir estas regras:
- aparecer na perna ativa
- so para usuario com permissao
- nao aparecer se confronto ja estiver encerrado

### Card do bracket deve mostrar
- fase
- times
- status
- ida
- volta
- agregado
- botao `Ver Partida`
- botao `Reportar Partida` quando aplicavel

---

## 12. Arquivos mais importantes do projeto

### Backend
- `backend/config/urls.py`
- `backend/config/settings/base.py`
- `backend/config/settings/production.py`
- `backend/fnc_matches/models.py`
- `backend/fnc_matches/serializers.py`
- `backend/fnc_matches/views.py`
- `backend/fnc_matches/contestation_services.py`
- `backend/fnc_matches/match_services/walkover.py`
- `backend/fnc_matches/services.py`
- `backend/fnc_championships/models.py`
- `backend/fnc_championships/serializers.py`
- `backend/fnc_championships/views.py`
- `backend/fnc_championships/services/__init__.py`
- `backend/fnc_championships/services/schedule_utils.py`
- `backend/ea_integration/report_service.py`

### Frontend
- `frontend/app/championships/[id]/page.tsx`
- `frontend/app/matches/page.tsx`
- `frontend/components/championships/tabs/MatchesTab.tsx`
- `frontend/components/championships/tabs/BracketTabV2.tsx`
- `frontend/components/championships/tabs/BracketMatchCard.tsx`
- `frontend/components/championships/modals/EAReportModal.tsx`
- `frontend/components/championships/modals/MatchReportModal.tsx`
- `frontend/components/matches/ReportStatusBar.tsx`
- `frontend/lib/hooks/useChampionship.ts`
- `frontend/lib/hooks/usePermissions.ts`
- `frontend/lib/api.ts`
- `frontend/types/index.ts`

### Infra
- `docker-compose.prod.yml`
- `nginx/nginx.conf`

---

## 13. Cuidados importantes para qualquer IA que for continuar

1. **Nunca assumir que score 0 significa jogo jogado**
- no sistema atual, `home_score` e `away_score` tem `default=0`
- isso causa ambiguidade
- o frontend deve sempre considerar status/report antes de exibir placar como oficial

2. **Nao confiar so no `bracket.structure`**
- o bracket pode estar parcialmente coerente e parcialmente contaminado por estados antigos
- sempre reconciliar com `Match` real no banco

3. **Nao fechar confrontos de ida/volta cedo demais**
- isso ja causou avanco prematuro em quartas e semis

4. **Nao quebrar fluxo EA**
- `MatchReportEAService` e central
- qualquer mudanca nele deve ser feita com muito cuidado

5. **Quartas, semi e final tem comportamentos diferentes**
- quartas: ida e volta
- semi: ida e volta
- final: jogo unico

6. **Dominio ja foi migrado**
- principal agora e `proeleven11.tech`
- nao voltar a colocar `imperiumfederacao.com` como principal

---

## 14. Status operacional atual resumido

### Producao
- rodando em `proeleven11.tech`
- certificado valido
- redirecionamento do dominio antigo ativo
- containers saudaveis

### Bracket
- estrutura premium implementada
- porem continua sendo area que exige validacao constante

### Reporte
- fluxo EA funcional
- ainda pode haver casos especificos que exijam reconciliacao manual

### Projeto comercial paralelo
Existe intencao de criar uma **nova API externa dedicada**:
- com escopo fechado
- payload controlado
- sem expor a API principal inteira
- isso e assunto separado da plataforma atual

---

## 15. Como uma IA deve agir neste projeto

Se outra IA assumir:
1. primeiro ler este documento inteiro
2. depois ler os arquivos centrais listados
3. antes de mudar qualquer regra critica:
   - validar impacto em producao
   - validar quartas/semi/final
   - validar report EA
4. tratar o campeonato 3 como caso sensivel
5. manter distincao clara entre:
   - resultado oficial
   - status da partida
   - status do confronto
   - agregado
   - avanco de fase

---

## 16. Proximos pontos que merecem atencao

1. Melhorar robustez do payload do bracket vindo do backend
2. Reduzir logica de inferencia no frontend
3. Diferenciar explicitamente:
- `score inexistente`
- `score real 0x0`
4. Criar camada nova de API externa dedicada
5. Consolidar testes de ida/volta e avanco automatico

---

## 17. Regra de ouro

A plataforma deve sempre refletir o estado real dos jogos.

Nunca:
- mostrar placar oficial sem resultado oficial
- mostrar agregado falso
- avancar time cedo demais
- liberar report para usuario sem permissao
- tratar ida/volta como jogo unico quando a fase exige duas pernas

Sempre:
- usar status real
- usar report real
- usar permissao real
- usar fase/configuracao real do campeonato
- priorizar seguranca de producao
