'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import type { GlobalTeamRankingRow } from '@/types';
import { DashboardCard } from './DashboardCard';
import { EmptyState, Skeleton } from '@/components/shared/ui';

export function TeamStandingsCard({
  rows,
  myTeamId,
  loading,
}: {
  rows: GlobalTeamRankingRow[];
  myTeamId?: number;
  loading?: boolean;
}) {
  return (
    <DashboardCard title="Classificação de times" icon={<Shield className="h-4 w-4" />} href="/statistics" bodyClassName="space-y-1.5">
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} height="34px" className="rounded-lg" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState icon="🛡️" size="sm" title="Sem classificação" description="A classificação de times aparece após partidas finalizadas." />
      ) : (
        rows.slice(0, 6).map((row) => {
          const mine = row.team_id === myTeamId;
          return (
            <Link
              key={row.team_id}
              href={`/teams/${row.team_id}`}
              className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${
                mine ? 'border border-gold/40 bg-gold/10' : 'hover:bg-white/[0.03]'
              }`}
            >
              <span className="w-5 shrink-0 text-center font-mono text-sm font-bold text-muted2 tabular-nums">{row.position}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">{row.team_name}</span>
              <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted2">{row.tier_display}</span>
              <span className="w-10 shrink-0 text-right font-mono text-sm font-bold text-gold tabular-nums">{row.points}</span>
            </Link>
          );
        })
      )}
    </DashboardCard>
  );
}
