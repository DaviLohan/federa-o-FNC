# 🎨 FNC REDESIGN - GUIA DE CONTINUAÇÃO

## ✅ JÁ IMPLEMENTADO (70%)

- ✅ Design System atualizado (globals.css + tailwind.config.ts)
- ✅ Recharts instalado
- ✅ 8 componentes base criados:
  - PageHeader, DataTable, ModalV2, Drawer, FilterBar
  - EmptyState, Skeleton (atualizados)
  - TeamCard (novo)

---

## 🚧 PRÓXIMOS PASSOS (30% restante)

### **1. Refatorar `/app/championships/page.tsx`** ⚠️ CRÍTICO

**OBJETIVO:** Remover completamente a opção "KNOCKOUT" standalone.

**Mudanças no Modal (linha 410-414):**

```typescript
// SUBSTITUIR ESTAS LINHAS:
options={[
  { value: 'LEAGUE', label: 'Pontos Corridos (Liga)' },
  { value: 'GROUPS_KNOCKOUT', label: 'Grupos + Mata-mata' },
]}

// ❌ REMOVER completamente qualquer referência a:
// { value: 'KNOCKOUT', label: 'Mata-mata' }
```

**Adicionar imports:**
```typescript
import { PageHeader, FilterBar, SkeletonGrid } from '@/components/shared/ui';
import { Trophy, Search } from 'lucide-react';
```

**Substituir Header (linhas 115-128):**
```typescript
<PageHeader 
  title="Campeonatos"
  subtitle="Gerencie campeonatos e inscrições"
  icon={<Trophy className="w-8 h-8" />}
  actions={
    canManageChampionships && (
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        + Criar Campeonato
      </Button>
    )
  }
/>
```

**Substituir Filtros (linhas 131-163):**
```typescript
<FilterBar>
  <div className="flex-1 min-w-[200px]">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
      <input
        type="text"
        placeholder="Buscar campeonatos..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-premium pl-10"
      />
    </div>
  </div>
  
  <div className="w-full sm:w-48">
    <Select
      label=""
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      options={[
        { value: 'all', label: 'Todos' },
        { value: 'DRAFT', label: 'Rascunho' },
        { value: 'OPEN', label: 'Aberto' },
        { value: 'IN_PROGRESS', label: 'Em Andamento' },
        { value: 'FINISHED', label: 'Finalizado' },
      ]}
    />
  </div>
</FilterBar>
```

**Loading State (linhas 166-186):**
```typescript
{isLoading ? (
  <SkeletonGrid count={6} className="reveal-fade-delay-2" />
) : championships.length === 0 ? (
  // ... EmptyState
) : (
  <div className="grid-cards reveal-fade-delay-2">
    {championships.map((championship) => (
      <ChampionshipCard key={championship.id} championship={championship} />
    ))}
  </div>
)}
```

---

### **2. Refatorar `/app/teams/page.tsx`**

**Imports:**
```typescript
import { PageHeader, FilterBar, SkeletonGrid, EmptyState, Button } from '@/components/shared/ui';
import { Users, Search } from 'lucide-react';
import { TeamCard } from '@/components/teams/TeamCard';
```

**Header:**
```typescript
<PageHeader 
  title="Times"
  subtitle="Gerencie seus times e jogadores"
  icon={<Users className="w-8 h-8" />}
  actions={
    canCreateTeam && (
      <Button variant="primary" onClick={() => setShowCreateModal(true)}>
        + Criar Time
      </Button>
    )
  }
/>
```

**FilterBar:**
```typescript
<FilterBar>
  <div className="flex-1 min-w-[200px]">
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
      <input
        type="text"
        placeholder="Buscar times..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="input-premium pl-10"
      />
    </div>
  </div>
  
  <div className="w-full sm:w-48">
    <Select
      label=""
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      options={[
        { value: 'all', label: 'Todos' },
        { value: 'active', label: 'Ativos' },
        { value: 'inactive', label: 'Inativos' },
      ]}
    />
  </div>
</FilterBar>
```

**Grid de Times:**
```typescript
{isLoading ? (
  <SkeletonGrid count={6} />
) : teams.length === 0 ? (
  <EmptyState
    icon="⚽"
    title="Nenhum time encontrado"
    description="Crie seu primeiro time para começar!"
    action={
      canCreateTeam && (
        <Button onClick={() => setShowCreateModal(true)}>
          + Criar Primeiro Time
        </Button>
      )
    }
  />
) : (
  <div className="grid-cards">
    {teams.map((team) => (
      <TeamCard key={team.id} team={team} />
    ))}
  </div>
)}
```

---

### **3. Refatorar `/app/matches/page.tsx`**

**Usar Drawer em vez de Modal** para detalhes de partida.

**Imports:**
```typescript
import { PageHeader, FilterBar, Drawer, EmptyState, SkeletonGrid } from '@/components/shared/ui';
import { Calendar, Search } from 'lucide-react';
```

