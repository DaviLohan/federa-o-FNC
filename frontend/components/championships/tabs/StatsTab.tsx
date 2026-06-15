'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Skeleton, Tabs, Tab } from '@/components/shared/ui';
import { statisticsAPI } from '@/lib/api';
import { Trophy, Target, Users, BarChart3, Goal, ShieldCheck, Swords, TimerReset } from 'lucide-react';

interface StatsTabProps {
  championshipId: number;
}

export function StatsTab({ championshipId }: StatsTabProps) {
  const [activeTab, setActiveTab] = useState('scorers');

  const { data: dashboard, isLoading, isError, refetch } = useQuery({
    queryKey: ['championship-stats-dashboard', championshipId],
    queryFn: () => statisticsAPI.getChampionshipDashboard(championshipId),
  });

  const topScorers = dashboard?.top_scorers || [];
  const topAssisters = dashboard?.top_assisters || [];
  const bestTeams = dashboard?.teams || [];
  const overview = dashboard?.overview;
  const hasAnyStats = topScorers.length > 0 || topAssisters.length > 0 || bestTeams.length > 0 || !!overview;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-16 h-16 text-gold mx-auto" />}
        title="Não foi possível carregar as estatísticas"
        description="Tente novamente em instantes. Se o problema continuar, reprocessar o campeonato pode ser necessário."
        action={
          <button
            onClick={() => refetch()}
            className="inline-flex items-center rounded-2xl border border-gold px-5 py-3 text-sm font-semibold text-gold transition-colors hover:bg-gold/10"
          >
            Tentar novamente
          </button>
        }
        size="lg"
      />
    );
  }

  if (!hasAnyStats) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-16 h-16 text-gold mx-auto" />}
        title="Estatísticas ainda não disponíveis"
        description="As estatísticas são geradas automaticamente a partir dos relatórios de partida via EA Sports. Reporte as partidas finalizadas para acompanhar artilheiros, assistências e desempenho dos times."
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      {overview && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="p-5 bg-surface1 border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                <Swords className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Partidas</p>
                <p className="mt-1 text-xl font-bold text-text">{overview.matches_finished}/{overview.matches_total}</p>
                <p className="text-sm text-muted">finalizadas</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-surface1 border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                <Goal className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Gols</p>
                <p className="mt-1 text-xl font-bold text-text">{overview.goals_total}</p>
                <p className="text-sm text-muted">média {overview.avg_goals_per_match.toFixed(2)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-surface1 border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Estrutura</p>
                <p className="mt-1 text-xl font-bold text-text">{overview.teams_count} times</p>
                <p className="text-sm text-muted">{overview.groups_count} grupos</p>
              </div>
            </div>
          </Card>
          <Card className="p-5 bg-surface1 border-border">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                <TimerReset className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Pendências</p>
                <p className="mt-1 text-xl font-bold text-text">{overview.matches_pending}</p>
                <p className="text-sm text-muted">contestadas {overview.matches_contested}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

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
              icon={<Trophy className="w-12 h-12 text-gold mx-auto" />}
              title="Nenhum gol marcado ainda"
              description="A tabela de artilheiros será preenchida conforme os gols forem registrados nos relatórios de partida."
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
              icon={<Target className="w-12 h-12 text-gold mx-auto" />}
              title="Nenhuma assistência registrada"
              description="O ranking de assistências será atualizado automaticamente a partir dos relatórios confirmados."
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
              icon={<Users className="w-12 h-12 text-gold mx-auto" />}
              title="Estatísticas de times indisponíveis"
              description="O desempenho dos times será calculado conforme as partidas forem reportadas e confirmadas."
            />
          ) : (
            <div className="space-y-4">
              {(dashboard?.best_attack || dashboard?.best_defense) && (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {dashboard?.best_attack && (
                    <Card className="p-5 bg-surface1 border-border">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                          <Trophy className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted2">Melhor Ataque</p>
                          <p className="mt-1 text-lg font-bold text-text">{dashboard.best_attack.team.name}</p>
                          <p className="text-sm text-muted">{dashboard.best_attack.goals_scored} gols marcados</p>
                        </div>
                      </div>
                    </Card>
                  )}
                  {dashboard?.best_defense && (
                    <Card className="p-5 bg-surface1 border-border">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-muted2">Melhor Defesa</p>
                          <p className="mt-1 text-lg font-bold text-text">{dashboard.best_defense.team.name}</p>
                          <p className="text-sm text-muted">{dashboard.best_defense.goals_conceded} gols sofridos</p>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              )}

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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
