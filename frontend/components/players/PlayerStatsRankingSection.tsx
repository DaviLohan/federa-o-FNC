'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import { statisticsAPI } from '@/lib/api';
import type { PlayerLeaderboardSort, PlayerPositionGroup } from '@/types';
import { Select, TabsPremium, TabPremium } from '@/components/shared/ui';
import { PlayerLeaderboardTable } from '@/components/players/PlayerLeaderboardTable';
import { RankingSkeleton } from '@/components/statistics/RankingSkeleton';
import { RankingErrorState } from '@/components/statistics/RankingErrorState';
import { RankingEmptyState } from '@/components/statistics/RankingEmptyState';

const TOP_LIMIT = 10;

const POSITION_TABS: { value: 'GERAL' | PlayerPositionGroup; label: string }[] = [
  { value: 'GERAL', label: 'Geral' },
  { value: 'GK', label: 'Goleiros' },
  { value: 'DEF', label: 'Defesa' },
  { value: 'MID', label: 'Meio' },
  { value: 'ATT', label: 'Ataque' },
];

const SORT_OPTIONS: { value: PlayerLeaderboardSort; label: string }[] = [
  { value: 'rating', label: 'Nota média' },
  { value: 'goals', label: 'Gols' },
  { value: 'assists', label: 'Assistências' },
  { value: 'wins', label: 'Vitórias' },
  { value: 'win_rate', label: 'Aproveitamento' },
  { value: 'games', label: 'Jogos' },
  { value: 'cards', label: 'Cartões' },
  { value: 'clean_sheets', label: 'Clean Sheets' },
];

export function PlayerStatsRankingSection() {
  const [tab, setTab] = useState<'GERAL' | PlayerPositionGroup>('GERAL');
  const [sort, setSort] = useState<PlayerLeaderboardSort>('rating');
  const [championshipId, setChampionshipId] = useState('');
  const [teamId, setTeamId] = useState('');

  const positionGroup = tab === 'GERAL' ? undefined : tab;

  const query = useQuery({
    queryKey: ['player-leaderboard-embedded', sort, championshipId, teamId, positionGroup],
    queryFn: () =>
      statisticsAPI.getPlayerLeaderboard({
        sort,
        championship_id: championshipId ? Number(championshipId) : undefined,
        team_id: teamId ? Number(teamId) : undefined,
        position_group: positionGroup,
        limit: TOP_LIMIT,
      }),
    refetchOnWindowFocus: false,
  });

  const data = query.data;

  const championshipOptions = useMemo(
    () => [
      { value: '', label: 'Todos os campeonatos' },
      ...(data?.filters.championships ?? []).map((c) => ({ value: String(c.id), label: c.name ?? `#${c.id}` })),
    ],
    [data],
  );
  const teamOptions = useMemo(
    () => [
      { value: '', label: 'Todas as equipes' },
      ...(data?.filters.teams ?? []).map((t) => ({ value: String(t.id), label: t.name })),
    ],
    [data],
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <h2 className="text-base font-bold text-text md:text-lg">Top 10 jogadores por estatísticas</h2>
        <p className="text-xs text-muted2">Ranking individual com base nas estatísticas reais das partidas.</p>
      </header>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select label="Campeonato" value={championshipId} onChange={(e) => setChampionshipId(e.target.value)} options={championshipOptions} />
        <Select label="Equipe" value={teamId} onChange={(e) => setTeamId(e.target.value)} options={teamOptions} />
        <Select label="Ordenar por" value={sort} onChange={(e) => setSort(e.target.value as PlayerLeaderboardSort)} options={SORT_OPTIONS} />
      </div>

      {/* Abas por posição */}
      <TabsPremium value={tab} onChange={(v) => setTab(v as 'GERAL' | PlayerPositionGroup)}>
        {POSITION_TABS.map((t) => (
          <TabPremium key={t.value} value={t.value} label={t.label} />
        ))}
      </TabsPremium>

      <p className="flex items-start gap-2 text-xs text-muted2">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        A nota média e métricas avançadas consideram apenas partidas reportadas via integração EA.
      </p>

      {query.isLoading ? (
        <RankingSkeleton />
      ) : query.isError ? (
        <RankingErrorState onRetry={() => query.refetch()} />
      ) : !data || data.results.length === 0 ? (
        <RankingEmptyState />
      ) : (
        <PlayerLeaderboardTable rows={data.results} sort={sort} onSortChange={setSort} />
      )}
    </div>
  );
}
