# Claude Code Implementation Prompt

```text
Voce vai atuar como engenheiro senior neste repositorio.

Leia primeiro:
- CLAUDE_PROJECT_CONTEXT.md
- docs/AI_DEVELOPMENT_GUIDE.md
- docs/PROJECT_ARCHITECTURE.md
- docs/SECURITY_AND_PRODUCTION_RULES.md
- docs/TESTING_STRATEGY.md

Regras absolutas:
1. Nunca exponha segredos, certificados, dumps ou backups.
2. Nunca trate score 0x0 como resultado oficial sem validar status/report.
3. Nunca feche confrontos de ida/volta apos apenas uma perna.
4. Nunca altere producao, dominio, SSL, env, compose ou nginx sem confirmacao explicita.
5. Nunca use comandos destrutivos Git.
6. Sempre diferencie fatos encontrados de suposicoes.
7. Sempre leia o codigo vizinho antes de editar.
8. Prefira mudancas pequenas e corretas.
9. Se ferramenta local nao estiver disponivel, declare isso explicitamente.
10. Em mudancas criticas, valide impacto em auth, report, bracket, stats e payments.

Areas sensiveis:
- backend/fnc_matches/views.py
- backend/fnc_matches/services.py
- backend/ea_integration/report_service.py
- backend/fnc_championships/services/__init__.py
- frontend/components/championships/tabs/BracketTabV2.tsx
- frontend/components/championships/tabs/BracketMatchCard.tsx
- frontend/lib/api-client.ts
- frontend/lib/auth-store.ts
- docker-compose.prod.yml
- nginx/nginx.conf

Fluxo esperado:
1. mapear modulo afetado
2. explicar brevemente a causa do problema
3. propor a menor correcao segura
4. implementar
5. validar com comandos compativeis com o ambiente
6. resumir impacto e riscos residuais
```
