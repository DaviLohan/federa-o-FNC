'use client';

import { Badge } from '@/components/shared/ui';
import type { BracketMatch } from '@/types';

interface BracketMatchCardProps {
  match: BracketMatch;
  compact?: boolean;
  onClick?: () => void;
}

export function BracketMatchCard({ match, compact = false, onClick }: BracketMatchCardProps) {
  const hasWinner = !!match.winner;
  const isScheduled = match.team1 && match.team2 && !hasWinner;
  const isTBD = !match.team1 || !match.team2;

  // Determina status
  let status: 'finished' | 'scheduled' | 'tbd' = 'tbd';
  if (hasWinner) status = 'finished';
  else if (isScheduled) status = 'scheduled';

  const statusConfig = {
    finished: { label: 'Finalizado', color: 'bg-green/20 text-green border-green/30' },
    scheduled: { label: 'Agendado', color: 'bg-gold/20 text-gold border-gold/30' },
    tbd: { label: 'TBD', color: 'bg-muted2/20 text-muted2 border-muted2/30' },
  };

  return (
    <div
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer
        ${compact ? 'p-3' : 'p-4'}
        ${hasWinner 
          ? 'bg-gradient-to-br from-green/5 via-surface2 to-surface1 border-2 border-green/30 shadow-lg shadow-green/10' 
          : 'bg-gradient-to-br from-surface1 to-surface2 border-2 border-border hover:border-gold/30'
        }
        hover:scale-[1.02] hover:shadow-xl hover:shadow-gold/10
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig[status].color}`}>
          {statusConfig[status].label}
        </div>
      </div>

      {/* Match Content */}
      <div className={`space-y-2 ${compact ? 'mt-6' : 'mt-8'}`}>
        {/* Team 1 */}
        <div
          className={`
            flex items-center justify-between rounded-xl transition-all duration-300
            ${compact ? 'p-2.5' : 'p-3.5'}
            ${match.winner?.id === match.team1?.id 
              ? 'bg-gradient-to-r from-green/20 via-green/10 to-transparent border-2 border-green/40 shadow-md shadow-green/20' 
              : 'bg-surface1/50 border border-border/50 group-hover:border-border'
            }
          `}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {match.team1?.logo ? (
              <img
                src={match.team1.logo}
                alt={match.team1.name}
                className={`rounded-lg object-cover flex-shrink-0 ring-1 ring-border ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}
              />
            ) : (
              <div className={`bg-surface2 border border-border rounded-lg flex-shrink-0 flex items-center justify-center ${compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'}`}>
                <span className="text-muted2 font-bold">?</span>
              </div>
            )}
            <span
              className={`font-medium ${compact ? 'text-sm' : 'text-base'} ${
                match.winner?.id === match.team1?.id
                  ? 'font-bold text-green'
                  : match.team1
                  ? 'text-text'
                  : 'text-muted2 opacity-60 italic'
              }`}
              title={match.team1?.name || 'A definir'}
            >
              <span className="truncate block max-w-[180px]">
                {match.team1?.name || 'A definir'}
              </span>
            </span>
            {match.winner?.id === match.team1?.id && (
              <span className="text-green text-xs ml-1">✓</span>
            )}
          </div>
          {match.score && (
            <span
              className={`font-mono font-bold ml-3 flex-shrink-0 ${compact ? 'text-lg' : 'text-2xl'} ${
                match.winner?.id === match.team1?.id ? 'text-green' : 'text-muted2'
              }`}
            >
              {match.score.split('-')[0]}
            </span>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center justify-center py-1">
          <div className="px-3 py-0.5 rounded-full bg-surface2 border border-border">
            <span className={`font-heading font-bold text-muted2 ${compact ? 'text-xs' : 'text-sm'}`}>VS</span>
          </div>
        </div>

        {/* Team 2 */}
        <div
          className={`
            flex items-center justify-between rounded-xl transition-all duration-300
            ${compact ? 'p-2.5' : 'p-3.5'}
            ${match.winner?.id === match.team2?.id 
              ? 'bg-gradient-to-r from-green/20 via-green/10 to-transparent border-2 border-green/40 shadow-md shadow-green/20' 
              : 'bg-surface1/50 border border-border/50 group-hover:border-border'
            }
          `}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {match.team2?.logo ? (
              <img
                src={match.team2.logo}
                alt={match.team2.name}
                className={`rounded-lg object-cover flex-shrink-0 ring-1 ring-border ${compact ? 'w-7 h-7' : 'w-9 h-9'}`}
              />
            ) : (
              <div className={`bg-surface2 border border-border rounded-lg flex-shrink-0 flex items-center justify-center ${compact ? 'w-7 h-7 text-xs' : 'w-9 h-9 text-sm'}`}>
                <span className="text-muted2 font-bold">?</span>
              </div>
            )}
            <span
              className={`font-medium ${compact ? 'text-sm' : 'text-base'} ${
                match.winner?.id === match.team2?.id
                  ? 'font-bold text-green'
                  : match.team2
                  ? 'text-text'
                  : 'text-muted2 opacity-60 italic'
              }`}
              title={match.team2?.name || 'A definir'}
            >
              <span className="truncate block max-w-[180px]">
                {match.team2?.name || 'A definir'}
              </span>
            </span>
            {match.winner?.id === match.team2?.id && (
              <span className="text-green text-xs ml-1">✓</span>
            )}
          </div>
          {match.score && (
            <span
              className={`font-mono font-bold ml-3 flex-shrink-0 ${compact ? 'text-lg' : 'text-2xl'} ${
                match.winner?.id === match.team2?.id ? 'text-green' : 'text-muted2'
              }`}
            >
              {match.score.split('-')[1]}
            </span>
          )}
        </div>
      </div>

      {/* Hover gradient effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute top-0 right-0 w-24 h-24 bg-gold/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}
