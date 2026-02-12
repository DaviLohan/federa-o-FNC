# 🧪 GUIA DE TESTES MANUAIS - SISTEMA FNC

## 📊 Resumo dos Testes Automatizados Executados

✅ **FASE 1 - PREPARAÇÃO:** Completa
- 4 times criados e configurados
- 12 jogadores distribuídos entre os times
- 3 campeonatos criados (2 LEAGUE, 1 KNOCKOUT)
- Todos os times inscritos e aprovados

✅ **FASE 2 - CAMPEONATO LEAGUE:** Completa
- Copa FNC 2026 iniciada e finalizada
- 6 partidas jogadas com resultados variados
- 32 gols marcados com diferentes tipos
- 3 cartões aplicados
- Classificação atualizada automaticamente

✅ **FASE 3 - CAMPEONATO KNOCKOUT:** Completa
- Torneio Relâmpago iniciado e finalizado
- Semifinais jogadas (2 partidas)
- Final realizada
- Campeão definido: **Champions Team** 🏆

---

## 🎮 DADOS DE ACESSO

### Credenciais Disponíveis

```
ADMINISTRADOR:
  Email: admin@fnc.com
  Senha: admin123
  Permissões: Todas

SUPERVISOR:
  Email: supervisor@fnc.com
  Senha: super123
  Permissões: Aprovar reports, contestações

DONOS DE TIMES:
  1. novoteste@fnc.com (FNC Elite)
  2. player1@fnc.com (Thunder FC)
  3. player2@fnc.com (Legends United)
  4. player3@fnc.com (Champions Team)
  Senha: player123
  Permissões: Gerenciar time, reportar partidas
```

### URLs do Sistema

```
Frontend: http://localhost:3000
Backend API: http://localhost:8000/api/v1/
Admin Django: http://localhost:8000/admin/
```

---

## 🧪 TESTES MANUAIS A EXECUTAR

### **TESTE 1: Navegação e Visualização de Campeonatos**

#### 1.1 Listar Campeonatos
- [ ] Acesse `http://localhost:3000`
- [ ] Login com `admin@fnc.com` / `admin123`
- [ ] Navegue até `/championships`
- [ ] **Verificar:**
  - 3 campeonatos aparecem na lista
  - Copa FNC 2026 (Status: IN_PROGRESS)
  - Torneio Relâmpago (Status: FINISHED)
  - Super Copa FNC 2026 (Status: IN_PROGRESS)
  - Cards mostram informações corretas (tipo, status, datas)

#### 1.2 Detalhes do Campeonato LEAGUE
- [ ] Clique em "Copa FNC 2026"
- [ ] **Verificar abas disponíveis:**
  - [ ] Visão Geral
  - [ ] Classificação (deve aparecer para LEAGUE)
  - [ ] Partidas
  - [ ] Times
  - [ ] Regras

#### 1.3 Aba Classificação
- [ ] Clique na aba "Classificação"
- [ ] **Verificar:**
  - Tabela mostra 4 times
  - Ordenação correta (pontos → saldo gols → gols pró)
  - Colunas: Pos, Time, J, V, E, D, GP, GC, SG, Pts
  - Dados conferem:
    ```
    1. Champions Team: 6 pts (2V 0E 1D) - SG: +2
    2. Thunder FC: 5 pts (1V 2E 0D) - SG: +1
    3. Legends United: 4 pts (1V 1E 1D) - SG: +2
    4. FNC Elite: 1 pt (0V 1E 2D) - SG: -5
    ```

#### 1.4 Aba Partidas
- [ ] Clique na aba "Partidas"
- [ ] **Verificar:**
  - Lista de 6 partidas
  - Status de cada partida (FINISHED)
  - Placar exibido corretamente
  - Possibilidade de expandir para ver detalhes (gols, cartões)

