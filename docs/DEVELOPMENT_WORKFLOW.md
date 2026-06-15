# Development Workflow

## Principles
- Fazer a menor mudanca correta
- Ler a area inteira antes de editar
- Sempre diferenciar fato encontrado de inferencia
- Tratar producao, auth, payments, EA report e bracket como areas criticas

## Local Modes
- Dev local pode usar Docker Compose ou Python local
- Backend tem fallback para SQLite em desenvolvimento
- Producao usa PostgreSQL obrigatoriamente

## Standard Flow
1. Entender a regra de negocio
2. Localizar arquivos centrais
3. Ler implementacao vizinha e impacto
4. Aplicar mudanca minima
5. Validar localmente o que o ambiente suportar
6. Revisar diff
7. Documentar risco residual

## Validation by Area
- Frontend: `npm run lint`, `npm run build`
- Backend: `pytest`, `python manage.py check`
- Bracket: scheduled, pending, approved, ida/volta, final
- Auth: login/logout/me
- EA: fetch, confirm, contest
- Payments: status e webhooks

## Protected Files
- `backend/.env`
- `docker-compose.prod.yml`
- `nginx/nginx.conf`
- `nginx/certs/*`
- dumps, backups e snapshots operacionais

## Git Guidelines
- Trabalhar em branch de feature
- Evitar force push e comandos destrutivos
- Nao commitar segredos, certs, dumps ou snapshots
- Revisar `git diff` antes de concluir
