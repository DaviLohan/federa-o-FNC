import type { PlayerTier } from '@/types';

// Paleta consistente com RankBadge (Bronze/âmbar, Prata/slate, Ouro/amarelo, Platina/ciano).
export const TIER_COLORS: Record<PlayerTier, string> = {
  BRONZE: '#D69A4E',
  SILVER: '#CBD5E1',
  GOLD: '#F3D36B',
  PLATINUM: '#67E8F9',
  DIAMOND: '#93C5FD',
  ELITE: '#C4B5FD',
};

export const TIER_LABELS: Record<PlayerTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
  DIAMOND: 'Diamante',
  ELITE: 'Elite',
};

export const TIER_ORDER: PlayerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND', 'ELITE'];

// Cores semânticas (espelham os tokens de globals.css).
export const CHART = {
  gold: '#D6A11E',
  gold2: '#F3D36B',
  green: '#2ECC71',
  brand: '#D6A11E',
  axis: 'rgba(255,255,255,0.40)',
  grid: 'rgba(255,255,255,0.06)',
  cursor: 'rgba(255,255,255,0.04)',
};

export const AXIS_TICK = {
  fill: CHART.axis,
  fontSize: 11,
  fontFamily: 'JetBrains Mono, monospace',
};
