'use client';

import { Badge } from '@/components/shared/ui';
import type { Match } from '@/types';
import { Calendar, Clock } from 'lucide-react';
import type { ReactNode } from 'react';
import { formatDate, formatTime } from '@/lib/utils/date';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchScorecardProps {
  match: Match;
  children?: ReactNode;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-muted2/20 text-muted' },
  SCHEDULED: { label: 'Agendada', color: 'bg-muted2/20 text-muted' },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-brand/20 text-brand' },
  FINISHED: { label: 'Finalizada', color: 'bg-success/20 text-success' },
  CANCELLED: { label: 'Cancelada', color: 'bg-error/20 text-error' },
  CONTESTED: { label: 'Contestada', color: 'bg-warning/20 text-warning' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchScorecard({ match, children }: MatchScorecardProps) {
  const status = statusConfig[match.status] || statusConfig.PENDING;

  return (
    <div className="bg-panel border border-stroke rounded-2xl overflow-hidden hover:border-brand/30 transition-colors">
      <div className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Date & Time */}
          <div className="flex items-center gap-3 px-3 py-2 bg-panel2 rounded-xl lg:flex-col lg:items-center lg:justify-center lg:w-28 lg:shrink-0 lg:px-4 lg:py-3 self-start">
            <Calendar className="w-3.5 h-3.5 text-muted2 shrink-0 lg:mb-1" />
            <div className="lg:text-center">
              <p className="text-xs text-muted2">{formatDate(match.scheduled_date)}</p>
              <p className="text-sm lg:text-lg font-bold text-text">
                {formatTime(match.scheduled_date)}
              </p>
            </div>
          </div>

          {/* Teams & Score */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 md:gap-4 items-center">
              {/* Home Team */}
              <div className="flex items-center justify-end gap-2 md:gap-3">
                <div className="text-right min-w-0">
                  <h3 className="font-bold text-text text-sm md:text-base truncate">
                    {match.home_team.name}
                  </h3>
                  <p className="text-xs text-muted2">{match.home_team.abbreviation}</p>
                </div>
                {match.home_team.logo && (
                  <img
                    src={match.home_team.logo}
                    alt={match.home_team.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0"
                  />
                )}
              </div>

              {/* Score */}
              <div className="flex items-center justify-center px-1 sm:px-2">
                {match.status === 'FINISHED' || match.status === 'CONTESTED' ? (
                  <div className="flex items-center gap-1 sm:gap-2">
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-text font-heading">
                      {match.home_score}
                    </span>
                    <span className="text-base sm:text-lg md:text-2xl font-bold text-muted2">&times;</span>
                    <span className="text-xl sm:text-2xl md:text-3xl font-bold text-text font-heading">
                      {match.away_score}
                    </span>
                  </div>
                ) : (
                  <span className="text-lg sm:text-xl font-bold text-muted2">&times;</span>
                )}
              </div>

              {/* Away Team */}
              <div className="flex items-center justify-start gap-2 md:gap-3">
                {match.away_team.logo && (
                  <img
                    src={match.away_team.logo}
                    alt={match.away_team.name}
                    className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg object-cover shrink-0"
                  />
                )}
                <div className="text-left min-w-0">
                  <h3 className="font-bold text-text text-sm md:text-base truncate">
                    {match.away_team.name}
                  </h3>
                  <p className="text-xs text-muted2">{match.away_team.abbreviation}</p>
                </div>
              </div>
            </div>

            {/* Match Info */}
            <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-3 pt-3 border-t border-stroke">
              <Badge className={status.color}>{status.label}</Badge>

              {match.match_type && match.match_type !== 'CHAMPIONSHIP' && (
                <Badge variant="info">
                  {match.match_type === 'FINAL' ? 'Final' : match.match_type}
                </Badge>
              )}

              {match.winner && (
                <span className="text-xs md:text-sm text-muted2">
                  Vencedor:{' '}
                  <span className="text-success font-semibold">{match.winner.name}</span>
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
        </div>
      </div>

      {/* Children slot (e.g. ReportStatusBar) */}
      {children}
    </div>
  );
}
