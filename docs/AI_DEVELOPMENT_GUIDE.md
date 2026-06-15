# AI Development Guide

## Purpose
Ensinar assistentes de IA a operar com seguranca neste repositorio.

## Golden Rules
- Nunca assumir que `0x0` significa resultado oficial
- Nunca fechar ida/volta apos apenas uma perna
- Nunca expor segredos, certs, dumps ou payloads sensiveis
- Nunca alterar producao sem aprovacao explicita
- Sempre reduzir inferencia no frontend quando o backend puder ser fonte de verdade

## Project Hotspots
- `backend/fnc_matches/views.py`
- `backend/fnc_matches/services.py`
- `backend/ea_integration/report_service.py`
- `backend/fnc_championships/services/__init__.py`
- `frontend/components/championships/tabs/BracketTabV2.tsx`
- `frontend/components/championships/tabs/BracketMatchCard.tsx`
- `frontend/lib/api-client.ts`
- `frontend/lib/auth-store.ts`

## Match / Bracket Rules
- Jogo futuro deve mostrar data/hora, nao score oficial
- Agregado so existe com resultado oficial
- Vencedor so sobe quando o confronto estiver realmente decidido
- Final pode ser jogo unico mesmo quando quartas/semi sao ida e volta

## Safe Validation Strategy
- Preferir testes/validacoes focados
- Evitar full build/full suite a cada ajuste pequeno
- Declarar explicitamente quando ferramenta nao estiver disponivel no ambiente

## IA Conduct
- Antes de editar: diagnosticar rapidamente
- Durante: manter mudanca minima
- Depois: validar, resumir impacto e listar riscos residuais
