# Security and Production Rules

## Strictly Protected
- Segredos e variaveis de ambiente
- Certificados TLS
- Credenciais de pagamentos
- Database dumps
- Snapshots e backups operacionais
- Arquivos de configuracao de producao

## Production Rules
- Nao editar producao sem aprovacao explicita
- Nao usar comandos destrutivos Git
- Nao alterar banco sem revisar impacto
- Nao mudar dominio, SSL, compose ou nginx sem rollback claro
- Nao alterar relay/webhook auth sem validacao de seguranca

## Current Risks
- Artefatos operacionais sensiveis fora de ignore robusto
- Token armazenado em `localStorage`
- Relay protegido por token de header compartilhado
- `migrate` e `collectstatic` no boot do app em producao

## Mandatory Controls
- Secret scan antes de commit/release
- Revisao especial para auth, payments, relay e bracket
- Backup antes de alteracoes estruturais
- Checklist de rollback para mudancas de infra
