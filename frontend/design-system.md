# PRO ELEVEN — Design System

> Identidade visual oficial da Pro Eleven, baseada na nova marca P11 com escudo dourado/preto e linguagem premium.
> Este documento é a fonte da verdade para todas as decisões visuais do projeto.

---

## 1. Filosofia Visual

**Vibe:** E-sports de elite · Realeza competitiva · Dark Premium · Poder contido

O design comunica **autoridade e prestígio**. Cada detalhe deve reforçar a ideia de que o utilizador faz parte de algo exclusivo. Os elementos dourados são a espinha dorsal — usados com critério, nunca em excesso.

**Pilares:**
- **Escuridão profunda** como tela — o ouro brilha mais contra o preto absoluto
- **Ouro metálico multi-camada** — gradientes que simulam reflexo de metal real
- **Bordas afiadas** — geometria angular, não orgânica
- **Glow sutil** — luz que emana dos elementos, não que os envolve
- **Vermelho como acento único** — usado exclusivamente para alertas e destrutivo

---

## 2. Paleta de Cores

### 2.1 Fundos (Backgrounds)

| Token Tailwind | Valor CSS | Hex | Uso |
|---|---|---|---|
| `bg-bg` | `rgb(7 9 13)` | `#07090D` | Fundo principal da aplicação |
| `bg-surface1` | `rgb(11 15 22)` | `#0B0F16` | Cards, sidebars, painéis primários |
| `bg-surface2` | `rgb(16 24 40)` | `#101828` | Inputs, painéis secundários, hover states |

### 2.2 Gold — Cor de Marca

Inspirado nas camadas metálicas do escudo: borda externa branca → ouro escuro → ouro médio → highlight central quase branco.

| Token | Hex | Uso |
|---|---|---|
| `gold3` / `--gold3` | `#B78312` | Sombras, pressed state, borda externa do gradiente |
| `gold` / `--gold` | `#D6A11E` | Base — bordas, ícones, textos de destaque |
| `gold2` / `--gold2` | `#F3D36B` | Hover, highlight, reflexo de luz |
| `#FCF6BA` | — | Ponto máximo de brilho (highlight interno — usar só em SVG/gradientes) |

**Gradiente metálico padrão:**
```css
background: linear-gradient(135deg, #B38728, #FCF6BA, #B38728, #FBF5B7);
```

**Gradient text utilitário:**
```tsx
className="bg-clip-text text-transparent bg-gradient-to-r from-gold via-gold2 to-gold"
// ou a classe utilitária já existente:
className="gradient-text"
```

### 2.3 Vermelho — Acento de Alerta

Inspirado no brilho e contraste do sistema visual da marca Pro Eleven.

| Uso | Hex | Token |
|---|---|---|
| Botões destrutivos (Excluir) | `#E53935` | `--error` / `--accent-red` |
| Badges de contestação | `#E53935` | `text-error` / `text-accent-red` |
| Indicadores críticos | `#E53935` | — |

> **Regra de ouro:** O vermelho nunca compete com o dourado. Se há dourado em destaque, o vermelho fica em segundo plano (menor, mais discreto).

### 2.4 Estados do Sistema

| Estado | Hex | Token Tailwind |
|---|---|---|
| Sucesso / Vitória | `#2ECC71` | `text-success`, `bg-success` |
| Aviso / Empate | `#F1C40F` | `text-warning`, `bg-warning` |
| Erro / Derrota | `#E53935` | `text-error`, `bg-error` |
| Info | `#3B82F6` | `text-info`, `bg-info` |

### 2.5 Texto

| Uso | Classe | Opacidade |
|---|---|---|
| Títulos principais | `text-text` | 100% |
| Corpo de texto | `text-text/90` | 90% |
| Texto secundário | `text-muted` / `text-text/60` | 60% |
| Placeholder / desativado | `text-muted` / `text-text/40` | 40% |
| Ouro de destaque | `text-gold` | — |

