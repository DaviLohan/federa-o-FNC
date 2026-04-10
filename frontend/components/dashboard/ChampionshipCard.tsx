'use client';

import Link from 'next/link';
import { Trophy, Users, Calendar, Award } from 'lucide-react';
import { Badge } from '@/components/shared/ui/Badge';
import { formatDateShort } from '@/lib/utils/date';

interface ChampionshipCardProps {
  championship: {
    id: number;
    name: string;
    description?: string;
    format: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'FINISHED';
    max_teams: number;
    start_date?: string;
    end_date?: string;
    enrolled_teams_count?: number;
  };
}

const statusConfig = {
  OPEN: { label: 'Inscrições Abertas', variant: 'success' as const },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'warning' as const },
  FINISHED: { label: 'Finalizado', variant: 'default' as const },
};

const formatConfig: Record<string, string> = {
  LEAGUE: 'Pontos Corridos',
  KNOCKOUT: 'Eliminatória',
  GROUPS_KNOCKOUT: 'Grupos + Mata-Mata',
};

export function ChampionshipCard({ championship }: ChampionshipCardProps) {
  const statusInfo = statusConfig[championship.status];
  const enrolledCount = championship.enrolled_teams_count || 0;
  const maxTeams = championship.max_teams;
  const progress = (enrolledCount / maxTeams) * 100;

  return (
    <Link href={`/championships/${championship.id}`}>
      <div
        className="
          group relative overflow-hidden rounded-xl border border-border
          bg-surface2 p-6 transition-all duration-300
          hover:border-warning/30 hover:shadow-lg hover:shadow-lime/5
        "
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="mb-2 text-xl font-bold text-text group-hover:text-warning transition-colors truncate">
              {championship.name}
            </h3>
            {championship.description && (
              <p className="text-sm text-muted line-clamp-2">
                {championship.description}
              </p>
            )}
          </div>
          <Trophy className="h-8 w-8 text-warning" />
        </div>

        {/* Stats */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gold/10 p-2">
              <Award className="h-4 w-4 text-gold" />
            </div>
            <div>
              <div className="text-xs text-muted">Formato</div>
              <div className="text-sm font-medium text-text">
                {formatConfig[championship.format] || championship.format}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gold/10 p-2">
              <Users className="h-4 w-4 text-gold" />
            </div>
            <div>
              <div className="text-xs text-muted">Times</div>
              <div className="text-sm font-medium text-text">
                {enrolledCount}/{maxTeams}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar (if OPEN) */}
        {championship.status === 'OPEN' && (
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-muted">
              <span>Vagas preenchidas</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-surface1">
              <div
                className="h-full bg-gradient-to-r from-gold via-gold to-gold2 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Dates */}
        {championship.start_date && (
          <div className="mb-4 flex items-center gap-2 text-xs text-muted">
            <Calendar className="h-3 w-3" />
            <span>
              Início:{' '}
              {formatDateShort(championship.start_date)}
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-4">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          <span className="text-sm text-gold opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            Ver detalhes →
          </span>
        </div>
      </div>
    </Link>
  );
}
