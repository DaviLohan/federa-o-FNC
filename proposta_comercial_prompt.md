# Prompt para IA - Proposta Comercial por Hora de Desenvolvimento

Use o texto abaixo em uma IA para gerar uma proposta comercial profissional cobrando por horas de desenvolvimento.

```text
Atue como um consultor comercial e técnico sênior de software.

Quero que você gere uma proposta comercial em português (Brasil), com linguagem profissional, objetiva e persuasiva, para um projeto de integração de API com automação de dados de partidas.

Objetivo da proposta:
- Vender serviço de desenvolvimento por hora (hourly rate), com escopo técnico claro, entregáveis, premissas, riscos, cronograma e condições de pagamento.

Contexto do projeto:
- A solução deve extrair e consolidar dados de partidas (nomes de jogadores, gols, assistências, notas, estatísticas de goleiro e placar).
- A integração depende de validação técnica com sistema de terceiros.
- Haverá ambiente de testes com jogos reais para homologação.
- Será oferecido suporte pós-entrega por 30 dias para ajustes corretivos.

Tempo e ferramentas (obrigatório refletir na proposta):
- Estimativa de esforço total de desenvolvimento: [HORAS_ESTIMADAS_TOTAIS]
- Janela de execução prevista: [PRAZO_DIAS_UTEIS] dias úteis
- Ferramentas/stack a utilizar:
  - Backend/API: [BACKEND_STACK]
  - Banco de dados: [BANCO_DADOS]
  - Frontend/admin para validação (se aplicável): [FRONTEND_STACK]
  - Infra/containers: [INFRA_STACK]
  - Versionamento e CI/CD: [VERSIONAMENTO_CICD]
  - Documentação da API: [DOC_API]
  - Testes e qualidade: [TESTES_QUALIDADE]
  - Monitoramento/logs: [MONITORAMENTO_LOGS]

Dados comerciais (substitua os campos entre colchetes):
- Nome do cliente: [NOME_CLIENTE]
- Nome do fornecedor: [SEU_NOME_OU_EMPRESA]
- Valor da hora técnica: R$ [VALOR_HORA]
- Estimativa de horas: [MIN_HORAS] a [MAX_HORAS]
- Entrada: [PERCENTUAL_ENTRADA]%
- Entrega: [PERCENTUAL_ENTREGA]%
- Prazo estimado: [PRAZO_DIAS_UTEIS] dias úteis

Estrutura obrigatória da proposta:
1. Resumo executivo
2. Objetivo do projeto
3. Escopo (inclusões)
4. Fora de escopo (exclusões)
5. Metodologia de execução
6. Entregáveis
7. Cronograma estimado por fase
8. Modelo de cobrança por hora
9. Estimativa financeira (cenário mínimo, provável e máximo)
10. Premissas e dependências do cliente
11. Riscos e limitações técnicas
12. Critérios de aceite/homologação
13. Suporte pós-entrega (30 dias)
14. Condições comerciais e pagamento
15. Validade da proposta
16. Próximos passos
17. Plano de horas por fase
18. Ferramentas e arquitetura técnica

Regras de cálculo:
- Mostrar tabela com 3 cenários:
  - Conservador: [MIN_HORAS]
  - Provável: média entre [MIN_HORAS] e [MAX_HORAS]
  - Complexo: [MAX_HORAS]
- Para cada cenário, calcular subtotal = horas x valor/hora.
- Mostrar entrada e saldo final em reais para cada cenário.
- Incluir observação de que horas adicionais só serão executadas mediante aprovação formal.

Regras adicionais (tempo e ferramentas):
- Distribuir as horas por fase (levantamento, implementação, testes/homologação, documentação, suporte assistido de entrega).
- Informar claramente quais ferramentas são já existentes no projeto e quais poderão exigir custo adicional (serviços de terceiros, monitoramento pago, etc.).
- Incluir uma seção "Cronograma por marcos" com entregas semanais e horas previstas por marco.

Tom e estilo:
- Profissional, claro e sem juridiquês excessivo.
- Evitar promessas absolutas (ex.: "garantia vitalícia").
- Destacar transparência, previsibilidade e governança de escopo.

Saída esperada:
- Entregar em Markdown.
- Incluir uma versão curta de "mensagem de envio" (WhatsApp/e-mail) ao final.
- Incluir um quadro final "Resumo de esforço e stack" com:
  - Horas totais estimadas
  - Prazo estimado
  - Principais ferramentas
  - Valor hora
  - Faixa de investimento final
```

