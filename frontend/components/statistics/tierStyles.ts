import type { LucideIcon } from 'lucide-react';
import { Award, Crown, Gem, Shield, Diamond, Sparkles } from 'lucide-react';
import type { PlayerTier } from '@/types';

export interface TierStyle {
  label: string;
  /** Cor sólida principal (hex) — usada em rings/glows/score inline. */
  solid: string;
  /** Cor de apoio do gradiente (hex). */
  solid2: string;
  icon: LucideIcon;
  /** Classes Tailwind estáticas (escaneáveis) para texto/borda/bg do badge. */
  text: string;
  border: string;
  bg: string;
  /** Gradiente do header de divisão. */
  headerGradient: string;
}

// Paleta premium e metálica. Mantém a identidade de cada divisão.
export const TIER_STYLES: Record<PlayerTier, TierStyle> = {
  BRONZE: {
    label: 'Bronze',
    solid: '#C9803E',
    solid2: '#7C4A1E',
    icon: Shield,
    text: 'text-amber-300',
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/10',
    headerGradient: 'from-amber-600/20 via-amber-800/5 to-transparent',
  },
  SILVER: {
    label: 'Prata',
    solid: '#CBD5E1',
    solid2: '#64748B',
    icon: Award,
    text: 'text-slate-200',
    border: 'border-slate-300/40',
    bg: 'bg-slate-300/10',
    headerGradient: 'from-slate-300/20 via-slate-400/5 to-transparent',
  },
  GOLD: {
    label: 'Ouro',
    solid: '#F3D36B',
    solid2: '#B78312',
    icon: Crown,
    text: 'text-yellow-200',
    border: 'border-yellow-300/40',
    bg: 'bg-yellow-300/10',
    headerGradient: 'from-yellow-400/20 via-amber-500/5 to-transparent',
  },
  PLATINUM: {
    label: 'Platina',
    solid: '#67E8F9',
    solid2: '#0E7490',
    icon: Gem,
    text: 'text-cyan-200',
    border: 'border-cyan-300/40',
    bg: 'bg-cyan-400/10',
    headerGradient: 'from-cyan-400/20 via-cyan-600/5 to-transparent',
  },
  DIAMOND: {
    label: 'Diamante',
    solid: '#93C5FD',
    solid2: '#1D4ED8',
    icon: Diamond,
    text: 'text-blue-200',
    border: 'border-blue-300/40',
    bg: 'bg-blue-400/10',
    headerGradient: 'from-blue-400/20 via-blue-600/5 to-transparent',
  },
  ELITE: {
    label: 'Elite',
    solid: '#C4B5FD',
    solid2: '#6D28D9',
    icon: Sparkles,
    text: 'text-violet-200',
    border: 'border-violet-300/40',
    bg: 'bg-violet-400/10',
    headerGradient: 'from-violet-400/20 via-violet-600/5 to-transparent',
  },
};

export function getTierStyle(tier: PlayerTier): TierStyle {
  return TIER_STYLES[tier] ?? TIER_STYLES.BRONZE;
}

/** Converte um hex (#RRGGBB) em rgba com alpha — para rings/glows/backgrounds inline. */
export function tierRgba(hex: string, alpha: number): string {
  const v = hex.replace('#', '');
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