### 2.6 Bordas

| Contexto | Classe | Valor |
|---|---|---|
| Borda padrão | `border-border` | `rgba(255,255,255,0.08)` |
| Borda gold focus | `border-gold/30` | `rgba(214,161,30,0.30)` |
| Borda gold strong | `border-gold/50` | `rgba(214,161,30,0.50)` |
| Borda de alerta/erro | `border-error/30` | `rgba(229,57,53,0.30)` |
| Sem borda visível | `border-transparent` | — |

---

## 3. Tipografia

### 3.1 Famílias

| Família | Token Tailwind | Google Fonts | Pesos | Uso |
|---|---|---|---|---|
| **Space Grotesk** | `font-heading` | ✅ Carregada | 400–700 | H1–H4, nomes de times, títulos de secções |
| **Inter** | `font-body` | ✅ Carregada | 400–700 | Parágrafos, labels, UI genérica |
| **JetBrains Mono** | `font-mono` | ✅ Carregada | 400–700 | Estatísticas, scores, abreviações, contagens |

### 3.2 Hierarquia

```
H1 — font-heading text-4xl md:text-5xl font-black uppercase tracking-wide
     → Nome do time, títulos de página

H2 — font-heading text-2xl md:text-3xl font-bold
     → Títulos de secção (ex: "Membros", "Estatísticas")

H3 — font-heading text-xl font-semibold
     → Subtítulos de cards

Body Large  — font-body text-base text-text/90 leading-relaxed
Body Normal — font-body text-sm text-muted leading-relaxed
Caption     — font-body text-xs text-muted uppercase tracking-wider

Stats/Numbers — font-mono text-3xl font-black text-text
               (ex: "8" jogadores, "3" vitórias)
```

### 3.3 Abreviações e Labels Técnicos

Sempre em maiúsculas, `font-mono`, tamanho reduzido:
```tsx
<span className="font-mono text-xs font-bold text-gold uppercase tracking-widest">
  FNC
</span>
```

---

## 4. Espaçamento e Layout

| Nível | Valor | Uso |
|---|---|---|
| XS | `gap-2` / `p-2` | Elementos internos compactos |
| SM | `gap-4` / `p-4` | Padding interno de cards pequenos |
| MD | `gap-6` / `p-6` | Padding padrão de cards |
| LG | `gap-8` / `p-8` | Secções maiores, hero |
| XL | `gap-12` / `p-12` | Entre secções principais |

**Grid padrão:** `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

**Container máximo:** `max-w-7xl mx-auto px-4 sm:px-6`

---

## 5. Border Radius

| Elemento | Classe | Valor |
|---|---|---|
| Ícones pequenos / badges | `rounded-lg` | 8px |
| Inputs, botões | `rounded-xl` | 12px |
| Cards | `rounded-2xl` | 16px |
| Hero sections, modais | `rounded-3xl` | 24px |
| Avatares circulares | `rounded-full` | 50% |

> **Nota:** O logo usa geometria angular afiada, mas a UI usa arredondamento generoso para conforto. O equilíbrio está nas bordas douradas que criam a percepção de "afiado" mesmo com cantos suaves.

---

## 6. Componentes Base

### 6.1 Card

```tsx
// Padrão
<Card>...</Card>
// → bg-panel border border-stroke rounded-2xl p-4 md:p-6

// Glass (Glassmorphism)
<Card glass>...</Card>
// → backdrop-blur-sm bg-opacity-80

// Premium (Gradient Border Dourado)
<Card premium>...</Card>
// → gradient-border wrapping → rounded-2xl bg-surface1

// Com hover lift
<Card hoverable>...</Card>
// → hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/10
```

**Padrão de card de stats/membro:**
```tsx
<div className="group p-5 rounded-2xl bg-surface1 border border-border
                hover:border-gold/30 hover:-translate-y-1
                hover:shadow-xl hover:shadow-gold/10
                transition-all duration-300">
