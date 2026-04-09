'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statisticsAPI, championshipsAPI } from '@/lib/api';
import {
  Card,
  Select,
  Skeleton,
  PageHeader,
  FilterBar,
  Table,
  EmptyState,
  TabsPremium,
  TabPremium,
} from '@/components/shared/ui';
import { StatKpiCard } from '@/components/statistics/StatKpiCard';
import { StatRankRow } from '@/components/statistics/StatRankRow';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Trophy,
  Percent,
  Flame,
  Crosshair,
  BarChart2,
  Medal,
  Users,
} from 'lucide-react';

// ─── Tooltip personalizado para o gráfico ─────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-panel border border-stroke rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="text-brand font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="text-text font-mono">
          {p.name}: <span className="text-gold font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [selectedChampionship, setSelectedChampionship] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('jogadores');

  const useAdvanced = selectedChampionship !== 'all';
  const championshipId = useAdvanced ? Number(selectedChampionship) : undefined;

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: championshipsData } = useQuery({
    queryKey: ['championships'],
    queryFn: () => championshipsAPI.getAll(),
  });

  const { data: topScorersData, isLoading: scorersLoading } = useQuery({
    queryKey: ['top-scorers-advanced', championshipId],
    queryFn: () => statisticsAPI.getTopScorersAdvanced(championshipId, 10),
    enabled: useAdvanced,
  });

  const { data: topAssistersData, isLoading: assistersLoading } = useQuery({
    queryKey: ['top-assisters', championshipId],
    queryFn: () => statisticsAPI.getTopAssisters(championshipId, 10),
    enabled: useAdvanced,
  });

  const { data: rankingsData, isLoading: rankingsLoading } = useQuery({
    queryKey: ['rankings', championshipId],
    queryFn: () => statisticsAPI.getRankings(championshipId!),
    enabled: useAdvanced,
  });

  const { data: overviewData } = useQuery({
    queryKey: ['championship-overview', championshipId],
    queryFn: () => statisticsAPI.getChampionshipOverview(championshipId!),
    enabled: useAdvanced,
  });

  const { data: playerStatsData, isLoading: playerStatsLoading } = useQuery({
    queryKey: ['player-statistics-legacy'],
    queryFn: () => statisticsAPI.getPlayerStats({}),
    enabled: !useAdvanced,
  });

  const { data: teamStatsData, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['team-statistics-legacy'],
    queryFn: () => statisticsAPI.getTeamStats({}),
    enabled: !useAdvanced,
  });

  // ── Dados normalizados ────────────────────────────────────────────────────

  const championships = championshipsData?.results || [];

  const topScorers = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (topScorersData as any)?.results ?? topScorersData ?? [];
      return raw;
    }
    const legacy: any[] = playerStatsData?.results || [];
    return [...legacy].sort((a, b) => b.goals - a.goals).slice(0, 10);
  }, [useAdvanced, topScorersData, playerStatsData]);

  const topAssisters = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (topAssistersData as any)?.results ?? topAssistersData ?? [];
      return raw;
    }
    const legacy: any[] = playerStatsData?.results || [];
    return [...legacy].sort((a, b) => b.assists - a.assists).slice(0, 10);
  }, [useAdvanced, topAssistersData, playerStatsData]);

  const teamLeaderboard = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (rankingsData as any)?.results ?? rankingsData ?? [];
      return raw;
    }
    const legacy: any[] = teamStatsData?.results || [];
    return [...legacy].sort((a, b) => b.points - a.points);
  }, [useAdvanced, rankingsData, teamStatsData]);

  const overview: any = overviewData ?? null;

  const chartData = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (rankingsData as any)?.results ?? rankingsData ?? [];
      return [...raw]
        .sort((a, b) => b.goals.scored - a.goals.scored)
        .slice(0, 8)
        .map((r) => ({
          name: (r.team_name as string).substring(0, 3).toUpperCase(),
          Gols: r.goals.scored,
          Jogos: r.matches.total,
        }));
    }
    const legacy: any[] = teamStatsData?.results || [];
    return [...legacy]
      .sort((a, b) => b.goals_scored - a.goals_scored)
      .slice(0, 8)
      .map((s) => ({
        name: s.team.abbreviation || (s.team.name as string).substring(0, 3).toUpperCase(),
        Gols: s.goals_scored,
        Jogos: s.matches_played,
      }));
  }, [useAdvanced, rankingsData, teamStatsData]);

  // ── Loading states ────────────────────────────────────────────────────────

  const scorersIsLoading = useAdvanced ? scorersLoading : playerStatsLoading;
  const assistersIsLoading = useAdvanced ? assistersLoading : playerStatsLoading;
  const leaderboardIsLoading = useAdvanced ? rankingsLoading : teamStatsLoading;
  const chartIsLoading = useAdvanced ? rankingsLoading : teamStatsLoading;

  // ── KPI helpers ───────────────────────────────────────────────────────────

  function getTopScorerGoals() {
    if (useAdvanced) return topScorers[0]?.goals?.total ?? 0;
    return topScorers[0]?.goals ?? 0;
  }
  function getTopScorerName() {
    if (useAdvanced) return topScorers[0]?.player_name ?? null;
    return topScorers[0]?.player?.player_name ?? null;
  }
  function getTopAssisterAssists() {
    return topAssisters[0]?.assists ?? 0;
  }
  function getTopAssisterName() {
    if (useAdvanced) return topAssisters[0]?.player_name ?? null;
    return topAssisters[0]?.player?.player_name ?? null;
  }
  function getLeaderPoints() {
    return teamLeaderboard[0]?.points ?? 0;
  }
  function getLeaderName() {
    if (useAdvanced) return teamLeaderboard[0]?.team_name ?? null;
    return teamLeaderboard[0]?.team?.name ?? null;
  }
  function getLeaderWinRate() {
    if (useAdvanced) {
      const m = teamLeaderboard[0]?.matches;
      if (!m || m.total === 0) return 0;
      return Math.round((m.wins / m.total) * 100);
    }
    return teamLeaderboard[0]?.win_rate?.toFixed(0) ?? 0;
  }

  const selectedChampionshipName =
    championships.find((c: any) => c.id.toString() === selectedChampionship)?.name ?? null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Estatísticas"
        subtitle={
          selectedChampionshipName
            ? `Dados de ${selectedChampionshipName}`
            : 'Rankings e desempenho de jogadores e times'
        }
        icon={<TrendingUp className="w-8 h-8" />}
      />

      {/* Filtro */}
      <FilterBar
        onReset={() => setSelectedChampionship('all')}
      >
        <div className="w-full sm:w-64">
          <Select
            label=""
            value={selectedChampionship}
            onChange={(e) => setSelectedChampionship(e.target.value)}
            options={[
              { value: 'all', label: 'Todos os Campeonatos' },
              ...championships.map((c: any) => ({
                value: c.id.toString(),
                label: c.name,
              })),
            ]}
          />
        </div>
      </FilterBar>

      {/* KPI Cards */}
      <div
        className={`grid gap-3 grid-cols-1 min-[360px]:grid-cols-2 ${
          useAdvanced && overview ? 'md:grid-cols-3 lg:grid-cols-5' : 'md:grid-cols-2 lg:grid-cols-4'
        }`}
      >
        <StatKpiCard
          icon={<Target className="w-5 h-5" />}
          value={getTopScorerGoals()}
          label="Artilheiro"
          sublabel={getTopScorerName()}
          accent="warning"
        />
        <StatKpiCard
          icon={<Crosshair className="w-5 h-5" />}
          value={getTopAssisterAssists()}
          label="Assistências"
          sublabel={getTopAssisterName()}
          accent="gold"
        />
        <StatKpiCard
          icon={<Trophy className="w-5 h-5" />}
          value={getLeaderPoints()}
          label="Pontos — Líder"
          sublabel={getLeaderName()}
          accent="gold"
        />
        <StatKpiCard
          icon={<Percent className="w-5 h-5" />}
          value={`${getLeaderWinRate()}%`}
          label="Taxa de Vitória"
          sublabel={getLeaderName()}
          accent="green"
        />
        {useAdvanced && overview && (
          <StatKpiCard
            icon={<Flame className="w-5 h-5" />}
            value={overview.goals?.total ?? 0}
            label="Gols no Campeonato"
            sublabel={`${overview.goals?.average_per_match?.toFixed(1) ?? '0.0'} por partida`}
            accent="brand"
          />
        )}
      </div>

      {/* Abas: Jogadores / Times */}
      <div className="space-y-4">
        <TabsPremium value={activeTab} onChange={setActiveTab}>
          <TabPremium
            value="jogadores"
            label="Jogadores"
            icon={<Medal className="w-4 h-4" />}
            badge={topScorers.length}
          />
          <TabPremium
            value="times"
            label="Times"
            icon={<Users className="w-4 h-4" />}
            badge={teamLeaderboard.length}
          />
        </TabsPremium>

        {/* ── Aba: Jogadores ─────────────────────────────────────────── */}
        {activeTab === 'jogadores' && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Artilharia */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                  <Target className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base leading-none">Artilharia</h3>
                  <p className="text-xs text-muted2 mt-0.5">Top marcadores</p>
                </div>
              </div>

              {scorersIsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : topScorers.length === 0 ? (
                <EmptyState
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto">
                      <Target className="w-6 h-6 text-warning" />
                    </div>
                  }
                  title="Nenhum dado"
                  description="Sem estatísticas de gols disponíveis."
                />
              ) : (
                <div>
                  {topScorers.map((stat: any, idx: number) => {
                    const goals = useAdvanced
                      ? (stat.goals?.total ?? stat.goals ?? 0)
                      : (stat.goals ?? 0);
                    const name = useAdvanced
                      ? stat.player_name
                      : stat.player?.player_name;
                    const team = useAdvanced ? stat.team_name : stat.team?.name;
                    const assists = stat.assists ?? 0;
                    const matches = stat.matches_played ?? 0;
                    return (
                      <StatRankRow
                        key={idx}
                        position={idx + 1}
                        name={name}
                        team={team}
                        primaryValue={goals}
                        primaryLabel="gols"
                        accent="warning"
                        secondaryStats={[
                          { label: 'Ast', value: assists },
                          { label: 'Jogos', value: matches },
                        ]}
                      />
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Assistências */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Crosshair className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base leading-none">Assistências</h3>
                  <p className="text-xs text-muted2 mt-0.5">Top garçons</p>
                </div>
              </div>

              {assistersIsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-lg" />
                  ))}
                </div>
              ) : topAssisters.length === 0 ? (
                <EmptyState
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
                      <Crosshair className="w-6 h-6 text-gold" />
                    </div>
                  }
                  title="Nenhum dado"
                  description="Sem estatísticas de assistências disponíveis."
                />
              ) : (
                <div>
                  {topAssisters.map((stat: any, idx: number) => {
                    const assists = stat.assists ?? 0;
                    const goals = useAdvanced
                      ? (stat.goals?.total ?? stat.goals ?? 0)
                      : (stat.goals ?? 0);
                    const name = useAdvanced
                      ? stat.player_name
                      : stat.player?.player_name;
                    const team = useAdvanced ? stat.team_name : stat.team?.name;
                    const matches = stat.matches_played ?? 0;
                    return (
                      <StatRankRow
                        key={idx}
                        position={idx + 1}
                        name={name}
                        team={team}
                        primaryValue={assists}
                        primaryLabel="assist."
                        accent="gold"
                        secondaryStats={[
                          { label: 'Gols', value: goals },
                          { label: 'Jogos', value: matches },
                        ]}
                      />
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Aba: Times ──────────────────────────────────────────────── */}
        {activeTab === 'times' && (
          <div className="space-y-4">
            {/* Gráfico Gols por Time */}
            {chartIsLoading ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-brand" />
                  </div>
                  <h3 className="font-bold text-text text-base">Gols por Time</h3>
                </div>
                <Skeleton className="h-64 w-full rounded-xl" />
              </Card>
            ) : chartData.length > 0 ? (
              <Card>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center">
                    <BarChart2 className="w-4 h-4 text-brand" />
                  </div>
                  <div>
                    <h3 className="font-bold text-text text-base leading-none">Gols por Time</h3>
                    <p className="text-xs text-muted2 mt-0.5">Top 8 times em gols marcados</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} barSize={28}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand, #14CCDD)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="var(--color-gold, #D4AF37)" stopOpacity={0.5} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(167, 177, 194, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="name"
                      stroke="rgba(167, 177, 194, 0.4)"
                      tick={{ fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="rgba(167, 177, 194, 0.4)"
                      tick={{ fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={28}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="Gols" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            ) : null}

            {/* Classificação dos Times */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-gold" />
                </div>
                <div>
                  <h3 className="font-bold text-text text-base leading-none">Classificação</h3>
                  <p className="text-xs text-muted2 mt-0.5">Ranking de times por pontos</p>
                </div>
              </div>

              {leaderboardIsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-12 w-full rounded-lg" />
                  ))}
                </div>
              ) : teamLeaderboard.length === 0 ? (
                <EmptyState
                  icon={
                    <div className="w-12 h-12 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mx-auto">
                      <Trophy className="w-6 h-6 text-gold" />
                    </div>
                  }
                  title="Nenhum dado"
                  description="Sem classificação disponível."
                />
              ) : useAdvanced ? (
                <Table
                  headers={['#', 'Time', 'PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG']}
                  data={teamLeaderboard}
                  renderRow={(stat: any, index: number) => (
                    <>
                      <td className="px-4 py-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            index < 3
                              ? 'bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30'
                              : 'bg-panel2 border border-stroke'
                          }`}
                        >
                          <span className={index < 3 ? 'gradient-text' : 'text-muted2'}>
                            {stat.position ?? index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-text">{stat.team_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-warning font-mono font-bold text-lg">{stat.points}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.matches?.total}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green font-mono">{stat.matches?.wins}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted2 font-mono">{stat.matches?.draws}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-error font-mono">{stat.matches?.losses}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.goals?.scored}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.goals?.conceded}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono ${
                            (stat.goals?.difference ?? 0) >= 0 ? 'text-green' : 'text-error'
                          }`}
                        >
                          {(stat.goals?.difference ?? 0) >= 0 ? '+' : ''}
                          {stat.goals?.difference}
                        </span>
                      </td>
                    </>
                  )}
                />
              ) : (
                <Table
                  headers={['#', 'Time', 'PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', '%']}
                  data={teamLeaderboard}
                  renderRow={(stat: any, index: number) => (
                    <>
                      <td className="px-4 py-3">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                            index < 3
                              ? 'bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30'
                              : 'bg-panel2 border border-stroke'
                          }`}
                        >
                          <span className={index < 3 ? 'gradient-text' : 'text-muted2'}>
                            {index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-semibold text-text">{stat.team.name}</div>
                          <div className="text-xs text-muted2">{stat.championship?.name}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-warning font-mono font-bold text-lg">{stat.points}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.matches_played}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-green font-mono">{stat.matches_won}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted2 font-mono">{stat.matches_drawn}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-error font-mono">{stat.matches_lost}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.goals_scored}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.goals_conceded}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`font-mono ${
                            stat.goal_difference >= 0 ? 'text-green' : 'text-error'
                          }`}
                        >
                          {stat.goal_difference >= 0 ? '+' : ''}
                          {stat.goal_difference}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-text font-mono">{stat.win_rate?.toFixed(0)}%</span>
                      </td>
                    </>
                  )}
                />
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
