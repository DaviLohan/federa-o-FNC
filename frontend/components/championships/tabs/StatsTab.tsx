'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Skeleton, Tabs, Tab } from '@/components/shared/ui';
import { statisticsAPI } from '@/lib/api';
import { Trophy, Target, Users, Award } from 'lucide-react';

interface StatsTabProps {
  championshipId: number;
}

export function StatsTab({ championshipId }: StatsTabProps) {
  const [activeTab, setActiveTab] = useState('scorers');

  // Fetch player statistics
  const { data: playerStatsData, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['player-statistics', championshipId],
    queryFn: () => statisticsAPI.getPlayerStats({ championship: championshipId }),
  });

  // Fetch team statistics
  const { data: teamStatsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['team-statistics', championshipId],
    queryFn: () => statisticsAPI.getTeamStats({ championship: championshipId }),
  });

  const playerStats = playerStatsData?.results || [];
  const teamStats = teamStatsData?.results || [];

  const topScorers = [...playerStats].sort((a, b) => b.goals - a.goals).slice(0, 10);
  const topAssisters = [...playerStats].sort((a, b) => b.assists - a.assists).slice(0, 10);
  const bestTeams = [...teamStats].sort((a, b) => b.win_rate - a.win_rate).slice(0, 10);

  if (isLoadingPlayers || isLoadingTeams) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (playerStats.length === 0 && teamStats.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Estatísticas ainda não disponíveis"
        description="As estatísticas serão exibidas assim que as partidas começarem."
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-stroke">
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tab value="scorers" label="Artilheiros" icon={<Trophy className="w-4 h-4" />} />
          <Tab value="assisters" label="Assistências" icon={<Target className="w-4 h-4" />} />
          <Tab value="teams" label="Times" icon={<Users className="w-4 h-4" />} />
        </Tabs>
      </div>

      {/* Top Scorers */}
      {activeTab === 'scorers' && (
        <div>
          {topScorers.length === 0 ? (
            <EmptyState
              icon="⚽"
              title="Nenhum gol marcado ainda"
              description="Os artilheiros aparecerão aqui assim que os gols começarem a ser marcados."
            />
          ) : (
            <>
              {/* Top 3 Podium */}
              {topScorers.length >= 3 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                  {/* 2nd Place */}
                  <Card className="p-6 bg-gradient-to-br from-gray-400/20 to-gray-500/20 border-gray-400/30 mt-8">
                    <div className="text-center">
                      <div className="text-5xl mb-3">🥈</div>
                      {topScorers[1].player.avatar && (
                        <img
                          src={topScorers[1].player.avatar}
                          alt={topScorers[1].player.player_name}
                          className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-gray-400"
                        />
                      )}
                      <h3 className="font-bold text-text mb-1 truncate">
                        {topScorers[1].player.player_name}
                      </h3>
                      <p className="text-sm text-muted2 mb-3">{topScorers[1].team.name}</p>
                      <div className="text-3xl font-bold text-text">{topScorers[1].goals}</div>
                      <p className="text-xs text-muted2">gols</p>
                    </div>
                  </Card>

                  {/* 1st Place */}
                  <Card className="p-6 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-yellow-500/30">
                    <div className="text-center">
                      <div className="text-6xl mb-3">🥇</div>
                      {topScorers[0].player.avatar && (
                        <img
                          src={topScorers[0].player.avatar}
                          alt={topScorers[0].player.player_name}
                          className="w-24 h-24 rounded-full mx-auto mb-3 border-4 border-yellow-500"
                        />
                      )}
                      <h3 className="font-bold text-text text-lg mb-1 truncate">
                        {topScorers[0].player.player_name}
                      </h3>
                      <p className="text-sm text-muted2 mb-3">{topScorers[0].team.name}</p>
                      <div className="text-4xl font-bold text-text">{topScorers[0].goals}</div>
                      <p className="text-xs text-muted2">gols</p>
                    </div>
                  </Card>

                  {/* 3rd Place */}
                  <Card className="p-6 bg-gradient-to-br from-orange-400/20 to-orange-600/20 border-orange-500/30 mt-8">
                    <div className="text-center">
                      <div className="text-5xl mb-3">🥉</div>
                      {topScorers[2].player.avatar && (
                        <img
                          src={topScorers[2].player.avatar}
                          alt={topScorers[2].player.player_name}
                          className="w-20 h-20 rounded-full mx-auto mb-3 border-4 border-orange-500"
                        />
                      )}
                      <h3 className="font-bold text-text mb-1 truncate">
                        {topScorers[2].player.player_name}
                      </h3>
                      <p className="text-sm text-muted2 mb-3">{topScorers[2].team.name}</p>
                      <div className="text-3xl font-bold text-text">{topScorers[2].goals}</div>
                      <p className="text-xs text-muted2">gols</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Full List */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-stroke">
                        <th className="text-left py-4 px-4 text-sm font-semibold text-muted2 w-16">Pos</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Jogador</th>
                        <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Time</th>
                        <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Gols</th>
                        <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Jogos</th>
                        <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topScorers.map((stat, index) => (
                        <tr key={stat.id} className="border-b border-stroke hover:bg-panel2 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-bold text-text">{index + 1}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              {stat.player.avatar && (
                                <img
                                  src={stat.player.avatar}
                                  alt={stat.player.player_name}
                                  className="w-10 h-10 rounded-full"
                                />
                              )}
                              <div>
                                <p className="font-semibold text-text">{stat.player.player_name}</p>
                                <p className="text-xs text-muted2">{stat.player.primary_position}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-muted">{stat.team.name}</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="font-bold text-text text-lg">{stat.goals}</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="text-muted">{stat.matches_played}</span>
                          </td>
                          <td className="py-4 px-3 text-center">
                            <span className="text-success font-semibold">{stat.goals_per_match.toFixed(2)}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Top Assisters */}
      {activeTab === 'assisters' && (
        <div>
          {topAssisters.length === 0 ? (
            <EmptyState
              icon="🎯"
              title="Nenhuma assistência registrada"
              description="As assistências aparecerão aqui assim que forem registradas."
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-muted2 w-16">Pos</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Jogador</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Time</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Assist.</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Gols</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Contrib.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topAssisters.map((stat, index) => (
                      <tr key={stat.id} className="border-b border-stroke hover:bg-panel2 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-text">{index + 1}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {stat.player.avatar && (
                              <img
                                src={stat.player.avatar}
                                alt={stat.player.player_name}
                                className="w-10 h-10 rounded-full"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-text">{stat.player.player_name}</p>
                              <p className="text-xs text-muted2">{stat.player.primary_position}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-muted">{stat.team.name}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="font-bold text-brand text-lg">{stat.assists}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-muted">{stat.goals}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="font-semibold text-success">{stat.goal_contributions}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Team Stats */}
      {activeTab === 'teams' && (
        <div>
          {bestTeams.length === 0 ? (
            <EmptyState
              icon="👥"
              title="Estatísticas de times indisponíveis"
              description="As estatísticas dos times aparecerão aqui assim que as partidas começarem."
            />
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stroke">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-muted2 w-16">Pos</th>
                      <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Time</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Jogos</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">V-E-D</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Gols</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Saldo</th>
                      <th className="text-center py-4 px-3 text-sm font-semibold text-muted2">Aprov.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bestTeams.map((stat, index) => (
                      <tr key={stat.id} className="border-b border-stroke hover:bg-panel2 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-text">{index + 1}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {stat.team.logo && (
                              <img
                                src={stat.team.logo}
                                alt={stat.team.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-text">{stat.team.name}</p>
                              <p className="text-xs text-muted2">{stat.team.abbreviation}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-muted">{stat.matches_played}</span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-muted text-sm">
                            {stat.matches_won}-{stat.matches_drawn}-{stat.matches_lost}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-muted text-sm">
                            {stat.goals_scored}/{stat.goals_conceded}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span
                            className={`font-semibold ${
                              stat.goal_difference > 0
                                ? 'text-success'
                                : stat.goal_difference < 0
                                ? 'text-error'
                                : 'text-muted'
                            }`}
                          >
                            {stat.goal_difference > 0 ? '+' : ''}
                            {stat.goal_difference}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="font-bold text-brand">{stat.win_rate.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