#### 1.5 Detalhes do Campeonato KNOCKOUT
- [ ] Volte para `/championships`
- [ ] Clique em "Torneio Relâmpago"
- [ ] **Verificar abas:**
  - [ ] Visão Geral
  - [ ] Chaveamento (deve aparecer para KNOCKOUT)
  - [ ] Partidas
  - [ ] Times
  - [ ] Regras

#### 1.6 Aba Chaveamento
- [ ] Clique na aba "Chaveamento"
- [ ] **Verificar:**
  - Visualização gráfica do bracket
  - Semifinais mostram resultados:
    - Champions Team 3 x 1 Legends United
    - Thunder FC 2 x 3 FNC Elite
  - Final mostra resultado:
    - Champions Team 2 x 1 FNC Elite
  - Campeão destacado: Champions Team 🏆

---

### **TESTE 2: Detalhes de Partidas**

#### 2.1 Visualizar Gols de uma Partida
- [ ] Na aba "Partidas" da Copa FNC 2026
- [ ] Clique em uma partida com múltiplos gols
- [ ] **Verificar:**
  - Lista de gols com:
    - Jogador que marcou
    - Time
    - Minuto
    - Tipo de gol (Regular, Pênalti, Cabeçada, etc.)
  - Gols ordenados por minuto

#### 2.2 Visualizar Cartões
- [ ] Na mesma partida
- [ ] **Verificar:**
  - Cartões aplicados (amarelos/vermelhos)
  - Jogador que recebeu
  - Minuto
  - Motivo (se disponível)

---

### **TESTE 3: Estatísticas de Jogadores**

#### 3.1 Artilheiros
- [ ] Acesse seção de estatísticas (se disponível)
- [ ] **Verificar Top 3 artilheiros:**
  1. Lucas Costa: 12 gols
  2. Rafael Lima: 10 gols
  3. Pedro Oliveira: 9 gols

#### 3.2 Perfil de Jogador
- [ ] Clique em um jogador artilheiro
- [ ] **Verificar:**
  - Total de gols
  - Total de assistências
  - Total de cartões
  - Partidas jogadas
  - Times que joga

---

### **TESTE 4: Criar Novo Campeonato (Como ADMIN)**

#### 4.1 Criar Campeonato LEAGUE
- [ ] Login como `admin@fnc.com`
- [ ] Navegue até criar campeonato
- [ ] Preencha formulário:
  ```
  Nome: Campeonato Teste Manual
  Tipo: LEAGUE (Pontos Corridos)
  Descrição: Teste criado manualmente
  Status: OPEN
  Data início inscrições: Hoje
  Data fim inscrições: Hoje + 7 dias
  Data início campeonato: Hoje + 10 dias
  Taxa: R$ 30,00
  Premiação: R$ 300,00
  Min times: 4
  Max times: 8
  ```
- [ ] Salvar
- [ ] **Verificar:**
  - Campeonato criado com sucesso
  - Aparece na lista de campeonatos
  - Status é OPEN

#### 4.2 Criar Campeonato KNOCKOUT
- [ ] Criar outro campeonato
- [ ] Tipo: KNOCKOUT (Mata-mata)
- [ ] **Verificar:**
  - Criação bem-sucedida
  - Aba "Chaveamento" disponível (vazio até iniciar)

---

### **TESTE 5: Inscrições de Times**

#### 5.1 Inscrever Time em Campeonato
- [ ] Logout do admin
- [ ] Login como `player1@fnc.com` / `player123` (Thunder FC)
- [ ] Acesse "Super Copa FNC 2026"
- [ ] Clique em "Inscrever Time"
- [ ] Selecione "Thunder FC"
- [ ] Confirme inscrição
- [ ] **Verificar:**
  - Mensagem de sucesso
  - Inscrição aparece como PENDING ou APPROVED

#### 5.2 Aprovar Inscrição (Como ADMIN)
- [ ] Logout
- [ ] Login como `admin@fnc.com`
- [ ] Acesse painel de inscrições pendentes
- [ ] Aprove a inscrição do Thunder FC
- [ ] **Verificar:**
  - Status muda para APPROVED
  - Time aparece na lista de times inscritos

