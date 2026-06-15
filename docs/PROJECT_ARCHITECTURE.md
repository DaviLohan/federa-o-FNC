# Project Architecture

## Overview
Plataforma full-stack de futebol virtual competitivo com frontend Next.js e backend Django/DRF.

## Runtime Topology
- Frontend: Next.js
- Backend: Django + Gunicorn
- DB: PostgreSQL
- Cache/Broker: Redis
- Async: Celery Worker + Celery Beat
- Reverse Proxy: Nginx
- TLS: Let's Encrypt

## Major Domains
- Users
- Teams
- Championships
- Matches
- Player Stats
- Notifications
- Payments
- EA Integration

## Backend Apps
- `users`: autenticacao, perfis, verificacao de email, reset de senha
- `fnc_teams`: times, memberships, convites, formacoes, pedidos de saida
- `fnc_championships`: campeonatos, inscricoes, standings, grupos, bracket, agenda
- `fnc_matches`: partidas, reports, gols, assistencias, cartoes, contestacoes, WO
- `player_stats`: estatisticas, rankings, season summaries, weekly selection
- `fnc_notifications`: notificacoes in-app e email
- `fnc_payments`: pagamentos, webhooks, status de inscricao
- `ea_integration`: clubes EA, aliases, partidas EA, report via EA, relay

## Key Data Flows
1. User auth -> token -> frontend API client
2. Team membership and permission resolution
3. Championship lifecycle -> enrollments -> scheduling -> matches
4. Match report flow -> EA/manual -> events -> stats recomputation
5. Knockout bracket advancement -> aggregate -> next round creation
6. Payment webhook -> enrollment/payment state sync

## Frontend Structure
- `frontend/app/`: rotas App Router
- `frontend/components/`: componentes de dominio e UI
- `frontend/lib/`: client HTTP, stores, hooks, utils

## Production
- Main domain: `https://proeleven11.tech`
- Old domains redirect to main domain
- Main server path: `/opt/fnc/app`
- Production orchestration: `docker-compose.prod.yml`

## Critical Constraints
- `home_score=0` e `away_score=0` nao significam necessariamente resultado oficial
- Bracket deve reconciliar com `Match` real do banco
- Quartas e semi podem ser ida/volta; final pode ser jogo unico
- Fluxo EA e uma area critica e nao deve ser alterado sem validacao ampla
