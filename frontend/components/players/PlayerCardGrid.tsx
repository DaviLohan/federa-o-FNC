'use client';

import type { ReactNode } from 'react';
import type { PlayerLeaderboardRow, PlayerTier } from '@/types';
import { getTierStyle, tierRgba } from '@/components/statistics/tierStyles';
import { PlayerCard } from './PlayerCard';

// Ordem de exibição dos ranks (do topo para a base).
const TIER_ORDER: PlayerTier[] = ['ELITE', 'DIAMOND', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE'];

interface PlayerCardGridProps {
  rows: PlayerLeaderboardRow[];
  /** Agrupar por rank (Bronze, Prata, …). Default: true. */
  groupByRank?: boolean;
  /** Rodapé por jogador (ex.: entrada/ativo no elenco), keyed por player_id. */
  footerFor?: (row: PlayerLeaderboardRow) => ReactNode;
}

function Grid({ rows, footerFor }: { rows: PlayerLeaderboardRow[]; footerFor?: PlayerCardGridProps['footerFor'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {rows.map((row) => (
        <PlayerCard key={row.player_id} row={row} footer={footerFor?.(row)} />
      ))}
    </div>
  );
}

export function PlayerCardGrid({ rows, groupByRank = true, footerFor }: PlayerCardGridProps) {
  if (!groupByRank) {
    return <Grid rows={rows} footerFor={footerFor} />;
  }

  const byTier = new Map<PlayerTier, PlayerLeaderboardRow[]>();
  for (const row of rows) {
    const tier = (row.tier ?? 'BRONZE') as PlayerTier;
    if (!byTier.has(tier)) byTier.set(tier, []);
    byTier.get(tier)!.push(row);
  }

  const sections = TIER_ORDER.filter((tier) => (byTier.get(tier)?.length ?? 0) > 0);

  return (
    <div className="space-y-6">
      {sections.map((tier) => {
        const s = getTierStyle(tier);
        const Icon = s.icon;
        const group = byTier.get(tier)!;
        return (
          <section key={tier}>
            <header className="mb-3 flex items-center gap-2">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-lg border"
                style={{ color: s.solid, borderColor: tierRgba(s.solid, 0.4), background: tierRgba(s.solid, 0.12) }}
              >
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold md:text-base" style={{ color: s.solid }}>{s.label}</h3>
              <span
                className="rounded-full border px-2 py-0.5 font-mono text-[11px]"
                style={{ color: s.solid, borderColor: tierRgba(s.solid, 0.3), background: tierRgba(s.solid, 0.08) }}
              >
                {group.length}
              </span>
            </header>
            <Grid rows={group} footerFor={footerFor} />
          </section>
        );
      })}
    </div>
  );
}