#### 5.3 Rejeitar Inscrição
- [ ] Inscreva outro time
- [ ] Como ADMIN, rejeite a inscrição
- [ ] Forneça motivo
- [ ] **Verificar:**
  - Status muda para REJECTED
  - Motivo é exibido para o dono do time

---

### **TESTE 6: Reportar Partida (Fluxo Completo)**

⚠️ **NOTA:** Este teste requer que você crie uma nova partida no campeonato "Super Copa FNC 2026"

#### 6.1 Criar Partida Manualmente
- [ ] Login como `admin@fnc.com`
- [ ] Acesse "Super Copa FNC 2026"
- [ ] Crie nova partida:
  ```
  Time Casa: FNC Elite
  Time Visitante: Thunder FC
  Data: Hoje + 1 hora
  Rodada: 1
  Tipo: CHAMPIONSHIP
  ```

#### 6.2 Reportar Resultado
- [ ] Logout
- [ ] Login como `novoteste@fnc.com` (dono do FNC Elite)
- [ ] Acesse a partida criada
- [ ] Clique em "Reportar Resultado"
- [ ] Preencha:
  ```
  Placar Casa: 3
  Placar Visitante: 2
  Screenshot: Upload qualquer imagem
  ```

#### 6.3 Adicionar Gols
- [ ] Na mesma modal, adicione gols:
  ```
  GOL 1:
    Jogador: [Selecione jogador do FNC Elite]
    Time: FNC Elite
    Minuto: 15
    Tipo: Regular
  
  GOL 2:
    Jogador: [Selecione jogador do Thunder FC]
    Time: Thunder FC
    Minuto: 23
    Tipo: Pênalti
  
  GOL 3:
    Jogador: [Mesmo jogador do GOL 1]
    Time: FNC Elite
    Minuto: 45
    Tipo: Cabeçada
    Assistência: [Selecione outro jogador]
  
  GOL 4:
    Jogador: [Jogador Thunder FC]
    Time: Thunder FC
    Minuto: 67
    Tipo: Regular
  
  GOL 5:
    Jogador: [Jogador FNC Elite]
    Time: FNC Elite
    Minuto: 89
    Tipo: Falta Direta
  ```

#### 6.4 Adicionar Cartões
- [ ] Adicione cartões:
  ```
  CARTÃO 1:
    Tipo: Amarelo
    Jogador: [Thunder FC]
    Minuto: 38
    Motivo: Falta dura
  
  CARTÃO 2:
    Tipo: Vermelho
    Jogador: [Thunder FC]
    Minuto: 82
    Motivo: Falta violenta
  ```

#### 6.5 Submeter Report
- [ ] Clique em "Submeter"
- [ ] **Verificar:**
  - Mensagem de sucesso
  - Status da partida muda para "Aguardando Aprovação"
  - Report aparece como PENDING

#### 6.6 Aprovar Report (Como ADMIN)
- [ ] Logout
- [ ] Login como `admin@fnc.com`
- [ ] Acesse área de súmulas pendentes
- [ ] Visualize o report enviado
- [ ] **Verificar:**
  - Screenshot está visível
  - Todos os gols listados
  - Todos os cartões listados
  - Placar correto
- [ ] Aprove o report
- [ ] **Verificar:**
  - Status da partida muda para FINISHED
  - Standings são atualizadas:
    - FNC Elite: +3 pontos, +1 vitória
    - Thunder FC: +0 pontos, +1 derrota
  - Estatísticas de jogadores atualizadas

---

### **TESTE 7: Contestação de Resultado**

