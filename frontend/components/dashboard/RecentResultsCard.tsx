'use client';

import { History } from 'lucide-react';
import type { Match } from '@/types';
import { DashboardCard } from './DashboardCard';
import { MatchRow } from './MatchRow';
import { EmptyState, Skeleton } from '@/components/shared/ui';

export function RecentResultsCard({ matches, loading }: { matches: Match[]; loading?: boolean }) {
  return (
    <DashboardCard title="Resultados recentes" icon={<History className="h-4 w-4" />} href="/matches" bodyClassName="space-y-2">
      {loading ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="48px" className="rounded-xl" />)}</div>
      ) : matches.length === 0 ? (
        <EmptyState icon="🏁" size="sm" title="Sem resultados ainda" description="As partidas finalizadas aparecerão aqui." />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {matches.slice(0, 6).map((m) => <MatchRow key={m.id} match={m} />)}
        </div>
      )}
    </DashboardCard>
  );
}
