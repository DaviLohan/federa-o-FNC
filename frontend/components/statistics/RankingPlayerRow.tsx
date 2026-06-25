'use client';

import Link from 'next/link';
import type { CompetitiveRankingPlayerRow } from '@/types';
import { PromotionBadge } from './PromotionBadge';
import { RankBadge } from './RankBadge';
import { PlayerAvatar } from './PlayerAvatar';
import { CompactStats } from './CompactStats';
import { MovementIndicator } from './MovementIndicator';
import { getTierStyle, tierRgba } from './tierStyles';

interface RankingPlayerRowProps {
  row: CompetitiveRankingPlayerRow;
}

export function RankingPlayerRow({ row }: RankingPlayerRowProps) {
  const tier = getTierStyle(row.tier);
  const promo = row.isPromotionZone || row.tier === 'PLATINUM';
  const accent = promo ? tierRgba(tier.solid, 0.7) : 'transparent';

  return (
    <article
      className="group relative overflow-hidden rounded-xl border border-stroke/60 bg-panel2/30 transition-all hover:border-white/15 hover:bg-panel2/60"
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      {/* ── Desktop ── */}
      <div className="hidden items-center gap-3 px-3 py-2.5 md:grid md:grid-cols-[2.5rem_1fr_auto_auto] lg:grid-cols-[2.5rem_1.4fr_auto_5rem_auto]">
        <div className="flex flex-col items-center justify-center">
          <span className="font-mono text-sm font-bold text-muted2 tabular-nums">{row.generalPosition}</span>
          <MovementIndicator delta={row.positionDelta} />
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <PlayerAvatar name={row.playerName} avatar={row.avatar} tier={row.tier} size="md" />
          <div className="min-w-0">
            <Link
              href={`/players/${row.playerId}`}
              className="block truncate text-sm font-semibold text-text transition-colors hover:text-gold"
            >
              {row.playerName}
            </Link>
            <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
          </div>
        </div>

        <div className="hidden items-center gap-1.5 lg:flex">
          <RankBadge tier={row.tier} />
          <PromotionBadge tier={row.tier} isPromotionZone={row.isPromotionZone} />
        </div>

        <div className="text-right">
          <p className="font-mono text-xl font-extrabold leading-none text-gold tabular-nums">{row.score.toFixed(2)}</p>
        </div>

        <CompactStats
          rating={row.averageRating}
          goals={row.goals}
          assists={row.assists}
          matches={row.matchesPlayed}
          variant="inline"
          className="justify-end"
        />
      </div>

      {/* ── Mobile ── */}
      <div className="p-3 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex flex-col items-center">
              <span className="font-mono text-sm font-bold text-muted2 tabular-nums">{row.generalPosition}</span>
              <MovementIndicator delta={row.positionDelta} />
            </div>
            <PlayerAvatar name={row.playerName} avatar={row.avatar} tier={row.tier} size="md" />
            <div className="min-w-0">
              <Link
              href={`/players/${row.playerId}`}
              className="block truncate text-sm font-semibold text-text transition-colors hover:text-gold"
            >
              {row.playerName}
            </Link>
              <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-lg font-extrabold leading-none text-gold tabular-nums">{row.score.toFixed(2)}</p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted2">score</p>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <RankBadge tier={row.tier} />
          <PromotionBadge tier={row.tier} isPromotionZone={row.isPromotionZone} />
        </div>

        <CompactStats
          rating={row.averageRating}
          goals={row.goals}
          assists={row.assists}
          matches={row.matchesPlayed}
          variant="grid"
          className="mt-2.5"
        />
      </div>
    </article>
  );
}
