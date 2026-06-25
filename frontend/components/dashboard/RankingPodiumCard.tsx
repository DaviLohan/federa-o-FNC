'use client';

import { Crown } from 'lucide-react';
import type { CompetitiveRankingPayload } from '@/types';
import { DashboardCard } from './DashboardCard';
import { RankingPodium } from '@/components/statistics/RankingPodium';
import { EmptyState, Skeleton } from '@/components/shared/ui';

export function RankingPodiumCard({ ranking, loading }: { ranking?: CompetitiveRankingPayload; loading?: boolean }) {
  const rows = ranking?.general ?? [];
  return (
    <DashboardCard title="Pódio do ranking" icon={<Crown className="h-4 w-4" />} href="/statistics">
      {loading ? (
        <Skeleton height="180px" className="rounded-2xl" />
      ) : rows.length === 0 ? (
        <EmptyState icon="🏆" size="sm" title="Ranking em formação" description="Finalize partidas reportadas para gerar o ranking." />
      ) : (
        <RankingPodium rows={rows} showHeader={false} />
      )}
    </DashboardCard>
  );
}
