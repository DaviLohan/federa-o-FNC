'use client';

import { useQuery } from '@tanstack/react-query';
import { championshipsAPI } from '@/lib/api';
import { Skeleton } from '@/components/shared/ui';
import type { Championship } from '@/types';

interface GroupsTabProps {
  championship: Championship;
}

export function GroupsTab({ championship }: GroupsTabProps) {
  const { data: groups, isLoading } = useQuery({
    queryKey: ['championship-groups', championship.id],
    queryFn: () => championshipsAPI.getGroups(championship.id),
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-[400px] rounded-3xl" />
        ))}
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border p-12">
        <div className="relative z-10 text-center max-w-md mx-auto">
          <div className="text-7xl mb-6 animate-pulse-slow">📊</div>
          <h3 className="text-2xl font-heading font-bold text-text mb-3">
            Grupos ainda não criados
          </h3>
          <p className="text-muted2 text-base leading-relaxed">
            Os grupos serão gerados automaticamente quando o campeonato iniciar. 
            Aguarde a abertura das inscrições e o sorteio dos grupos.
          </p>
        </div>
        
        {/* Decorative gradient orb */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
      </div>
    );
  }

  const qualifiedPerGroup = championship.qualified_per_group || 2;
  const totalQualified = qualifiedPerGroup * (championship.num_groups || 0);

  return (
    <div className="space-y-8">
      {/* Info Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-gold/10 via-gold/10 to-gold2/10 border border-gold/20 p-6">
        <div className="relative z-10 flex items-center justify-center gap-3 text-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted2">
              <span className="font-mono text-2xl font-bold text-gold">{totalQualified}</span>
              <span className="text-muted2 ml-2">times classificam-se para o mata-mata</span>
            </span>
            <span className="text-xs px-3 py-1 rounded-full bg-gold/10 border border-gold/30 text-gold font-medium">
              Top {qualifiedPerGroup} por grupo
            </span>
          </div>
        </div>
        
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gold/5 to-transparent animate-pulse-slow"></div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {groups.map((group, groupIdx) => (
          <div
            key={group.id}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-gold/30 transition-all duration-500 hover:shadow-lg hover:shadow-gold/10"
            style={{
              animationDelay: `${groupIdx * 100}ms`,
            }}
          >
            {/* Group Header */}
            <div className="relative z-10 p-6 pb-4 border-b border-border/50 bg-gradient-to-r from-gold/5 to-gold3/5">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-heading font-bold text-text flex items-center gap-3">
                  <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-gold2 text-background font-mono text-lg shadow-lg shadow-gold/20">
                    {group.name.split(' ')[1] || group.name.charAt(group.name.length - 1)}
                  </span>
                  {group.name}
                </h3>
                <div className="px-3 py-1 rounded-full bg-surface2 border border-border text-xs font-medium text-muted2">
                  {group.standings?.length || 0} times
                </div>
              </div>
            </div>

            {/* Standings Table */}
            <div className="relative z-10 p-6 pt-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted2 uppercase tracking-wider">#</th>
                      <th className="text-left py-3 px-2 text-xs font-medium text-muted2 uppercase tracking-wider">Time</th>
                      <th className="text-center py-3 px-1 text-xs font-medium text-muted2 uppercase tracking-wider">J</th>
                      <th className="text-center py-3 px-1 text-xs font-medium text-muted2 uppercase tracking-wider">V</th>
                      <th className="text-center py-3 px-1 text-xs font-medium text-muted2 uppercase tracking-wider">E</th>
                      <th className="text-center py-3 px-1 text-xs font-medium text-muted2 uppercase tracking-wider">D</th>
                      <th className="text-center py-3 px-1 text-xs font-medium text-muted2 uppercase tracking-wider">SG</th>
                      <th className="text-center py-3 px-2 text-xs font-bold text-gold uppercase tracking-wider">PTS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.standings?.map((standing, idx) => {
                      const isQualified = idx < qualifiedPerGroup;
                      
                      return (
                        <tr
                          key={standing.id}
                          className={`
                            border-b border-border/20 last:border-b-0 transition-all duration-300
                            ${isQualified 
                              ? 'bg-gradient-to-r from-gold/5 via-transparent to-transparent hover:from-gold/10' 
                              : 'hover:bg-surface1/50'
                            }
                          `}
                        >
                          {/* Position with qualified indicator */}
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`
                                font-mono font-bold text-sm w-6 text-center
                                ${isQualified ? 'text-gold' : 'text-muted2'}
                              `}>
                                {idx + 1}
                              </span>
                              {isQualified && (
                                <div className="w-1 h-6 rounded-full bg-gradient-to-b from-gold to-gold3 shadow-lg shadow-gold/30"></div>
                              )}
                            </div>
                          </td>
                          
                          {/* Team */}
                          <td className="py-4 px-2">
                            <div className="flex items-center gap-2.5">
                              {standing.team.logo ? (
                                <img
                                  src={standing.team.logo}
                                  alt={standing.team.name}
                                  className="w-7 h-7 rounded-lg object-cover ring-1 ring-border"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-surface2 border border-border flex items-center justify-center text-xs text-muted2">
                                  {standing.team.name.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-text font-medium truncate max-w-[250px] sm:max-w-xs">
                                {standing.team.name}
                              </span>
                              {isQualified && (
                                <span className="text-gold text-xs">✓</span>
                              )}
                            </div>
                          </td>
                          
                          {/* Stats */}
                          <td className="py-4 px-1 text-center font-mono text-muted">{standing.matches_played}</td>
                          <td className="py-4 px-1 text-center font-mono font-medium text-green">{standing.wins}</td>
                          <td className="py-4 px-1 text-center font-mono text-muted2">{standing.draws}</td>
                          <td className="py-4 px-1 text-center font-mono font-medium text-error">{standing.losses}</td>
                          <td className={`py-4 px-1 text-center font-mono text-sm ${
                            standing.goal_difference > 0 ? 'text-green font-medium' : 
                            standing.goal_difference < 0 ? 'text-error font-medium' : 
                            'text-muted2'
                          }`}>
                            {standing.goal_difference > 0 ? '+' : ''}{standing.goal_difference}
                          </td>
                          <td className="py-4 px-2 text-center">
                            <span className="inline-flex items-center justify-center min-w-[36px] h-7 px-2 rounded-lg bg-gold/10 border border-gold/20 font-mono font-bold text-gold text-sm">
                              {standing.points}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="mt-4 pt-4 border-t border-border/30 flex items-center justify-center gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-1 h-4 rounded-full bg-gradient-to-b from-gold to-gold3 shadow-sm shadow-gold/30"></div>
                  <span className="text-muted2">Classificado para o mata-mata</span>
                </div>
              </div>
            </div>

            {/* Hover gradient effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gold/10 rounded-full blur-2xl"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
