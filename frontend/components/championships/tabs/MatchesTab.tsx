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

const statusConfig = {
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
                  <Card key={match.id} className="p-6 hover:border-brand/30 transition-colors">
                    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                      {/* Date & Time */}
                      <div className="flex flex-col items-center justify-center px-4 py-3 bg-panel2 rounded-xl min-w-[120px]">
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
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                          {/* Home Team */}
                          <div className="flex items-center justify-end gap-3">
                            <div className="text-right">
                              <h3 className="font-bold text-text truncate">
                                {match.home_team.name}
                              </h3>
                              <p className="text-sm text-muted2">
                                {match.home_team.abbreviation}
                              </p>
                            </div>
                            {match.home_team.logo && (
                              <img
                                src={match.home_team.logo}
                                alt={match.home_team.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                          </div>

                          {/* Score */}
                          <div className="flex items-center justify-center min-w-[120px]">
                            {match.status === 'FINISHED' || match.status === 'CONTESTED' ? (
                              <div className="flex items-center gap-3">
                                <span className="text-3xl font-bold text-text">
                                  {match.home_score}
                                </span>
                                <span className="text-2xl font-bold text-muted2">×</span>
                                <span className="text-3xl font-bold text-text">
                                  {match.away_score}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xl font-bold text-muted2">×</span>
                            )}
                          </div>

                          {/* Away Team */}
                          <div className="flex items-center justify-start gap-3">
                            {match.away_team.logo && (
                              <img
                                src={match.away_team.logo}
                                alt={match.away_team.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div className="text-left">
                              <h3 className="font-bold text-text truncate">
                                {match.away_team.name}
                              </h3>
                              <p className="text-sm text-muted2">
                                {match.away_team.abbreviation}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Match Info */}
                        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-stroke">
                          <Badge className={status.color}>
                            {status.label}
                          </Badge>

                          {match.match_type && match.match_type !== 'CHAMPIONSHIP' && (
                            <Badge variant="info">
                              {match.match_type === 'FINAL' ? 'Final' : match.match_type}
                            </Badge>
                          )}

                          {match.winner && (
                            <span className="text-sm text-muted2">
                              Vencedor: <span className="text-success font-semibold">{match.winner.name}</span>
                            </span>
                          )}

                          {match.is_draw && (
                            <span className="text-sm text-warning font-semibold">Empate</span>
                          )}

                          {match.duration_minutes > 0 && (
                            <span className="text-sm text-muted2">
                              Duração: {match.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 min-w-[140px]">
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
                              // Determine which team the user belongs to
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
