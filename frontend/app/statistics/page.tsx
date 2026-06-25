'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award, Trophy, Shield, TrendingUp, Users, BarChart3, Activity, Crown, ShieldCheck,
} from 'lucide-react';
import { statisticsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import type { CompetitiveRankingPayload, RankingCycleKpis } from '@/types';
import { TabsPremium, TabPremium } from '@/components/shared/ui';
import { TierRankingCard } from '@/components/statistics/TierRankingCard';
import { RankingSkeleton } from '@/components/statistics/RankingSkeleton';
import { RankingErrorState } from '@/components/statistics/RankingErrorState';
import { RankingEmptyState } from '@/components/statistics/RankingEmptyState';
import { MyRankingStatus } from '@/components/statistics/MyRankingStatus';
import { RoadToPlatina } from '@/components/statistics/RoadToPlatina';
import { RankingHero } from '@/components/statistics/RankingHero';
import { RankingPodium } from '@/components/statistics/RankingPodium';
import { RankingTable } from '@/components/statistics/RankingTable';
import { KpiTrendCard } from '@/components/statistics/KpiTrendCard';
import { InsightsPanel } from '@/components/statistics/InsightsPanel';
import { PeriodSelector, formatCycleLabel } from '@/components/statistics/PeriodSelector';
import { MyEvolutionChart } from '@/components/statistics/charts/MyEvolutionChart';
import { WeeklySelectionSection } from '@/components/weekly-selection/WeeklySelectionSection';
import { PlayerStatsRankingSection } from '@/components/players/PlayerStatsRankingSection';

/** KPIs do ciclo: usa a comparação do backend; faz fallback a partir das linhas se ausente. */
function deriveKpis(data: CompetitiveRankingPayload): { current: RankingCycleKpis; deltas: RankingCycleKpis | null } {
  if (data.comparison?.current) {
    return { current: data.comparison.current, deltas: data.comparison.deltas };
  }
  const rows = data.general;
  const scores = rows.map((r) => r.score);
  const current: RankingCycleKpis = {
    total_players: data.total_players,
    total_matches: rows.reduce((a, r) => a + r.matchesPlayed, 0),
    avg_score: scores.length ? Number((scores.reduce((a, s) => a + s, 0) / scores.length).toFixed(2)) : 0,
    top_score: scores.length ? Math.max(...scores) : 0,
    teams: new Set(rows.map((r) => r.teamName)).size,
    eligible: rows.filter((r) => r.isPromotionEligible).length,
  };
  return { current, deltas: null };
}

export default function StatisticsPage() {
  const [tab, setTab] = useState('geral');
  const [cycle, setCycle] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user);

  const cyclesQuery = useQuery({
    queryKey: ['ranking-cycles'],
    queryFn: () => statisticsAPI.getCompetitiveCycles(),
    staleTime: 10 * 60 * 1000,
  });

  const rankingQuery = useQuery({
    queryKey: ['competitive-rankings', cycle],
    queryFn: () => statisticsAPI.getCompetitiveRankings(cycle ?? undefined),
    // Só faz polling no ciclo atual; ciclos históricos são imutáveis.
    refetchInterval: cycle ? false : 60000,
    refetchOnWindowFocus: false,
  });

  // Só busca dados pessoais quando a aba de evolução está ativa (remove fetch redundante).
  const meQuery = useQuery({
    queryKey: ['competitive-rankings-me', user?.id, cycle],
    queryFn: () => statisticsAPI.getCompetitiveRankingMe(cycle ?? undefined),
    enabled: !!user && tab === 'evolucao',
    retry: false,
    refetchOnWindowFocus: false,
  });

  const data = rankingQuery.data;
  const topGeneral = useMemo(() => data?.general ?? [], [data]);
  const kpis = useMemo(() => (data ? deriveKpis(data) : null), [data]);
  const cycleOptions = cyclesQuery.data?.results ?? [];
  const isRankingTab = tab === 'geral' || tab === 'tiers';
  const hasData = !!data && data.total_players > 0;

  const periodSelector = cycleOptions.length > 0 && (
    <PeriodSelector
      cycles={cycleOptions}
      value={cycle ?? cycleOptions[0]?.slug ?? null}
      onChange={(slug) => {
        const isCurrent = cycleOptions[0]?.slug === slug && cycleOptions[0]?.status === 'OPEN';
        setCycle(isCurrent ? null : slug);
      }}
    />
  );

  return (
    <div className="space-y-5">
      <RankingHero
        cycleLabel={data?.cycle?.slug ? formatCycleLabel(data.cycle.slug) : undefined}
        isFallbackCycle={data?.cycle?.is_fallback_cycle}
        action={periodSelector}
      />

      <TabsPremium value={tab} onChange={setTab}>
        <TabPremium value="geral" label="Ranking Geral" icon={<TrendingUp className="w-4 h-4" />} badge={topGeneral.length} />
        <TabPremium value="tiers" label="Ranking por Rank" icon={<Shield className="w-4 h-4" />} badge={4} />
        <TabPremium value="player-stats" label="Ranking de Jogadores" icon={<Users className="w-4 h-4" />} />
        <TabPremium value="weekly-selection" label="Seleção da Semana" icon={<Award className="w-4 h-4" />} />
        <TabPremium value="evolucao" label="Minha Evolução" icon={<Trophy className="w-4 h-4" />} />
      </TabsPremium>

      {isRankingTab && rankingQuery.isLoading && <RankingSkeleton />}
      {isRankingTab && rankingQuery.isError && <RankingErrorState onRetry={() => rankingQuery.refetch()} />}
      {isRankingTab && !rankingQuery.isLoading && !rankingQuery.isError && data && data.total_players === 0 && (
        <RankingEmptyState />
      )}

      {/* ─── ABA GERAL = OVERVIEW ─── */}
      {hasData && tab === 'geral' && kpis && (
        <div className="space-y-5">
          {/* KPIs com tendência vs ciclo anterior */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <KpiTrendCard index={0} icon={<Users />} accent="brand" label="Jogadores ranqueados"
              value={kpis.current.total_players} delta={kpis.deltas?.total_players ?? null} />
            <KpiTrendCard index={1} icon={<BarChart3 />} accent="green" label="Partidas analisadas"
              value={kpis.current.total_matches} delta={kpis.deltas?.total_matches ?? null} />
            <KpiTrendCard index={2} icon={<Activity />} accent="brand" label="Score médio"
              value={kpis.current.avg_score.toFixed(2)} delta={kpis.deltas?.avg_score ?? null} />
            <KpiTrendCard index={3} icon={<Crown />} accent="gold" label="Maior pontuação"
              value={kpis.current.top_score.toFixed(2)} delta={kpis.deltas?.top_score ?? null} />
            <KpiTrendCard index={4} icon={<ShieldCheck />} accent="warning" label="Elegíveis p/ promoção"
              value={kpis.current.eligible} delta={kpis.deltas?.eligible ?? null} />
          </section>

          <InsightsPanel rows={topGeneral} comparison={data.comparison} />

          {/* Pódio + tabela */}
          <RankingPodium rows={topGeneral} />
          <RankingTable rows={topGeneral} />
        </div>
      )}

      {/* ─── ABA POR RANK ─── */}
      {hasData && tab === 'tiers' && (
        <div className="space-y-3">
          <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
            <h2 className="text-base font-bold text-text md:text-lg">Top 10 jogadores por rank</h2>
            <p className="text-xs text-muted2">Os 5 melhores elegíveis de cada rank ficam em zona de promoção.</p>
          </header>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TierRankingCard title="Bronze" tier="BRONZE" rows={data.tiers.bronze} />
            <TierRankingCard title="Prata" tier="SILVER" rows={data.tiers.prata} />
            <TierRankingCard title="Ouro" tier="GOLD" rows={data.tiers.ouro} />
            <TierRankingCard title="Platina" tier="PLATINUM" rows={data.tiers.platina} />
          </div>
        </div>
      )}

      {/* ─── ABA RANKING DE JOGADORES (stats cruas, top 10) ─── */}
      {tab === 'player-stats' && <PlayerStatsRankingSection />}

      {/* ─── ABA SELEÇÃO DA SEMANA ─── */}
      {tab === 'weekly-selection' && <WeeklySelectionSection embedded />}

      {/* ─── ABA MINHA EVOLUÇÃO ─── */}
      {tab === 'evolucao' && (
        <div className="space-y-4">
          {meQuery.isLoading && <RankingSkeleton />}
          {meQuery.isError && <RankingErrorState onRetry={() => meQuery.refetch()} />}
          {meQuery.data && (
            <>
              <MyRankingStatus me={meQuery.data} />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <MyEvolutionChart history={meQuery.data.history ?? []} />
                <RoadToPlatina me={meQuery.data} />
              </div>
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
              <p className="mt-1 text-xs text-muted2">Seus stats aparecem após o primeiro reporte oficial.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
