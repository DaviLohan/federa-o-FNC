'use client';

import { Card, Table, EmptyState } from '@/components/shared/ui';
import type { Standings } from '@/types';
import { Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StandingsTabProps {
  standings: Standings[];
  error?: any;
  isLoading?: boolean;
}

export function StandingsTab({ standings, error, isLoading }: StandingsTabProps) {
  // Show loading state
  if (isLoading) {
    return (
      <EmptyState
        icon="⏳"
        title="Carregando classificação..."
        description="Aguarde enquanto buscamos os dados."
        size="lg"
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <EmptyState
        icon="⚠️"
        title="Erro ao carregar classificação"
        description={error.message || "Não foi possível buscar a classificação. Tente novamente."}
        size="lg"
      />
    );
  }

  if (standings.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="Classificação ainda não disponível"
        description="A classificação será exibida assim que as partidas começarem."
        size="lg"
      />
    );
  }

  const getPositionBadge = (position: number) => {
    if (position === 1) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold shadow-lg">
          {position}
        </div>
      );
    }
    if (position === 2) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 text-white font-bold shadow-lg">
          {position}
        </div>
      );
    }
    if (position === 3) {
      return (
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 text-white font-bold shadow-lg">
          {position}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-panel2 text-muted font-semibold">
        {position}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top 3 Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {standings.slice(0, 3).map((standing, index) => {
          const position = index + 1;
          const medals = ['🥇', '🥈', '🥉'];
          const colors = [
            'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
            'from-gray-400/20 to-gray-500/20 border-gray-400/30',
            'from-orange-500/20 to-orange-600/20 border-orange-500/30',
          ];

          return (
            <Card key={standing.id} className={`p-6 bg-gradient-to-br ${colors[index]}`}>
              <div className="flex items-start justify-between mb-4">
                <span className="text-4xl">{medals[index]}</span>
                <span className="text-xs px-2 py-1 rounded-full bg-white/10 text-white font-medium">
                  {position}º lugar
                </span>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                {standing.team.logo && (
                  <img
                    src={standing.team.logo}
                    alt={standing.team.name}
                    className="w-12 h-12 rounded-lg object-cover border border-stroke"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-text truncate" title={standing.team.name}>
                    {standing.team.name}
                  </h3>
                  <p className="text-sm text-muted">{standing.team.abbreviation}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-text">{standing.points}</p>
                  <p className="text-xs text-muted2">Pontos</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-text">{standing.wins}</p>
                  <p className="text-xs text-muted2">Vitórias</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-success">
                    {standing.goal_difference > 0 ? '+' : ''}
                    {standing.goal_difference}
                  </p>
                  <p className="text-xs text-muted2">Saldo</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Full Standings Table */}
      <Card>
        <div className="relative">
          {/* Scroll indicators for mobile */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-surface1 to-transparent z-10 pointer-events-none lg:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-surface1 to-transparent z-10 pointer-events-none lg:hidden" />
          
          <div className="overflow-x-auto">
            <table className="w-full">
            <thead>
              <tr className="border-b border-stroke">
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted2 w-16">Pos</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-muted2">Time</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">P</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">J</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">V</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">E</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">D</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">GP</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">GC</th>
                <th className="text-center py-4 px-3 text-sm font-semibold text-muted2 w-16">SG</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((standing, index) => {
                const position = index + 1;
                
                return (
                  <tr
                    key={standing.id}
                    className="border-b border-stroke hover:bg-panel2 transition-colors"
                  >
                    {/* Position */}
                    <td className="py-4 px-4">
                      {getPositionBadge(position)}
                    </td>

                    {/* Team */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        {standing.team.logo && (
                          <img
                            src={standing.team.logo}
                            alt={standing.team.name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-text">{standing.team.name}</p>
                          <p className="text-xs text-muted2">{standing.team.abbreviation}</p>
                        </div>
                      </div>
                    </td>

                    {/* Points */}
                    <td className="py-4 px-3 text-center">
                      <span className="font-bold text-text text-lg">{standing.points}</span>
                    </td>

                    {/* Matches Played */}
                    <td className="py-4 px-3 text-center text-muted">{standing.matches_played}</td>

                    {/* Wins */}
                    <td className="py-4 px-3 text-center">
                      <span className="text-success font-semibold">{standing.wins}</span>
                    </td>

                    {/* Draws */}
                    <td className="py-4 px-3 text-center">
                      <span className="text-muted">{standing.draws}</span>
                    </td>

                    {/* Losses */}
                    <td className="py-4 px-3 text-center">
                      <span className="text-error font-semibold">{standing.losses}</span>
                    </td>

                    {/* Goals For */}
                    <td className="py-4 px-3 text-center text-muted">{standing.goals_for}</td>

                    {/* Goals Against */}
                    <td className="py-4 px-3 text-center text-muted">{standing.goals_against}</td>

                    {/* Goal Difference */}
                    <td className="py-4 px-3 text-center">
                      <span
                        className={`font-semibold ${
                          standing.goal_difference > 0
                            ? 'text-success'
                            : standing.goal_difference < 0
                            ? 'text-error'
                            : 'text-muted'
                        }`}
                      >
                        {standing.goal_difference > 0 ? '+' : ''}
                        {standing.goal_difference}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>

        {/* Legend */}
        <div className="px-6 py-4 border-t border-stroke bg-panel2">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted2">
            <span><strong className="text-text">P</strong> = Pontos</span>
            <span><strong className="text-text">J</strong> = Jogos</span>
            <span><strong className="text-text">V</strong> = Vitórias</span>
            <span><strong className="text-text">E</strong> = Empates</span>
            <span><strong className="text-text">D</strong> = Derrotas</span>
            <span><strong className="text-text">GP</strong> = Gols Pró</span>
            <span><strong className="text-text">GC</strong> = Gols Contra</span>
            <span><strong className="text-text">SG</strong> = Saldo de Gols</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