#### 7.1 Contestar Partida
- [ ] Logout
- [ ] Login como dono do time perdedor (ex: `player1@fnc.com`)
- [ ] Acesse a partida que perdeu
- [ ] Clique em "Contestar Resultado"
- [ ] Preencha:
  ```
  Motivo: Placar Incorreto
  Descrição: O placar estava errado no screenshot...
  Evidência: Upload nova imagem
  ```
- [ ] Submeter
- [ ] **Verificar:**
  - Contestação criada
  - Status da partida muda para CONTESTED
  - Mensagem de confirmação

#### 7.2 Analisar Contestação (Como ADMIN)
- [ ] Logout
- [ ] Login como `admin@fnc.com`
- [ ] Acesse contestações pendentes
- [ ] Visualize a contestação
- [ ] **Verificar:**
  - Todas as informações estão presentes
  - Evidência é visível
  - Informações da partida original

#### 7.3 Rejeitar Contestação
- [ ] Como ADMIN, rejeite a contestação
- [ ] Forneça resposta:
  ```
  Resposta: Screenshot original está correto e foi verificado
  ```
- [ ] Confirmar
- [ ] **Verificar:**
  - Status da contestação: REJECTED
  - Status da partida volta para FINISHED
  - Standings permanecem inalteradas
  - Time contestador vê a resposta

#### 7.4 Aceitar Contestação
- [ ] Crie outra contestação (repita 7.1)
- [ ] Como ADMIN, aceite a contestação
- [ ] **Verificar:**
  - Status da partida: CANCELLED ou volta para SCHEDULED
  - Standings são revertidas
  - Resultado é anulado
  - Nova partida pode ser agendada

---

### **TESTE 8: Finalizar Campeonato**

#### 8.1 Verificar Pré-requisitos
- [ ] Login como `admin@fnc.com`
- [ ] Acesse campeonato IN_PROGRESS
- [ ] **Verificar:**
  - Todas as rodadas foram jogadas
  - Nenhuma partida pendente
  - Nenhuma contestação pendente

#### 8.2 Finalizar
- [ ] Clique em "Finalizar Campeonato"
- [ ] Confirme a ação
- [ ] **Verificar:**
  - Status muda para FINISHED
  - Data de término é registrada
  - Não é mais possível:
    - Criar novas partidas
    - Reportar resultados
    - Modificar standings
  - Classificação final está congelada
  - Premiações atribuídas (se configuradas)

---

### **TESTE 9: Validações e Erros**

#### 9.1 Tentar Inscrever Time Duas Vezes
- [ ] Como dono de time já inscrito
- [ ] Tente inscrever novamente no mesmo campeonato
- [ ] **Verificar:**
  - Erro exibido: "Time já inscrito"
  - Inscrição não é duplicada

#### 9.2 Reportar Partida Sem Permissão
- [ ] Login como dono de time C
- [ ] Tente reportar partida entre times A e B
- [ ] **Verificar:**
  - Acesso negado
  - Erro: "Você não tem permissão"

#### 9.3 Gol em Minuto Inválido
- [ ] Ao reportar partida
- [ ] Tente adicionar gol no minuto 150
- [ ] **Verificar:**
  - Erro de validação
  - Campo não aceita valor > 120

#### 9.4 Reportar Sem Screenshot
- [ ] Tente reportar sem fazer upload
- [ ] **Verificar:**
  - Erro: "Screenshot é obrigatório"
  - Formulário não é submetido

#### 9.5 Inscrever Após Deadline
- [ ] Crie campeonato com prazo expirado
- [ ] Tente inscrever time
- [ ] **Verificar:**
  - Erro: "Prazo de inscrição encerrado"

---

### **TESTE 10: Interface e Responsividade**

#### 10.1 Desktop (1920x1080)
- [ ] Abra em tela grande
- [ ] **Verificar:**
  - Layout organizado
  - Tabelas legíveis
  - Chaveamento bem exibido
  - Modais centralizados

#### 10.2 Tablet (768x1024)
- [ ] Redimensione para tablet
- [ ] **Verificar:**
  - Layout se adapta
  - Tabelas permanecem legíveis
  - Navegação funcional
  - Modais responsivos

