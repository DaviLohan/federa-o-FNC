'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Trophy, Shield, TrendingUp } from 'lucide-react';
import { statisticsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { TabsPremium, TabPremium } from '@/components/shared/ui';
import { TierRankingCard } from '@/components/statistics/TierRankingCard';
import { RankingSkeleton } from '@/components/statistics/RankingSkeleton';
import { RankingErrorState } from '@/components/statistics/RankingErrorState';
import { RankingEmptyState } from '@/components/statistics/RankingEmptyState';
import { MyRankingStatus } from '@/components/statistics/MyRankingStatus';
import { RoadToPlatina } from '@/components/statistics/RoadToPlatina';
import { RankingHero } from '@/components/statistics/RankingHero';
import { RankingSummaryCards } from '@/components/statistics/RankingSummaryCards';
import { RankingPodium } from '@/components/statistics/RankingPodium';
import { RankingTable } from '@/components/statistics/RankingTable';
import { WeeklySelectionSection } from '@/components/weekly-selection/WeeklySelectionSection';

export default function StatisticsPage() {
  const [tab, setTab] = useState('geral');
  const user = useAuthStore((s) => s.user);

  const rankingQuery = useQuery({
    queryKey: ['competitive-rankings'],
    queryFn: () => statisticsAPI.getCompetitiveRankings(),
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const meQuery = useQuery({
    queryKey: ['competitive-rankings-me', user?.id],
    queryFn: () => statisticsAPI.getCompetitiveRankingMe(),
    enabled: !!user,
    retry: false,
    refetchInterval: user ? 30000 : false,
    refetchOnWindowFocus: true,
  });

  const topGeneral = useMemo(() => rankingQuery.data?.general ?? [], [rankingQuery.data]);
  const isRankingTab = tab === 'geral' || tab === 'tiers';

  return (
    <div className="space-y-6">
      <RankingHero
        cycleLabel={rankingQuery.data?.cycle?.slug}
        isFallbackCycle={rankingQuery.data?.cycle?.is_fallback_cycle}
      />

      {rankingQuery.data && rankingQuery.data.total_players > 0 && (
        <RankingSummaryCards data={rankingQuery.data} />
      )}

      <TabsPremium value={tab} onChange={setTab}>
        <TabPremium
          value="geral"
          label="Ranking Geral"
          icon={<TrendingUp className="w-4 h-4" />}
          badge={topGeneral.length}
        />
        <TabPremium
          value="tiers"
          label="Ranking por Rank"
          icon={<Shield className="w-4 h-4" />}
          badge={4}
        />
        <TabPremium
          value="weekly-selection"
          label="Seleção da Semana"
          icon={<Award className="w-4 h-4" />}
          badge={352}
        />
        <TabPremium
          value="evolucao"
          label="Minha Evolução"
          icon={<Trophy className="w-4 h-4" />}
        />
      </TabsPremium>

      {isRankingTab && rankingQuery.isLoading && <RankingSkeleton />}
      {isRankingTab && rankingQuery.isError && (
        <RankingErrorState onRetry={() => rankingQuery.refetch()} />
      )}

      {isRankingTab && !rankingQuery.isLoading &&
        !rankingQuery.isError &&
        rankingQuery.data &&
        rankingQuery.data.total_players === 0 && <RankingEmptyState />}

      {!rankingQuery.isLoading &&
        !rankingQuery.isError &&
        rankingQuery.data &&
        rankingQuery.data.total_players > 0 &&
        tab === 'geral' && (
          <div className="space-y-6">
            <RankingPodium rows={topGeneral} />
            <RankingTable rows={topGeneral} />
          </div>
        )}

      {!rankingQuery.isLoading &&
        !rankingQuery.isError &&
        rankingQuery.data &&
        rankingQuery.data.total_players > 0 &&
        tab === 'tiers' && (
          <div className="space-y-3">
            <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <h2 className="text-base font-bold text-text md:text-lg">Top 10 jogadores por rank</h2>
              <p className="text-xs text-muted2">
                Os 5 melhores elegíveis de cada rank ficam em zona de promoção.
              </p>
            </header>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <TierRankingCard
                title="Bronze"
                tier="BRONZE"
                rows={rankingQuery.data.tiers.bronze}
              />
              <TierRankingCard
                title="Prata"
                tier="SILVER"
                rows={rankingQuery.data.tiers.prata}
              />
              <TierRankingCard
                title="Ouro"
                tier="GOLD"
                rows={rankingQuery.data.tiers.ouro}
              />
              <TierRankingCard
                title="Platina"
                tier="PLATINUM"
                rows={rankingQuery.data.tiers.platina}
              />
            </div>
          </div>
        )}

      {tab === 'weekly-selection' && <WeeklySelectionSection embedded />}

      {tab === 'evolucao' && (
        <div className="space-y-4">
          {meQuery.isLoading && <RankingSkeleton />}
          {meQuery.isError && (
            <RankingErrorState onRetry={() => meQuery.refetch()} />
          )}
          {meQuery.data && (
            <>
              <MyRankingStatus me={meQuery.data} />
              <RoadToPlatina me={meQuery.data} />
            </>
          )}
          {!user && (
            <div className="rounded-2xl border border-dashed border-stroke bg-panel/60 p-8 text-center">
              <p className="text-sm font-semibold text-text">
                Faça login para visualizar sua evolução individual no ranking.
              </p>
              <p className="mt-1 text-xs text-muted2">
                Sua trilha Road to Platina aparece aqui assim que você jogar partidas válidas.
              </p>
            </div>
          )}
          {user && !meQuery.isLoading && !meQuery.isError && !meQuery.data && (
            <div className="rounded-2xl border border-dashed border-stroke bg-panel/60 p-8 text-center">
              <p className="text-sm font-semibold text-text">
                Jogue partidas válidas para acompanhar sua evolução no ranking.
              </p>
              <p className="mt-1 text-xs text-muted2">
                Seus stats aparecem após o primeiro reporte oficial.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