```

### 6.2 Button

```tsx
// Primário — Gold sólido com shimmer
<Button variant="primary">Convidar Jogador</Button>

// Secundário — Outline gold
<Button variant="secondary">Ver Detalhes</Button>

// Ghost — Texto gold com underline animado
<Button variant="ghost">Cancelar</Button>

// Destrutivo — NUNCA usar variant="primary" para ações destrutivas
// Usar classe customizada:
<Button
  variant="ghost"
  className="!text-error border border-error/30 hover:bg-error/10
             hover:border-error/60 hover:shadow-lg hover:shadow-error/20"
>
  Excluir Time
</Button>
```

### 6.3 Badge

```tsx
<Badge variant="gold">Ativo</Badge>        // → gold bg+border
<Badge variant="premium">Dono</Badge>      // → gold pulsante
<Badge variant="finished">Finalizada</Badge> // → success
<Badge variant="contested">Contestada</Badge> // → vermelho
<Badge variant="live">Em Andamento</Badge>  // → gold pulsante
```

### 6.4 Modal

```tsx
<Modal
  isOpen={open}
  onClose={close}
  title="Título em Destaque"
  description="Subtítulo opcional"
  size="lg"  // sm | md | lg | xl | 2xl
>
  {/* conteúdo */}
</Modal>
```

---

## 7. Padrões de Glassmorphism

Usado em overlays, modais e cards de destaque sobre fundos com glow:

```css
/* Card glass padrão */
background: rgba(11, 15, 22, 0.75);
backdrop-filter: blur(12px);
border: 1px solid rgba(214, 161, 30, 0.15);
border-radius: 16px;

/* Tailwind equivalente */
className="bg-surface1/75 backdrop-blur-xl border border-gold/15 rounded-2xl"
```

---

## 8. Efeitos de Glow

### Gold Glow (Marca)
```css
/* Sombra gold em elementos principais */
box-shadow: 0 0 20px rgba(214, 161, 30, 0.25), 0 0 60px rgba(214, 161, 30, 0.08);

/* Tailwind aproximado */
className="shadow-[0_0_20px_rgba(214,161,30,0.25),0_0_60px_rgba(214,161,30,0.08)]"
```

### Avatar/Logo Ring Glow
```css
/* Anel duplo com animação */
box-shadow: 0 0 0 2px rgba(214,161,30,0.4), 0 0 20px rgba(214,161,30,0.2);
animation: pulseGold 2.5s ease-in-out infinite;
```

### Red Glow (Destrutivo)
```css
box-shadow: 0 0 16px rgba(229, 57, 53, 0.2);
className="hover:shadow-[0_0_16px_rgba(229,57,53,0.2)]"
```

---

## 9. Animações

### 9.1 Keyframes Disponíveis (Tailwind)

| Classe | Efeito | Duração | Uso |
|---|---|---|---|
| `animate-glow` | Pulsação de opacidade | 2.2s | Badges live, logos, ícones de destaque |
| `animate-pulseGold` | Expansão de box-shadow dourado | 2.5s | Avatares, botões principais |
| `animate-shimmerGold` | Varredura de luz horizontal | 3s | Botões, banners de destaque |
| `animate-floaty` | Flutuação vertical suave | 4s | Ícones decorativos, logos |
| `animate-reveal` | FadeIn + slide up | 0.5s | Entrada de elementos individuais |
| `animate-gridMove` | Grade de fundo em movimento | 6s | Backgrounds decorativos |
| `animate-scanline` | Linha de varredura vertical | 8s | Efeito tech nos heroes |

### 9.2 Padrões Framer Motion

```tsx
// === VARIANTES DE PÁGINA (stagger) ===
const pageVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
}

// === ITEM INDIVIDUAL (slide up + fade) ===
const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] } }
}

