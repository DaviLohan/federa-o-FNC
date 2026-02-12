'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { statisticsAPI, championshipsAPI } from '@/lib/api';
import { Card, Badge, Select, Skeleton, PageHeader, DataTable, FilterBar, Table } from '@/components/shared/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp } from 'lucide-react';

export default function StatisticsPage() {
  const [selectedChampionship, setSelectedChampionship] = useState<string>('all');

  // Fetch championships for filter
  const { data: championshipsData } = useQuery({
    queryKey: ['championships'],
    queryFn: () => championshipsAPI.getAll(),
  });

  // Fetch player statistics
  const { data: playerStatsData, isLoading: playerStatsLoading } = useQuery({
    queryKey: ['player-statistics', selectedChampionship],
    queryFn: () => statisticsAPI.getPlayerStats(
      selectedChampionship !== 'all' ? { championship: selectedChampionship } : {}
    ),
  });

  // Fetch team statistics
  const { data: teamStatsData, isLoading: teamStatsLoading } = useQuery({
    queryKey: ['team-statistics', selectedChampionship],
    queryFn: () => statisticsAPI.getTeamStats(
      selectedChampionship !== 'all' ? { championship: selectedChampionship } : {}
    ),
  });

  const championships = championshipsData?.results || [];
  const playerStats = playerStatsData?.results || [];
  const teamStats = teamStatsData?.results || [];

  // Top scorers (sort by goals)
  const topScorers = [...playerStats].sort((a, b) => b.goals - a.goals).slice(0, 10);
  
  // Top assisters
  const topAssisters = [...playerStats].sort((a, b) => b.assists - a.assists).slice(0, 10);

  // Team leaderboard (sort by points)
  const teamLeaderboard = [...teamStats].sort((a, b) => b.points - a.points);
  
  // Prepare chart data for goals evolution (top 8 teams by goals scored)
  const chartData = useMemo(() => {
    return [...teamStats]
      .sort((a, b) => b.goals_scored - a.goals_scored)
      .slice(0, 8)
      .map(stat => ({
        name: stat.team.abbreviation || stat.team.name.substring(0, 3).toUpperCase(),
        gols: stat.goals_scored,
        jogos: stat.matches_played,
      }));
  }, [teamStats]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Estatísticas"
        subtitle="Rankings e desempenho de jogadores e times"
        icon={<TrendingUp className="w-8 h-8" />}
      />

      {/* Filter */}
      <FilterBar>
        <Select
          label="Filtrar por Campeonato"
          value={selectedChampionship}
          onChange={(e) => setSelectedChampionship(e.target.value)}
          options={[
            { value: 'all', label: 'Todos os Campeonatos' },
            ...championships.map(c => ({ value: c.id.toString(), label: c.name }))
          ]}
        />
      </FilterBar>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">⚽</div>
            <div className="text-3xl font-mono font-bold text-warning mb-1">
              {topScorers[0]?.goals || 0}
            </div>
            <div className="text-sm text-muted">Artilheiro</div>
            {topScorers[0] && (
              <div className="text-xs text-text mt-1 font-semibold">
                {topScorers[0].player.player_name}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">🎯</div>
            <div className="text-3xl font-mono font-bold text-gold mb-1">
              {topAssisters[0]?.assists || 0}
            </div>
            <div className="text-sm text-muted">Assistências</div>
            {topAssisters[0] && (
              <div className="text-xs text-text mt-1 font-semibold">
                {topAssisters[0].player.player_name}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">🏆</div>
            <div className="text-3xl font-mono font-bold text-gold mb-1">
              {teamLeaderboard[0]?.points || 0}
            </div>
            <div className="text-sm text-muted">Pontos</div>
            {teamLeaderboard[0] && (
              <div className="text-xs text-text mt-1 font-semibold">
                {teamLeaderboard[0].team.name}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="text-3xl mb-2">📈</div>
            <div className="text-3xl font-mono font-bold text-green mb-1">
              {teamLeaderboard[0]?.win_rate.toFixed(0) || 0}%
            </div>
            <div className="text-sm text-muted">Taxa de Vitória</div>
            {teamLeaderboard[0] && (
              <div className="text-xs text-text mt-1 font-semibold">
                {teamLeaderboard[0].team.name}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Goals Chart */}
      {teamStatsLoading ? (
        <Card title="📊 Gols por Time">
          <Skeleton className="h-80 w-full" />
        </Card>
      ) : chartData.length > 0 && (
        <Card title="📊 Gols por Time" className="reveal-fade">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <defs>
                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14CCDD" stopOpacity={0.8}/>
                  <stop offset="50%" stopColor="#1B975D" stopOpacity={0.6}/>
                  <stop offset="100%" stopColor="#A8D724" stopOpacity={0.4}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167, 177, 194, 0.1)" />
              <XAxis 
                dataKey="name" 
                stroke="rgba(167, 177, 194, 0.5)" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="rgba(167, 177, 194, 0.5)" 
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgb(11, 15, 20)',
                  border: '1px solid rgb(27, 34, 48)',
                  borderRadius: '12px',
                  color: '#EAF0FF'
                }}
                labelStyle={{ color: '#14CCDD' }}
              />
              <Bar dataKey="gols" fill="url(#colorGradient)" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Top Scorers */}
      <Card title="🥇 Artilharia" className="reveal-fade-delay-1">
        {playerStatsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : topScorers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : (
          <Table
            headers={['#', 'Jogador', 'Time', 'Gols', 'Assists', 'Jogos', 'Média']}
            data={topScorers}
            renderRow={(stat, index) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning border border-warning/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-semibold text-text">{stat.player.player_name}</div>
                    <div className="text-xs text-muted2">{stat.player.primary_position_display}</div>
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
                  <span className="text-text font-mono">{stat.goals_per_match.toFixed(2)}</span>
                </td>
              </>
            )}
          />
        )}
      </Card>

      {/* Top Assisters */}
      <Card title="🎯 Assistências">
        {playerStatsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : topAssisters.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : (
          <Table
            headers={['#', 'Jogador', 'Time', 'Assists', 'Gols', 'Jogos', 'Média']}
            data={topAssisters}
            renderRow={(stat, index) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gold/10 text-gold border border-gold/20 font-bold">
                    {index + 1}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-semibold text-text">{stat.player.player_name}</div>
                    <div className="text-xs text-muted2">{stat.player.primary_position_display}</div>
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
                  <span className="text-text font-mono">{stat.assists_per_match.toFixed(2)}</span>
                </td>
              </>
            )}
          />
        )}
      </Card>

      {/* Team Leaderboard */}
      <Card title="🏆 Classificação dos Times">
        {teamStatsLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : teamLeaderboard.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-muted">Nenhuma estatística disponível</p>
          </div>
        ) : (
          <Table
            headers={['#', 'Time', 'PTS', 'J', 'V', 'E', 'D', 'GP', 'GC', 'SG', '%']}
            data={teamLeaderboard}
            renderRow={(stat, index) => (
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
                    <div className="text-xs text-muted">{stat.championship.name}</div>
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
                  <span className="text-text font-mono">{stat.win_rate.toFixed(0)}%</span>
                </td>
              </>
            )}
          />
        )}
      </Card>
    </div>
  );
}
