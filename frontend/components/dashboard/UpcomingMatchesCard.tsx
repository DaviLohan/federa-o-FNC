'use client';

import { CalendarClock } from 'lucide-react';
import type { Match } from '@/types';
import { DashboardCard } from './DashboardCard';
import { MatchRow } from './MatchRow';
import { EmptyState, Skeleton } from '@/components/shared/ui';

export function UpcomingMatchesCard({ matches, loading }: { matches: Match[]; loading?: boolean }) {
  return (
    <DashboardCard title="Próximos jogos" icon={<CalendarClock className="h-4 w-4" />} href="/matches" bodyClassName="space-y-2">
      {loading ? (
        <div className="space-y-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="48px" className="rounded-xl" />)}</div>
      ) : matches.length === 0 ? (
        <EmptyState icon="📅" size="sm" title="Nenhuma partida agendada" description="As próximas partidas aparecerão aqui." />
      ) : (
        matches.slice(0, 5).map((m) => <MatchRow key={m.id} match={m} />)
      )}
    </DashboardCard>
  );
}
