'use client';

import { useState } from 'react';
import { Card, EmptyState, Badge, Button } from '@/components/shared/ui';
import type { Match, Championship } from '@/types';
import { Calendar, Clock } from 'lucide-react';
import { usePermissions } from '@/lib/hooks';
import { MatchReportModal, ContestationModal } from '../modals';

interface MatchesTabProps {
  matches: Match[];
  championship: Championship;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-muted2/20 text-muted' },
  SCHEDULED: { label: 'Agendada', color: 'bg-muted2/20 text-muted' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-brand/20 text-brand' },
  FINISHED: { label: 'Finalizada', color: 'bg-success/20 text-success' },
  CANCELLED: { label: 'Cancelada', color: 'bg-error/20 text-error' },
  CONTESTED: { label: 'Contestada', color: 'bg-warning/20 text-warning' },
};

export function MatchesTab({ matches, championship }: MatchesTabProps) {
  const { canReportMatch, canContestMatch, user } = usePermissions();
  
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [contestingMatch, setContestingMatch] = useState<Match | null>(null);
  const [contestingTeamId, setContestingTeamId] = useState<number | null>(null);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon="⚽"
        title="Nenhuma partida agendada"
        description="As partidas serão exibidas assim que o campeonato começar."
        size="lg"
      />
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Group matches by round if available
  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round_number || 0;
    if (!acc[round]) {
      acc[round] = [];
    }
    acc[round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches)
        .sort(([a], [b]) => parseInt(b) - parseInt(a)) // Most recent first
        .map(([round, roundMatches]) => (
          <div key={round}>
            {round !== '0' && (
              <h2 className="text-lg font-bold text-text mb-4">
                Rodada {round}
              </h2>
            )}

            <div className="space-y-4">
              {roundMatches.map((match) => {
                const status = statusConfig[match.status];
                const canReport = canReportMatch(match);
                const canContest = canContestMatch(match);

                return (
                  <Card key={match.id} className="p-4 md:p-6 hover:border-brand/30 transition-colors">
                    <div className="flex flex-col gap-4">
                      {/* Top row: Date + Actions (mobile) / full row (lg) */}
                      <div className="flex items-start justify-between gap-4 lg:hidden">
                        {/* Date & Time compact */}
                        <div className="flex items-center gap-3 px-3 py-2 bg-panel2 rounded-xl">
                          <Calendar className="w-3 h-3 text-muted2 shrink-0" />
                          <div>
                            <p className="text-xs text-muted2">{formatDate(match.scheduled_date)}</p>
                            <p className="text-sm font-bold text-text">{formatTime(match.scheduled_date)}</p>
                          </div>
                        </div>
                        {/* Actions mobile */}
                        <div className="flex flex-col gap-2 shrink-0">
                          {canReport && match.status === 'SCHEDULED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => setReportingMatch(match)}
                            >
                              Reportar
                            </Button>
                          )}
                          {canContest && (match.status === 'FINISHED' || match.status === 'CONTESTED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-warning"
                              onClick={() => {
                                setContestingMatch(match);
                                const userTeamId = user?.team_owner_profile
                                  ? match.home_team.owner.id === user.id
                                    ? match.home_team.id
                                    : match.away_team.id
                                  : undefined;
                                setContestingTeamId(userTeamId || match.home_team.id);
                              }}
                            >
                              Contestar
                            </Button>
                          )}
                          {match.status === 'CONTESTED' && (
                            <span className="text-xs text-center text-warning">⚠️ Contestado</span>
                          )}
                        </div>
                      </div>

                      {/* Teams & Score */}
                      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                        {/* Date col (lg only) */}
                        <div className="hidden lg:flex flex-col items-center justify-center px-4 py-3 bg-panel2 rounded-xl w-32 shrink-0">
                          <div className="flex items-center gap-2 text-muted2 text-xs mb-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(match.scheduled_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-text font-bold text-lg">
                            <Clock className="w-4 h-4" />
                            <span>{formatTime(match.scheduled_date)}</span>
                          </div>
                        </div>

                        {/* Teams & Score */}
                        <div className="flex-1 w-full">
                          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-center">
                               {/* Home Team */}
                             <div className="flex items-center justify-end gap-2 md:gap-3">
                               <div className="text-right">
                                 <h3 className="font-bold text-text text-sm md:text-base truncate">
                                   {match.home_team.name}
                                 </h3>
                                 <p className="text-xs text-muted2">
                                   {match.home_team.abbreviation}
                                 </p>
                               </div>
                               {match.home_team.logo && (
                                 <img
                                   src={match.home_team.logo}
                                   alt={match.home_team.name}
                                   className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0"
                                 />
                               )}
                             </div>

                            {/* Score */}
                            <div className="flex items-center justify-center px-2">
                              {match.status === 'FINISHED' || match.status === 'CONTESTED' ? (
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl md:text-3xl font-bold text-text">
                                    {match.home_score}
                                  </span>
                                  <span className="text-lg md:text-2xl font-bold text-muted2">×</span>
                                  <span className="text-2xl md:text-3xl font-bold text-text">
                                    {match.away_score}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xl font-bold text-muted2">×</span>
                              )}
                            </div>

                             {/* Away Team */}
                             <div className="flex items-center justify-start gap-2 md:gap-3">
                               {match.away_team.logo && (
                                 <img
                                   src={match.away_team.logo}
                                   alt={match.away_team.name}
                                   className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0"
                                 />
                               )}
                               <div className="text-left">
                                 <h3 className="font-bold text-text text-sm md:text-base truncate">
                                   {match.away_team.name}
                                 </h3>
                                 <p className="text-xs text-muted2">
                                   {match.away_team.abbreviation}
                                 </p>
                               </div>
                             </div>
                          </div>

                          {/* Match Info */}
                          <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-3 pt-3 border-t border-stroke">
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>

                            {match.match_type && match.match_type !== 'CHAMPIONSHIP' && (
                              <Badge variant="info">
                                {match.match_type === 'FINAL' ? 'Final' : match.match_type}
                              </Badge>
                            )}

                            {match.winner && (
                              <span className="text-xs md:text-sm text-muted2">
                                Vencedor: <span className="text-success font-semibold">{match.winner.name}</span>
                              </span>
                            )}

                            {match.is_draw && (
                              <span className="text-xs md:text-sm text-warning font-semibold">Empate</span>
                            )}

                            {match.duration_minutes > 0 && (
                              <span className="text-xs md:text-sm text-muted2">
                                {match.duration_minutes} min
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions col (lg only) */}
                        <div className="hidden lg:flex flex-col gap-2 w-36 shrink-0">
                          {canReport && match.status === 'SCHEDULED' && (
                            <Button
                              variant="primary"
                              size="sm"
                              className="w-full"
                              onClick={() => setReportingMatch(match)}
                            >
                              Reportar Resultado
                            </Button>
                          )}

                          {canContest && (match.status === 'FINISHED' || match.status === 'CONTESTED') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-warning"
                              onClick={() => {
                                setContestingMatch(match);
                                const userTeamId = user?.team_owner_profile
                                  ? match.home_team.owner.id === user.id
                                    ? match.home_team.id
                                    : match.away_team.id
                                  : undefined;
                                setContestingTeamId(userTeamId || match.home_team.id);
                              }}
                            >
                              Contestar
                            </Button>
                          )}

                          {match.status === 'CONTESTED' && (
                            <span className="text-xs text-center text-warning">
                              ⚠️ Resultado contestado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        ))}

      {/* Match Report Modal */}
      {reportingMatch && (
        <MatchReportModal
          match={reportingMatch}
          isOpen={true}
          onClose={() => setReportingMatch(null)}
        />
      )}

      {/* Contestation Modal */}
      {contestingMatch && contestingTeamId && (
        <ContestationModal
          match={contestingMatch}
          teamId={contestingTeamId}
          isOpen={true}
          onClose={() => {
            setContestingMatch(null);
            setContestingTeamId(null);
          }}
        />
      )}
    </div>
  );
}
