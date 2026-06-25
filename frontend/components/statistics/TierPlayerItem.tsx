'use client';

import type { CompetitiveRankingPlayerRow, PlayerTier } from '@/types';
import { PromotionBadge } from './PromotionBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { CompactStats } from './CompactStats';
import { MovementIndicator } from './MovementIndicator';
import { getTierStyle, tierRgba } from './tierStyles';

interface TierPlayerItemProps {
  row: CompetitiveRankingPlayerRow;
  tier: PlayerTier;
}

const medalColor: Record<number, string> = {
  1: '#F3D36B',
  2: '#CBD5E1',
  3: '#C9803E',
};

export function TierPlayerItem({ row, tier }: TierPlayerItemProps) {
  const s = getTierStyle(tier);
  const medal = medalColor[row.position];
  const accent = row.isPromotionZone ? tierRgba(s.solid, 0.7) : 'transparent';

  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-stroke/50 bg-panel2/30 px-3 py-2 transition-all hover:border-white/15 hover:bg-panel2/60"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums"
          style={
            medal
              ? { color: medal, borderColor: `${medal}55`, background: `${medal}1a` }
              : { color: 'var(--muted2)', borderColor: 'rgba(255,255,255,0.08)' }
          }
        >
          {row.position}
        </span>

        <PlayerAvatar name={row.playerName} avatar={row.avatar} tier={tier} size="sm" ring={false} />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-text">{row.playerName}</p>
            <MovementIndicator delta={row.positionDelta} />
          </div>
          <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
        </div>

        <div className="hidden sm:block">
          <CompactStats
            rating={row.averageRating}
            goals={row.goals}
            assists={row.assists}
            matches={row.matchesPlayed}
            variant="inline"
          />
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="font-mono text-base font-extrabold leading-none text-gold tabular-nums">
            {row.score.toFixed(2)}
          </span>
          <PromotionBadge tier={tier} isPromotionZone={row.isPromotionZone} />
        </div>
      </div>

      {/* stats no mobile */}
      <div className="mt-2 sm:hidden">
        <CompactStats
          rating={row.averageRating}
          goals={row.goals}
          assists={row.assists}
          matches={row.matchesPlayed}
          variant="inline"
        />
      </div>
    </article>
  );
}
