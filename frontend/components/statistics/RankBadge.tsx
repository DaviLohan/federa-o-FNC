import type { PlayerTier } from '@/types';
import { getTierStyle, tierRgba } from './tierStyles';

interface RankBadgeProps {
  tier: PlayerTier;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function RankBadge({ tier, size = 'sm', showIcon = true }: RankBadgeProps) {
  const s = getTierStyle(tier);
  const Icon = s.icon;
  const sizeCls = size === 'md' ? 'text-[11px] px-2.5 py-1 gap-1.5' : 'text-[10px] px-2 py-0.5 gap-1';
  const iconCls = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3';

  return (
    <span
      className={`inline-flex items-center rounded-full border font-semibold uppercase tracking-wide ${s.text} ${sizeCls}`}
      style={{ borderColor: tierRgba(s.solid, 0.4), background: tierRgba(s.solid, 0.1) }}
    >
      {showIcon && <Icon className={iconCls} />}
      {s.label}
    </span>
  );
}