// === CARD COM HOVER LIFT ===
<motion.div
  variants={itemVariants}
  whileHover={{ y: -4, transition: { duration: 0.2 } }}
  whileTap={{ scale: 0.97 }}
>

// === ANIMAÇÃO DE ENTRADA DE MODAL ===
const modalVariants = {
  hidden:  { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.3, ease: 'easeOut' } },
  exit:    { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.2 } }
}

// === ACESSIBILIDADE (useReducedMotion) ===
const prefersReduced = useReducedMotion()
const variants = prefersReduced ? {} : itemVariants
```

### 9.3 Regras de Uso de Animações

- **Duração máxima** de transições de UI: 400ms
- **Stagger entre elementos:** 80ms (não mais que 120ms)
- **Nunca animar** cores de fundo complexas (pesado para o browser)
- **Sempre usar** `will-change: transform` implícito via Framer Motion
- **Respeitar** `prefers-reduced-motion` via `useReducedMotion()`

---

## 10. Padrões de Página

### 10.1 Hero de Página

```
┌─────────────────────────────────────────────────────────────┐
│ Fundo: surface1 + gradient radial gold no topo              │
│ Borda: gradient dourado (gradient-border)                   │
│ Padding: p-6 sm:p-8                                         │
│                                                             │
│  [Avatar com ring glow]  [Nome + Abreviação]                │
│                          [Badges de status]                 │
│                          [Descrição]                        │
│                          [Dono]       [Ações]               │
└─────────────────────────────────────────────────────────────┘
```

### 10.2 Grid de Mini-Stats

```tsx
// 3 colunas, cards com ícone + número grande + label
<div className="grid grid-cols-3 gap-4">
  <div className="group p-4 rounded-2xl bg-surface1 border border-border
                  hover:border-gold/30 hover:-translate-y-1
                  hover:shadow-lg hover:shadow-gold/10 transition-all duration-300">
    <Icon className="w-5 h-5 text-gold" />
    <div className="font-mono text-3xl font-black text-text">{value}</div>
    <div className="text-xs text-muted">{label}</div>
  </div>
</div>
```

### 10.3 Tab Bar

Usar `TabsPremium` (já existente) ou o padrão:
```tsx
// Indicador gold deslizante com Framer Motion (layoutId)
<motion.span layoutId="tab-indicator"
  className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-gold/0 via-gold to-gold/0" />
```

---

## 11. Regras Editoriais

1. **Nunca** usar brancos puros (`#FFFFFF`) em fundos — sempre superfícies escuras
2. **Nunca** usar mais de 2 cores de destaque por componente (gold + uma cor de estado)
3. **Sempre** adicionar `transition-all duration-300` em elementos com hover
4. **Sempre** incluir feedback tátil em botões: `whileTap={{ scale: 0.96 }}`
5. **Nunca** usar `text-yellow-*` do Tailwind — usar exclusivamente `text-gold` / `text-gold2`
6. **Glassmorphism** só em elementos sobre fundos escuros com profundidade — nunca em texto
7. O **ponto vermelho** do logo representa precisão e alerta — vermelho só para ações/estados negativos

---

## 12. Checklist de Qualidade

Antes de mergear qualquer componente, verificar:

- [ ] Fundo é escuro (surface1, surface2 ou bg)
- [ ] Bordas usam tokens gold/border, não cores hardcoded
- [ ] Textos obedecem a hierarquia de opacidade
- [ ] Hover states têm transição suave (200–300ms)
- [ ] Botões destrutivos usam vermelho (nunca gold)
- [ ] Animações Framer Motion respeitam `useReducedMotion()`
- [ ] Componente é responsivo (mobile-first)
- [ ] Sem `console.log` no código de produção
- [ ] Build passa sem erros TypeScript

---

*Versão 1.1 — Atualizado com base na identidade visual Pro Eleven (logo P11 em escudo dourado/preto)*
