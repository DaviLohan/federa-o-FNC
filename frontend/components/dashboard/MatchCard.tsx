'use client';

import Link from 'next/link';
import { Calendar, Clock, Trophy } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';

interface MatchCardProps {
  match: {
    id: number;
    home_team: {
      id: number;
      name: string;
      abbreviation: string;
      logo_url?: string;
    };
    away_team: {
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
    status: 'PENDING' | 'SCHEDULED' | 'LIVE' | 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'CONTESTED';
    home_score?: number;
    away_score?: number;
  };
  showActions?: boolean;
  compact?: boolean;
}

const statusConfig: Record<string, { label: string; variant: 'pending' | 'success' | 'finished' | 'warning' | 'default' }> = {
  PENDING: { label: 'Pendente', variant: 'pending' },
  SCHEDULED: { label: 'Agendada', variant: 'pending' },
  LIVE: { label: 'Ao Vivo', variant: 'success' },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'success' },
  FINISHED: { label: 'Finalizada', variant: 'finished' },
  CANCELLED: { label: 'Cancelada', variant: 'default' },
  CONTESTED: { label: 'Contestada', variant: 'warning' },
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
          {/* Team Home */}
          <div className="flex-1 text-center">
            <div className="mb-2 text-lg font-bold text-text">
              {match.home_team.name}
            </div>
            <div className="text-sm text-muted">({match.home_team.abbreviation})</div>
            {match.status === 'FINISHED' && match.home_score !== undefined && (
              <div className="mt-2 text-2xl font-mono font-bold text-gold">
                {match.home_score}
              </div>
            )}
          </div>

          {/* VS */}
          <div className="text-lg font-bold text-muted">vs</div>

          {/* Team Away */}
          <div className="flex-1 text-center">
            <div className="mb-2 text-lg font-bold text-text">
              {match.away_team.name}
            </div>
            <div className="text-sm text-muted">({match.away_team.abbreviation})</div>
            {match.status === 'FINISHED' && match.away_score !== undefined && (
              <div className="mt-2 text-2xl font-mono font-bold text-warning">
                {match.away_score}
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