**Header:**
```typescript
<PageHeader 
  title="Partidas"
  subtitle="Gerencie partidas e resultados"
  icon={<Calendar className="w-8 h-8" />}
  actions={
    canSchedule && (
      <Button onClick={() => setShowCreateModal(true)}>
        + Agendar Partida
      </Button>
    )
  }
/>
```

**Substituir Modal de Detalhes por Drawer:**
```typescript
{selectedMatch && (
  <Drawer
    isOpen={!!selectedMatch}
    onClose={() => setSelectedMatch(null)}
    title="Detalhes da Partida"
    subtitle={`${selectedMatch.home_team.name} vs ${selectedMatch.away_team.name}`}
    width="md"
  >
    {/* Conteúdo da partida */}
  </Drawer>
)}
```

---

### **4. Refatorar `/app/statistics/page.tsx`**

**Adicionar gráficos com Recharts:**

```typescript
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader, FilterBar, DataTable, Card } from '@/components/shared/ui';
import { TrendingUp } from 'lucide-react';

// ... dentro do component

<Card title="Evolução de Gols" className="reveal-fade-delay-3">
  <ResponsiveContainer width="100%" height={300}>
    <BarChart data={chartData}>
      <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 177, 194, 0.1)" />
      <XAxis 
        dataKey="name" 
        stroke="rgba(167, 177, 194, 0.5)" 
        style={{ fontSize: '12px' }}
      />
      <YAxis 
        stroke="rgba(167, 177, 194, 0.5)"
        style={{ fontSize: '12px' }}
      />
      <Tooltip 
        contentStyle={{
          backgroundColor: 'rgb(11, 15, 20)',
          border: '1px solid rgb(27, 34, 48)',
          borderRadius: '12px',
          color: 'rgb(234, 240, 255)'
        }}
      />
      <Bar dataKey="goals" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
      <defs>
        <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14CCDD" stopOpacity={0.8}/>
          <stop offset="100%" stopColor="#1B975D" stopOpacity={0.3}/>
        </linearGradient>
      </defs>
    </BarChart>
  </ResponsiveContainer>
</Card>
```

**Header:**
```typescript
<PageHeader 
  title="Estatísticas"
  subtitle="Rankings e desempenho de jogadores e times"
  icon={<TrendingUp className="w-8 h-8" />}
/>
```

---

### **5. Refatorar `/app/profile/page.tsx`**

**Header:**
```typescript
<PageHeader 
  title="Meu Perfil"
  subtitle="Gerencie suas informações pessoais"
  icon={<User className="w-8 h-8" />}
/>
```

**Player ID Card (destaque especial):**
```typescript
{user.player_profile && (
  <div className="gradient-border reveal-fade-delay-1">
    <div className="bg-surface1 rounded-3xl p-8">
      <div className="flex items-center gap-6">
        <div className="text-8xl animate-floaty">🆔</div>
        <div className="flex-1">
          <label className="text-sm text-muted block mb-2">
            Seu Player ID único
          </label>
          <div className="text-5xl font-mono font-bold gradient-text mb-3">
            #{user.player_profile.id}
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(user.player_profile.id.toString());
              showToast('ID copiado!', 'success');
            }}
          >
            📋 Copiar ID
          </Button>
          <p className="text-sm text-muted mt-4">
            Compartilhe este ID com donos de times para receber convites
          </p>
        </div>
      </div>
    </div>
  </div>
)}
```

---

## 🎨 CHECKLIST FINAL

Após implementar todas as mudanças acima:

### **Build e Validação:**
```bash
cd /home/davilohan/projects/FNC/frontend
npm run build
```

### **Verificar:**
- [ ] ❌ Palavra "Mata-mata" NÃO aparece em lugar nenhum (use Ctrl+F globalmente)
- [ ] ✅ Todas as páginas usam PageHeader
- [ ] ✅ Cores legacy (brand, panel2, stroke, muted2) substituídas por:
  - `brand` → `cyan`
  - `panel2` → `surface2`  
  - `stroke` → `border`
  - `muted2` → `muted`
- [ ] ✅ Border radius 3xl (24px) em cards
- [ ] ✅ Animações reveal-fade em seções
- [ ] ✅ Glow hover sutil em cards
- [ ] ✅ TypeScript 0 erros

---

## 📦 COMANDOS ÚTEIS

```bash
# Build
npm run build

# Dev
npm run dev

# TypeScript check
npx tsc --noEmit

# Buscar "Mata-mata" globalmente
grep -r "Mata-mata" frontend/app frontend/components --exclude-dir=node_modules

# Buscar "KNOCKOUT" (deve estar apenas em GROUPS_KNOCKOUT)
grep -r "KNOCKOUT" frontend/app --exclude-dir=node_modules
```

---

## 🎯 RESULTADO FINAL ESPERADO

Todas as 5 páginas (/teams, /championships, /matches, /statistics, /profile) terão:

✅ Identidade visual FNC consistente
✅ Paleta neon (cyan, teal, lime)
✅ Componentes reutilizáveis
✅ Animações suaves
✅ Responsivo
✅ Zero "Mata-mata" standalone
✅ Build sem erros

**O projeto estará 100% com identidade premium SaaS esports! 🚀**
