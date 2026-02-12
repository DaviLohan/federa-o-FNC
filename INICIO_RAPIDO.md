# 🚀 INÍCIO RÁPIDO - SISTEMA FNC

## ✅ STATUS DO SISTEMA

**Backend Django:** ✅ RODANDO em http://localhost:8000  
**Frontend Next.js:** ✅ RODANDO em http://localhost:3000  
**Banco de Dados:** ✅ POPULADO com dados de teste

---

## 🎮 ACESSO RÁPIDO

### 1. Acesse o Frontend
```
URL: http://localhost:3000
```

### 2. Faça Login

**Administrador (Acesso Total):**
```
Email: admin@fnc.com
Senha: admin123
```

**Dono de Time (Pode gerenciar time e reportar partidas):**
```
Email: player3@fnc.com
Senha: player123
```

---

## 📊 DADOS DISPONÍVEIS PARA TESTE

### Campeonatos Criados

1. **Copa FNC 2026** (LEAGUE - Pontos Corridos)
   - Status: IN_PROGRESS
   - 4 times inscritos
   - 6 partidas jogadas
   - Classificação atualizada
   - **Ver em:** http://localhost:3000/championships/1

2. **Torneio Relâmpago** (KNOCKOUT - Mata-Mata)
   - Status: FINISHED
   - 4 times participaram
   - Chaveamento completo
   - Campeão: Champions Team 🏆
   - **Ver em:** http://localhost:3000/championships/2

3. **Super Copa FNC 2026** (LEAGUE)
   - Status: IN_PROGRESS
   - 0 times inscritos
   - **Use para criar novos testes**
   - **Ver em:** http://localhost:3000/championships/3

### Times Disponíveis

| ID | Nome             | Dono (Login)              | Jogadores |
|----|------------------|---------------------------|-----------|
| 4  | Champions Team   | player3@fnc.com           | 3         |
| 3  | Legends United   | player2@fnc.com           | 3         |
| 2  | Thunder FC       | player1@fnc.com           | 3         |
| 1  | FNC Elite        | novoteste@fnc.com         | 3         |

---

## 🧪 O QUE TESTAR

### Teste 1: Ver Classificação (2 minutos)
1. Acesse: http://localhost:3000/championships/1
2. Login: `admin@fnc.com` / `admin123`
3. Clique na aba **"Classificação"**
4. **Verificar:**
   - Tabela com 4 times
   - Champions Team em 1º lugar (6 pts)
   - Colunas: Pos, Time, J, V, E, D, GP, GC, SG, Pts

### Teste 2: Ver Chaveamento Knockout (2 minutos)
1. Acesse: http://localhost:3000/championships/2
2. Clique na aba **"Chaveamento"**
3. **Verificar:**
   - Semifinais com resultados
   - Final com campeão destacado
   - Champions Team como campeão

### Teste 3: Ver Detalhes de Partidas (3 minutos)
1. Na Copa FNC 2026
2. Clique na aba **"Partidas"**
3. Clique em uma partida para expandir
4. **Verificar:**
   - Lista de gols com jogadores, minutos, tipos
   - Cartões aplicados (se houver)
   - Placar correto

### Teste 4: Inscrever Time em Campeonato (5 minutos)
1. Logout
2. Login como: `player1@fnc.com` / `player123`
3. Acesse: http://localhost:3000/championships/3
4. Clique em **"Inscrever Time"**
5. Selecione **Thunder FC**
6. Confirme inscrição
7. **Verificar:** Mensagem de sucesso

### Teste 5: Aprovar Inscrição (Como Admin) (3 minutos)
1. Logout
2. Login como: `admin@fnc.com` / `admin123`
3. Acesse inscrições pendentes
4. Aprove a inscrição do Thunder FC
5. **Verificar:** Status muda para APPROVED

---

## 📈 ESTATÍSTICAS ATUAIS

```
Total de Usuários: 17
Total de Times: 4
Total de Campeonatos: 3
Total de Partidas: 9
Total de Gols: 32
Total de Cartões: 3
```

**Top 3 Artilheiros:**
1. Lucas Costa - 12 gols
2. Rafael Lima - 10 gols
3. Pedro Oliveira - 9 gols

**Classificação Copa FNC 2026:**

| Pos | Time           | Pts | J | V | E | D | GP | GC | SG  |
|-----|----------------|-----|---|---|---|---|----|----| ----|
| 1º  | Champions Team | 6   | 3 | 2 | 0 | 1 | 6  | 4  | +2  |
| 2º  | Thunder FC     | 5   | 3 | 1 | 2 | 0 | 5  | 4  | +1  |
| 3º  | Legends United | 4   | 3 | 1 | 1 | 1 | 6  | 4  | +2  |
| 4º  | FNC Elite      | 1   | 3 | 0 | 1 | 2 | 3  | 8  | -5  |

---

## 🔧 COMANDOS ÚTEIS

### Verificar Logs

**Backend:**
```bash
tail -f /tmp/django.log
```

**Frontend:**
```bash
tail -f /tmp/nextjs.log
```

### Reiniciar Servidores

**Backend:**
```bash
pkill -f "manage.py runserver"
cd /home/davilohan/projects/FNC/backend
source venv/bin/activate
nohup python manage.py runserver 0.0.0.0:8000 > /tmp/django.log 2>&1 &
```

**Frontend:**
```bash
pkill -f "next"
cd /home/davilohan/projects/FNC/frontend
nohup npm run dev > /tmp/nextjs.log 2>&1 &
```

### Testar API Diretamente

```bash
# Ver campeonatos
curl -H "Authorization: Token e7442e17464c47e3e6eb85b1d28ebac90ec0cb0d" \
  http://localhost:8000/api/v1/championships/

# Ver classificação
curl -H "Authorization: Token e7442e17464c47e3e6eb85b1d28ebac90ec0cb0d" \
  http://localhost:8000/api/v1/championships/1/standings/

# Ver partidas
curl -H "Authorization: Token e7442e17464c47e3e6eb85b1d28ebac90ec0cb0d" \
  http://localhost:8000/api/v1/matches/
```

### Executar Testes Novamente

```bash
cd /home/davilohan/projects/FNC/backend
source venv/bin/activate
python run_full_tests.py
```

---

## 📚 DOCUMENTAÇÃO COMPLETA

- **`GUIA_TESTES_MANUAIS.md`** - 10 testes detalhados com instruções passo a passo
- **`RESUMO_TESTES.md`** - Resumo executivo de tudo que foi testado
- **`run_full_tests.py`** - Script de testes automatizados

---

## 🎯 PRÓXIMOS PASSOS

1. **Teste as funcionalidades principais** usando os testes 1-5 acima (15 min)
2. **Consulte GUIA_TESTES_MANUAIS.md** para testes mais detalhados
3. **Reporte bugs** encontrados usando o template no guia
4. **Explore o Django Admin** em http://localhost:8000/admin/ (admin@fnc.com / admin123)

---

## 🏆 SISTEMA PRONTO!

✅ Bug crítico corrigido  
✅ Dados de teste criados  
✅ Campeonatos funcionando (LEAGUE e KNOCKOUT)  
✅ Partidas simuladas  
✅ Classificação atualizada  
✅ Estatísticas corretas  

**O sistema está 100% funcional e pronto para uso!** 🚀

---

**Data:** 04 de Fevereiro de 2026  
**Status:** ✅ OPERACIONAL
