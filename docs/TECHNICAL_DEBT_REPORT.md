# Technical Debt Report

## High Debt Areas
- Arquivos muito grandes e multi-responsabilidade
- Ausencia de CI/CD versionado
- Ausencia de testes frontend
- Modelo de auth misto/inconsistente
- Semantica ambigua de score default `0`
- Artefatos operacionais misturados ao repo

## Structural Debt
- Arquivo duplicado/espelhado de settings em `backend/ea_integration/base.py`
- Scheduler legado paralelo (`cron` + Celery Beat)
- Logica de negocio distribuida entre inferencia frontend e estado backend

## Largest Hotspots
- `backend/fnc_matches/views.py`
- `backend/fnc_matches/services.py`
- `backend/users/views.py`
- `frontend/components/teams/TacticalBoard.tsx`
- `frontend/lib/api.ts`

## Recommended Remediation Order
1. Higiene de segredos e artefatos
2. CI e gates de validacao
3. Padronizacao de auth
4. Hardening de bracket/report semantics
5. Quebra de arquivos gigantes
6. Nova API externa dedicada separada da API interna
