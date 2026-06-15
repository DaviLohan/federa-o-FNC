# Testing Strategy

## Current State
- Backend possui `pytest`, factories e suites relevantes
- Frontend possui lint/build, mas nao ha suite de testes automatizados confirmada

## Priority Areas
1. Auth e permissions
2. Match reports e contestations
3. EA integration
4. Bracket / two-leg advancement
5. Payments e webhooks

## Test Layers
- Unit: services e regras puras
- Integration: endpoints e efeitos colaterais
- Regression: bracket, stats, report flows
- Smoke: fluxos criticos de usuario

## Minimum Required Scenarios
- Partida futura sem report
- Partida apos horario sem report
- Report pendente
- Report aprovado
- Ida reportada e volta nao reportada
- Ida e volta reportadas
- WO interpretado corretamente
- Contestacao com decisao admin
- Final jogo unico

## Command Baseline
- Backend: `pytest`
- Backend checks: `python manage.py check`
- Frontend: `npm run lint`, `npm run build`

## Recommendation
- Antes de refatoracoes grandes, aumentar cobertura em bracket, auth e EA report
