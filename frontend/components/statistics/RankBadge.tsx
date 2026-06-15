import type { PlayerTier } from '@/types';

interface RankBadgeProps {
  tier: PlayerTier;
  size?: 'sm' | 'md';
}

const tierLabels: Record<PlayerTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Prata',
  GOLD: 'Ouro',
  PLATINUM: 'Platina',
};

const tierStyles: Record<PlayerTier, string> = {
  BRONZE: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  SILVER: 'border-slate-300/40 bg-slate-300/10 text-slate-100',
  GOLD: 'border-yellow-300/40 bg-yellow-300/10 text-yellow-100',
  PLATINUM: 'border-cyan-300/40 bg-cyan-400/10 text-cyan-100',
};

export function RankBadge({ tier, size = 'sm' }: RankBadgeProps) {
  const sizeCls = size === 'md' ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold uppercase tracking-wide ${tierStyles[tier]} ${sizeCls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {tierLabels[tier]}
    </span>
  );
}