## Exemplo rápido de preenchimento

- `[NOME_CLIENTE]`: Wellington Ferreira
- `[SEU_NOME_OU_EMPRESA]`: Davi Lohan - Pro Eleven Tech
- `[VALOR_HORA]`: 180
- `[MIN_HORAS]`: 20
- `[MAX_HORAS]`: 40
- `[PERCENTUAL_ENTRADA]`: 60
- `[PERCENTUAL_ENTREGA]`: 40
- `[PRAZO_DIAS_UTEIS]`: 10 a 15
- `[HORAS_ESTIMADAS_TOTAIS]`: 20 a 40
- `[BACKEND_STACK]`: Python + Django REST Framework
- `[BANCO_DADOS]`: PostgreSQL
- `[FRONTEND_STACK]`: Next.js + TypeScript
- `[INFRA_STACK]`: Docker + Docker Compose + Nginx
- `[VERSIONAMENTO_CICD]`: Git + GitHub + deploy em servidor Linux
- `[DOC_API]`: OpenAPI/Swagger + coleção Postman
- `[TESTES_QUALIDADE]`: testes de integração + testes manuais guiados
- `[MONITORAMENTO_LOGS]`: logs de aplicação + health checks

---

## Prompt pronto para gerar sua proposta (R$ 110/h, 20h)

```text
Atue como um consultor comercial e técnico sênior de software.

Crie uma proposta comercial profissional, em português (Brasil), para um cliente que quer uma nova API de integração esportiva.

Contexto do projeto:
- A API será nova (dedicada ao cliente), construída em cima da lógica já existente do sistema atual, mas com camada própria de integração.
- O objetivo é automatizar a coleta e entrega dos seguintes dados:
  - nomes dos jogadores
  - notas
  - gols
  - assistências
  - estatísticas de goleiro
  - placar final das partidas
- Haverá validação técnica com ambiente de testes e partidas reais.
- O suporte pós-entrega será de 30 dias para ajustes corretivos.

Posicionamento comercial importante:
- Escreva a proposta com escopo fechado e entregáveis definidos.
- Não use linguagem de bloqueio explícito (evitar termos como “vou bloquear” ou “impedir”).
- Use linguagem comercial elegante como:
  - “escopo desta fase”
  - “dados contemplados nesta entrega”
  - “API dedicada à finalidade contratada”
  - “expansões futuras mediante novo alinhamento técnico-comercial”

Dados financeiros obrigatórios:
- Valor hora: R$ 110,00
- Esforço estimado: 20 horas
- Valor total: R$ 2.200,00
- Condição de pagamento: 60% entrada e 40% na entrega
  - Entrada: R$ 1.320,00
  - Entrega: R$ 880,00

Distribuição de horas (obrigatório incluir em tabela):
1) Levantamento técnico e alinhamento: 2h
2) Arquitetura da nova API: 2h
3) Desenvolvimento backend da API: 8h
4) Integração com base existente: 3h
5) Testes e homologação: 3h
6) Documentação técnica: 1h
7) Ajustes finais de entrega: 1h
Total: 20h

Estrutura obrigatória da proposta:
1. Resumo executivo
2. Objetivo do projeto
3. Escopo da entrega
4. Entregáveis
5. Plano de execução por fases
6. Quadro de horas detalhado
7. Cronograma estimado (dias úteis)
8. Ferramentas e stack técnica
9. Investimento e condições de pagamento
10. Premissas e dependências do cliente
11. Riscos e limitações técnicas
12. Critérios de aceite/homologação
13. Suporte pós-entrega (30 dias)
14. Validade da proposta
15. Próximos passos

Stack/ferramentas para citar:
- Backend/API: Python + Django REST Framework
- Banco de dados: PostgreSQL
- Infra: Docker + Docker Compose + Nginx
- Versionamento: Git + GitHub
- Documentação: OpenAPI/Swagger + Postman
- Qualidade: testes de integração + homologação com partidas reais
- Monitoramento: logs de aplicação e health checks

Regras adicionais:
- Deixe claro que o valor foi calculado por horas técnicas.
- Deixe claro que o escopo cobre somente os dados e entregáveis desta fase.
- Informe que qualquer expansão de escopo será tratada em fase adicional com novo orçamento.
- Mantenha tom profissional, direto, sem juridiquês excessivo.

Saída esperada:
- Entregar em Markdown.
- Incluir no final:
  1) uma versão curta de mensagem para WhatsApp
  2) uma versão curta para e-mail de envio da proposta
```
