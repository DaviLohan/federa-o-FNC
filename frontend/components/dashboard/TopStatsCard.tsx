'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Goal, Handshake } from 'lucide-react';
import type { PlayerLeaderboardPayload, PlayerLeaderboardRow } from '@/types';
import { DashboardCard } from './DashboardCard';
import { PlayerAvatar } from '@/components/statistics/PlayerAvatar';
import { EmptyState, Skeleton } from '@/components/shared/ui';

type Tab = 'goals' | 'assists';

function StatRow({ row, rank, value }: { row: PlayerLeaderboardRow; rank: number; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.03]">
      <span className="w-4 shrink-0 text-center font-mono text-sm font-bold text-muted2 tabular-nums">{rank}</span>
      <PlayerAvatar name={row.player_name} avatar={row.avatar} size="sm" ring={false} />
      <div className="min-w-0 flex-1">
        <Link href={`/players/${row.player_id}`} className="block truncate text-sm font-semibold text-text transition-colors hover:text-gold">
          {row.player_name}
        </Link>
        <p className="truncate text-[11px] text-muted2">{row.team?.name || '—'}</p>
      </div>
      <span className="shrink-0 font-mono text-lg font-bold text-gold tabular-nums">{value}</span>
    </div>
  );
}

export function TopStatsCard({
  scorers,
  assisters,
  loading,
}: {
  scorers?: PlayerLeaderboardPayload;
  assisters?: PlayerLeaderboardPayload;
  loading?: boolean;
}) {
  const [tab, setTab] = useState<Tab>('goals');
  const rows = (tab === 'goals' ? scorers?.results : assisters?.results) ?? [];

  return (
    <DashboardCard title="Destaques individuais" icon={<Goal className="h-4 w-4" />} href="/statistics" bodyClassName="space-y-2">
      {/* Abas */}
      <div className="flex gap-1 rounded-xl bg-panel2 p-1">
        {([['goals', 'Artilharia', Goal], ['assists', 'Assistências', Handshake]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
              tab === key ? 'bg-gold/15 text-gold' : 'text-muted2 hover:text-text'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height="40px" className="rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="⚽" size="sm" title="Sem dados ainda" description="Os líderes aparecem conforme as partidas são reportadas." />
      ) : (
        <div className="space-y-0.5">
          {rows.slice(0, 5).map((row, i) => (
            <StatRow key={row.player_id} row={row} rank={i + 1} value={tab === 'goals' ? row.goals : row.assists} />
          ))}
        </div>
      )}
    </DashboardCard>
  );
}