#### 10.3 Mobile (375x667)
- [ ] Redimensione para mobile
- [ ] **Verificar:**
  - Menu hamburger funciona
  - Tabelas rolam horizontalmente
  - Cards empilham verticalmente
  - Formulários são utilizáveis
  - Chaveamento é legível (pode rolar)

---

## 📋 CHECKLIST FINAL

Após executar todos os testes, verifique:

### Funcionalidades Core
- [ ] Criar campeonatos (LEAGUE e KNOCKOUT)
- [ ] Listar e visualizar campeonatos
- [ ] Inscrever times
- [ ] Aprovar/rejeitar inscrições
- [ ] Iniciar campeonatos
- [ ] Criar partidas
- [ ] Reportar resultados com gols e cartões
- [ ] Aprovar/rejeitar reports
- [ ] Standings atualizam automaticamente
- [ ] Chaveamento funciona corretamente
- [ ] Contestar resultados
- [ ] Analisar contestações
- [ ] Finalizar campeonatos

### Validações
- [ ] Não inscreve time duas vezes
- [ ] Não reporta sem permissão
- [ ] Valida minutos de gols (1-120)
- [ ] Exige screenshot em reports
- [ ] Respeita deadline de inscrições
- [ ] Não modifica campeonatos finalizados

### Interface
- [ ] Todas as abas funcionam
- [ ] Modais abrem e fecham
- [ ] Formulários validam campos
- [ ] Mensagens de erro são claras
- [ ] Mensagens de sucesso aparecem
- [ ] Loading states funcionam
- [ ] Responsivo em todas as telas

### Integridade de Dados
- [ ] Standings sempre consistentes
- [ ] Estatísticas sempre corretas
- [ ] Histórico de partidas preservado
- [ ] Contestações registradas corretamente

---

## 🐛 REPORTAR BUGS

Se encontrar um bug durante os testes, documente:

```markdown
### BUG #[número]

**Severidade:** [Crítico / Alto / Médio / Baixo]
**Tela/Funcionalidade:** [ex: Report de Partida]
**Usuário:** [ex: admin@fnc.com]

**Descrição:**
[O que aconteceu]

**Passos para Reproduzir:**
1. [Passo 1]
2. [Passo 2]
3. [Passo 3]

**Esperado:**
[O que deveria acontecer]

**Atual:**
[O que realmente aconteceu]

**Screenshot:**
[Se aplicável]

**Console Errors:**
[Se houver erros no console do navegador]
```

---

## 🎯 RESUMO DOS DADOS CRIADOS

### Campeonatos
1. **Copa FNC 2026** (LEAGUE - IN_PROGRESS)
   - 4 times inscritos
   - 6 partidas jogadas
   - Champions Team lidera com 6 pontos

2. **Torneio Relâmpago** (KNOCKOUT - FINISHED)
   - 4 times participaram
   - 3 partidas (2 semis + 1 final)
   - 🏆 Campeão: Champions Team

3. **Super Copa FNC 2026** (LEAGUE - IN_PROGRESS)
   - 0 times inscritos (use para novos testes)

### Times
1. **Champions Team** (player3@fnc.com)
2. **Legends United** (player2@fnc.com)
3. **Thunder FC** (player1@fnc.com)
4. **FNC Elite** (novoteste@fnc.com)

### Estatísticas
- **32 gols** marcados no total
- **3 cartões** aplicados
- **Top Artilheiro:** Lucas Costa (12 gols)

---

## ✅ CONCLUSÃO

Após executar este guia completo de testes manuais, você terá verificado:

1. ✅ Todos os fluxos principais do sistema
2. ✅ Validações de segurança e permissões
3. ✅ Integridade dos dados
4. ✅ Interface responsiva
5. ✅ Experiência do usuário

**Boa sorte com os testes! 🚀**
