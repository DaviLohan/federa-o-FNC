# Claude Code Setup Plan

## Confirmed Today
- Existe `.claude/settings.local.json`
- Nao existe configuracao compartilhada de CI/hook/agent no repo
- O repositorio tem docs markdown suficientes para virar fonte de verdade para IA

## Safe Initial Setup
1. Usar docs markdown como contexto persistente
2. Manter permissoes locais de shell conservadoras
3. Validar capacidades reais do Claude com `/doctor` e `/config`
4. Nao depender de recurso nao confirmado no repo/instalacao

## Suggested Local Policy
- Permitir leitura de repo, git diff/status/log e comandos de validacao nao destrutivos
- Bloquear por politica mudancas em arquivos sensiveis sem aprovacao explicita
- Tratar hooks automaticos como fase posterior, apos padronizar ambiente local

## Good Claude Commands for This Project
- `/doctor`: validar ambiente
- `/config`: inspecionar configuracao
- `/update-config`: ajustar permissoes locais
- `/context`: gerenciar docs/contexto carregado
- `/diff`: revisar alteracoes
- `/branch`: apoiar fluxo Git
- `/export`: exportar sessao/artefato

## Do Not Assume
- suporte automatico a `settings.json` compartilhado
- hooks persistentes
- agentes persistentes
- comandos customizados versionados no repo
