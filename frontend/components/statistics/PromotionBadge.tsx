import { ChevronsUp, Crown } from 'lucide-react';
import type { PlayerTier } from '@/types';

interface PromotionBadgeProps {
  tier: PlayerTier;
  isPromotionZone: boolean;
  size?: 'sm' | 'md';
}

export function PromotionBadge({ tier, isPromotionZone, size = 'sm' }: PromotionBadgeProps) {
  const sizeCls = size === 'md' ? 'text-[11px] px-2.5 py-1 gap-1' : 'text-[10px] px-2 py-0.5 gap-1';
  const iconCls = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  if (tier === 'PLATINUM') {
    return (
      <span className={`inline-flex items-center rounded-full border border-cyan-300/40 bg-cyan-400/10 font-semibold uppercase tracking-wide text-cyan-100 ${sizeCls}`}>
        <Crown className={iconCls} />
        Elite
      </span>
    );
  }

  if (!isPromotionZone) return null;

  return (
    <span className={`inline-flex items-center rounded-full border border-emerald-300/40 bg-emerald-400/10 font-semibold uppercase tracking-wide text-emerald-200 ${sizeCls}`}>
      <ChevronsUp className={iconCls} />
      Promoção
    </span>
  );
}
