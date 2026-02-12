'use client';

import Link from 'next/link';
import { Calendar, Clock, Trophy } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';

interface MatchCardProps {
  match: {
    id: number;
    team_a: {
      id: number;
      name: string;
      abbreviation: string;
      logo_url?: string;
    };
    team_b: {
      id: number;
      name: string;
      abbreviation: string;
      logo_url?: string;
    };
    championship: {
      id: number;
      name: string;
    };
    scheduled_date: string;
    scheduled_time?: string;
    status: 'SCHEDULED' | 'LIVE' | 'FINISHED' | 'CONTESTED';
    score_a?: number;
    score_b?: number;
  };
  showActions?: boolean;
  compact?: boolean;
}

const statusConfig = {
  SCHEDULED: { label: 'Agendada', variant: 'pending' as const },
  LIVE: { label: 'Ao Vivo', variant: 'success' as const },
  FINISHED: { label: 'Finalizada', variant: 'finished' as const },
  CONTESTED: { label: 'Contestada', variant: 'warning' as const },
};

export function MatchCard({ match, showActions = false, compact = false }: MatchCardProps) {
  const statusInfo = statusConfig[match.status];

  // Formatar data
  const matchDate = new Date(match.scheduled_date);
  const formattedDate = matchDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });

  return (
    <Link href={`/matches/${match.id}`}>
      <div
        className={`
          group relative overflow-hidden rounded-xl border border-border
          bg-surface2 transition-all duration-300
          hover:border-gold/30 hover:shadow-lg hover:shadow-gold/5
          ${compact ? 'p-4' : 'p-6'}
        `}
      >
        {/* Championship Badge */}
        <div className="mb-4 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-gold" />
          <span className="text-xs font-medium text-muted">
            {match.championship.name}
          </span>
        </div>

        {/* Teams */}
        <div className="mb-4 flex items-center justify-between gap-4">
          {/* Team A */}
          <div className="flex-1 text-center">
            <div className="mb-2 text-lg font-bold text-text">
              {match.team_a.name}
            </div>
            <div className="text-sm text-muted">({match.team_a.abbreviation})</div>
            {match.status === 'FINISHED' && match.score_a !== undefined && (
              <div className="mt-2 text-2xl font-mono font-bold text-gold">
                {match.score_a}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-lg font-bold text-muted">vs</div>

          {/* Team B */}
          <div className="flex-1 text-center">
            <div className="mb-2 text-lg font-bold text-text">
              {match.team_b.name}
            </div>
            <div className="text-sm text-muted">({match.team_b.abbreviation})</div>
            {match.status === 'FINISHED' && match.score_b !== undefined && (
              <div className="mt-2 text-2xl font-mono font-bold text-warning">
                {match.score_b}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 border-t border-border/50 pt-4">
          <div className="flex items-center gap-3 text-xs text-muted">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{formattedDate}</span>
            </div>
            {match.scheduled_time && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{match.scheduled_time}</span>
              </div>
            )}
          </div>

          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>

        {/* Hover effect */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm text-gold">Ver detalhes →</span>
        </div>
      </div>
    </Link>
  );
}
