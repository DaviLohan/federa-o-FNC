'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statisticsAPI, championshipsAPI } from '@/lib/api';
import { Card, Select, Skeleton, PageHeader, FilterBar, Table } from '@/components/shared/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function StatisticsPage() {
  const [selectedChampionship, setSelectedChampionship] = useState<string>('all');

  const useAdvanced = selectedChampionship !== 'all';
  const championshipId = useAdvanced ? Number(selectedChampionship) : undefined;

  // Championships para o filtro
  const { data: championshipsData } = useQuery({
    queryKey: ['championships'],
    queryFn: () => championshipsAPI.getAll(),
  });

  // ── modo avançado (campeonato específico) ────────────────────────────────

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

  // ── modo legado (todos os campeonatos) ───────────────────────────────────

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

  // ── dados normalizados ───────────────────────────────────────────────────

  const championships = championshipsData?.results || [];

  // Artilheiros
  const topScorers = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (topScorersData as any)?.results ?? topScorersData ?? [];
      return raw;
    }
    const legacy: any[] = playerStatsData?.results || [];
    return [...legacy].sort((a, b) => b.goals - a.goals).slice(0, 10);
  }, [useAdvanced, topScorersData, playerStatsData]);

  // Assistências
  const topAssisters = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (topAssistersData as any)?.results ?? topAssistersData ?? [];
      return raw;
    }
    const legacy: any[] = playerStatsData?.results || [];
    return [...legacy].sort((a, b) => b.assists - a.assists).slice(0, 10);
  }, [useAdvanced, topAssistersData, playerStatsData]);

  // Classificação
  const teamLeaderboard = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (rankingsData as any)?.results ?? rankingsData ?? [];
      return raw;
    }
    const legacy: any[] = teamStatsData?.results || [];
    return [...legacy].sort((a, b) => b.points - a.points);
  }, [useAdvanced, rankingsData, teamStatsData]);

  // Overview (avançado)
  const overview: any = overviewData ?? null;

  // Dados do gráfico
  const chartData = useMemo(() => {
    if (useAdvanced) {
      const raw: any[] = (rankingsData as any)?.results ?? rankingsData ?? [];
      return [...raw]
        .sort((a, b) => b.goals.scored - a.goals.scored)
        .slice(0, 8)
        .map((r) => ({
          name: (r.team_name as string).substring(0, 3).toUpperCase(),
          gols: r.goals.scored,
          jogos: r.matches.total,
        }));
    }
    const legacy: any[] = teamStatsData?.results || [];
    return [...legacy]
      .sort((a, b) => b.goals_scored - a.goals_scored)
      .slice(0, 8)
      .map((s) => ({
        name: s.team.abbreviation || (s.team.name as string).substring(0, 3).toUpperCase(),
        gols: s.goals_scored,
        jogos: s.matches_played,
      }));
  }, [useAdvanced, rankingsData, teamStatsData]);

  // Estados de loading
  const scorersIsLoading = useAdvanced ? scorersLoading : playerStatsLoading;
  const assistersIsLoading = useAdvanced ? assistersLoading : playerStatsLoading;
  const leaderboardIsLoading = useAdvanced ? rankingsLoading : teamStatsLoading;
  const chartIsLoading = useAdvanced ? rankingsLoading : teamStatsLoading;

  // KPI helpers
  function getTopScorerGoals() {
    if (useAdvanced) return topScorers[0]?.goals?.total ?? 0;
    return topScorers[0]?.goals ?? 0;
  }
  function getTopScorerName() {
    if (useAdvanced) return topScorers[0]?.player_name ?? null;
    return topScorers[0]?.player?.player_name ?? null;
  }
  function getTopAssisterAssists() {
    if (useAdvanced) return topAssisters[0]?.assists ?? 0;
    return topAssisters[0]?.assists ?? 0;
  }
  function getTopAssisterName() {
    if (useAdvanced) return topAssisters[0]?.player_name ?? null;
    return topAssisters[0]?.player?.player_name ?? null;
  }
  function getLeaderPoints() {
    if (useAdvanced) return teamLeaderboard[0]?.points ?? 0;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Estatísticas"
        subtitle="Rankings e desempenho de jogadores e times"
        icon={<TrendingUp className="w-8 h-8" />}
      />

      {/* Filtro */}
      <FilterBar>
        <Select
          label="Filtrar por Campeonato"
          value={selectedChampionship}
          onChange={(e) => setSelectedChampionship(e.target.value)}
          options={[
            { value: 'all', label: 'Todos os Campeonatos' },
            ...championships.map((c: any) => ({ value: c.id.toString(), label: c.name })),
          ]}
        />
      </FilterBar>

      {/* KPI Cards */}
      <div className={`grid gap-4 ${useAdvanced ? 'grid-cols-2 lg:grid-cols-5' : 'grid-cols-2 lg:grid-cols-4'}`}>
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">⚽</div>
            <div className="text-3xl font-mono font-bold text-warning mb-1">{getTopScorerGoals()}</div>
            <div className="text-sm text-muted">Artilheiro</div>
            {getTopScorerName() && (
              <div className="text-xs text-text mt-1 font-semibold">{getTopScorerName()}</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-mono font-bold text-gold mb-1">{getTopAssisterAssists()}</div>
            <div className="text-sm text-muted">Assistências</div>
            {getTopAssisterName() && (
              <div className="text-xs text-text mt-1 font-semibold">{getTopAssisterName()}</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-3xl font-mono font-bold text-gold mb-1">{getLeaderPoints()}</div>
            <div className="text-sm text-muted">Pontos</div>
            {getLeaderName() && (
              <div className="text-xs text-text mt-1 font-semibold">{getLeaderName()}</div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-3xl font-mono font-bold text-green mb-1">{getLeaderWinRate()}%</div>
            <div className="text-sm text-muted">Taxa de Vitória</div>
            {getLeaderName() && (
              <div className="text-xs text-text mt-1 font-semibold">{getLeaderName()}</div>
            )}
          </div>
        </Card>

        {useAdvanced && overview && (
          <Card>
            <div className="text-center">
              <div className="text-3xl mb-2">🔥</div>
              <div className="text-3xl font-mono font-bold text-warning mb-1">{overview.goals?.total ?? 0}</div>
              <div className="text-sm text-muted">Gols no Campeonato</div>
              <div className="text-xs text-muted mt-1">
                {overview.goals?.average_per_match?.toFixed(1) ?? '0.0'}/partida
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Gráfico Gols por Time */}
      {chartIsLoading ? (
        <Card title="📊 Gols por Time">
          <Skeleton className="h-80 w-full" />
        </Card>
      ) : chartData.length > 0 && (
        <Card title="📊 Gols por Time" className="reveal-fade">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14CCDD" stopOpacity={0.8} />
                  <stop offset="50%" stopColor="#1B975D" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#A8D724" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 177, 194, 0.1)" />
              <XAxis dataKey="name" stroke="rgba(167, 177, 194, 0.5)" style={{ fontSize: '12px' }} />
              <YAxis stroke="rgba(167, 177, 194, 0.5)" style={{ fontSize: '12px' }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgb(11, 15, 20)',
                  border: '1px solid rgb(27, 34, 48)',
                  borderRadius: '12px',
                  color: '#EAF0FF',
                }}
                labelStyle={{ color: '#14CCDD' }}
              />
              <Bar dataKey="gols" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Artilharia */}
      <Card title="🥇 Artilharia" className="reveal-fade-delay-1">
        {scorersIsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : topScorers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : useAdvanced ? (
          <Table
            headers={['#', 'Jogador', 'Time', 'Gols', 'Assistências', 'Jogos', 'Média']}
            data={topScorers}
            renderRow={(stat: any, index: number) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning border border-warning/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-text">{stat.player_name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text">{stat.team_name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-warning font-mono font-bold text-lg">{stat.goals?.total ?? stat.goals}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gold font-mono">{stat.assists}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted font-mono">{stat.matches_played}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text font-mono">
                    {stat.matches_played > 0
                      ? ((stat.goals?.total ?? stat.goals) / stat.matches_played).toFixed(2)
                      : '0.00'}
                  </span>
                </td>
              </>
            )}
          />
        ) : (
          <Table
            headers={['#', 'Jogador', 'Time', 'Gols', 'Assists', 'Jogos', 'Média']}
            data={topScorers}
            renderRow={(stat: any, index: number) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning border border-warning/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-semibold text-text">{stat.player.player_name}</div>
                    <div className="text-xs text-muted2">{stat.player.primary_position}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text">{stat.team.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-warning font-mono font-bold text-lg">{stat.goals}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gold font-mono">{stat.assists}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted font-mono">{stat.matches_played}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text font-mono">{stat.goals_per_match?.toFixed(2)}</span>
                </td>
              </>
            )}
          />
        )}
      </Card>

      {/* Assistências */}
      <Card title="🎯 Assistências">
        {assistersIsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : topAssisters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : useAdvanced ? (
          <Table
            headers={['#', 'Jogador', 'Time', 'Assistências', 'Gols', 'Jogos', 'Média']}
            data={topAssisters}
            renderRow={(stat: any, index: number) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold border border-gold/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-text">{stat.player_name}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text">{stat.team_name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gold font-mono font-bold text-lg">{stat.assists}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-warning font-mono">{stat.goals?.total ?? stat.goals ?? 0}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted font-mono">{stat.matches_played}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text font-mono">
                    {stat.matches_played > 0
                      ? (stat.assists / stat.matches_played).toFixed(2)
                      : '0.00'}
                  </span>
                </td>
              </>
            )}
          />
        ) : (
          <Table
            headers={['#', 'Jogador', 'Time', 'Assists', 'Gols', 'Jogos', 'Média']}
            data={topAssisters}
            renderRow={(stat: any, index: number) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold border border-gold/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-semibold text-text">{stat.player.player_name}</div>
                    <div className="text-xs text-muted2">{stat.player.primary_position}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text">{stat.team.name}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-gold font-mono font-bold text-lg">{stat.assists}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-warning font-mono">{stat.goals}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-muted font-mono">{stat.matches_played}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-text font-mono">{stat.assists_per_match?.toFixed(2)}</span>
                </td>
              </>
            )}
          />
        )}
      </Card>

      {/* Classificação dos Times */}
      <Card title="🏆 Classificação dos Times">
        {leaderboardIsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : teamLeaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : useAdvanced ? (
          <Table
            headers={['#', 'Time', 'PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', 'Ded.']}
            data={teamLeaderboard}
            renderRow={(stat: any, index: number) => (
              <>
                <td className="px-4 py-3">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                    index < 3 ? 'bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30' : 'bg-surface2'
                  }`}>
                    <span className={index < 3 ? 'gradient-text' : 'text-muted'}>{stat.position ?? index + 1}</span>
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
                  <span className="text-muted font-mono">{stat.matches?.draws}</span>
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
                  <span className={`font-mono ${(stat.goals?.difference ?? 0) >= 0 ? 'text-green' : 'text-error'}`}>
                    {(stat.goals?.difference ?? 0) >= 0 ? '+' : ''}{stat.goals?.difference}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-xs ${(stat.penalty_deductions ?? 0) > 0 ? 'text-error' : 'text-muted'}`}>
                    {(stat.penalty_deductions ?? 0) > 0 ? `-${stat.penalty_deductions}` : '—'}
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
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                    index < 3 ? 'bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20 border border-gold/30' : 'bg-surface2'
                  }`}>
                    <span className={index < 3 ? 'gradient-text' : 'text-muted'}>{index + 1}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-semibold text-text">{stat.team.name}</div>
                    <div className="text-xs text-muted">{stat.championship?.name}</div>
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
                  <span className="text-muted font-mono">{stat.matches_drawn}</span>
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
                  <span className={`font-mono ${stat.goal_difference >= 0 ? 'text-green' : 'text-error'}`}>
                    {stat.goal_difference >= 0 ? '+' : ''}{stat.goal_difference}
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
  );
}
