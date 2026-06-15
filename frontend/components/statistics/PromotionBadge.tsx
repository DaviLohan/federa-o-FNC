import type { PlayerTier } from '@/types';

interface PromotionBadgeProps {
  tier: PlayerTier;
  isPromotionZone: boolean;
  size?: 'sm' | 'md';
}

export function PromotionBadge({ tier, isPromotionZone, size = 'sm' }: PromotionBadgeProps) {
  const sizeCls = size === 'md' ? 'text-[11px] px-2.5 py-1' : 'text-[10px] px-2 py-0.5';

  if (tier === 'PLATINUM') {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full border border-cyan-300/40 bg-cyan-400/10 font-semibold uppercase tracking-wide text-cyan-100 ${sizeCls}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
        Elite Platina
      </span>
    );
  }

  if (!isPromotionZone) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-emerald-300/40 bg-emerald-400/10 font-semibold uppercase tracking-wide text-emerald-200 ${sizeCls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
      Zona de promoção
    </span>
  );
}
