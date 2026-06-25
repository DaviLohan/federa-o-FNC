'use client';

import { useState } from 'react';
import type { PlayerTier } from '@/types';
import { getTierStyle, tierRgba } from './tierStyles';

interface PlayerAvatarProps {
  name: string;
  avatar?: string | null;
  tier?: PlayerTier;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  ring?: boolean;
}

const sizeMap = {
  sm: { box: 'h-9 w-9', text: 'text-[11px]' },
  md: { box: 'h-11 w-11', text: 'text-sm' },
  lg: { box: 'h-16 w-16', text: 'text-lg' },
  xl: { box: 'h-20 w-20', text: 'text-2xl' },
};

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || '—'
  );
}

export function PlayerAvatar({ name, avatar, tier, size = 'md', ring = true }: PlayerAvatarProps) {
  const [broken, setBroken] = useState(false);
  const cfg = sizeMap[size];
  const style = tier ? getTierStyle(tier) : null;

  const ringStyle = ring && style
    ? { boxShadow: `0 0 0 2px ${tierRgba(style.solid, 0.55)}, 0 0 16px ${tierRgba(style.solid, 0.18)}` }
    : undefined;

  const showImg = avatar && !broken;

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-panel2 ${cfg.box}`}
      style={ringStyle}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar as string} alt={name} className="h-full w-full object-cover" onError={() => setBroken(true)} />
      ) : (
        <span className={`font-mono font-bold text-text ${cfg.text}`}>{getInitials(name)}</span>
      )}
    </span>
  );
}
