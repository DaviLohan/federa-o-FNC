'use client';

import { Star } from 'lucide-react';
import type { WeeklySelectionPayload } from '@/types';
import { DashboardCard } from './DashboardCard';
import { MvpHero } from '@/components/weekly-selection/MvpHero';
import { WeeklyHighlights } from '@/components/weekly-selection/WeeklyHighlights';
import { EmptyState, Skeleton } from '@/components/shared/ui';

export function RoundHighlightsCard({ payload, loading }: { payload?: WeeklySelectionPayload; loading?: boolean }) {
  const hasData = !!payload && payload.players.length > 0;

  return (
    <DashboardCard
      title="Destaques da rodada"
      icon={<Star className="h-4 w-4" />}
      href="/weekly-selection"
      hrefLabel="seleção da semana"
      bodyClassName="space-y-4"
    >
      {loading ? (
        <Skeleton height="260px" className="rounded-2xl" />
      ) : !hasData ? (
        <EmptyState icon="⭐" size="sm" title="Sem seleção da rodada" description="A seleção da semana aparece quando houver partidas válidas finalizadas." />
      ) : (
        <>
          <MvpHero mvp={payload!.mvp} />
          <WeeklyHighlights payload={payload!} />
        </>
      )}
    </DashboardCard>
  );
}
