'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { matchesAPI } from '@/lib/api';
import { Card, Badge, Button, EmptyState } from '@/components/shared/ui';
import { MatchReportModal } from '@/components/championships/modals/MatchReportModal';
import type { Match } from '@/types';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import { formatDate, formatTime } from '@/lib/utils/date';

interface TeamMatchesTabProps {
  teamId: number;
  isOwner: boolean;
}

type FilterStatus = 'all' | 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED';

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING:     { label: 'Pendente',     color: 'bg-muted2/20 text-muted'    },
  SCHEDULED:   { label: 'Agendada',    color: 'bg-muted2/20 text-muted'    },
  IN_PROGRESS: { label: 'Em Andamento', color: 'bg-brand/20 text-brand'    },
  FINISHED:    { label: 'Finalizada',  color: 'bg-success/20 text-success' },
  CANCELLED:   { label: 'Cancelada',   color: 'bg-error/20 text-error'     },
  CONTESTED:   { label: 'Contestada',  color: 'bg-warning/20 text-warning' },
};

const filterTabs: { id: FilterStatus; label: string }[] = [
  { id: 'all',         label: 'Todas'         },
  { id: 'SCHEDULED',   label: 'Agendadas'     },
  { id: 'IN_PROGRESS', label: 'Em Andamento'  },
  { id: 'FINISHED',    label: 'Finalizadas'   },
];

export function TeamMatchesTab({ teamId, isOwner }: TeamMatchesTabProps) {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('all');
  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['team-matches', teamId],
    queryFn: () => matchesAPI.getAll({ team: teamId, page_size: 50 }),
    enabled: !isNaN(teamId),
    staleTime: 30_000,
  });

  const allMatches: Match[] = Array.isArray(data)
    ? data
    : (data as any)?.results ?? [];

  const filtered =
    activeFilter === 'all'
      ? allMatches
      : allMatches.filter((m) => m.status === activeFilter);

  // Ordenar por data decrescente
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.scheduled_date).getTime() - new Date(a.scheduled_date).getTime()
  );

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-surface2 animate-pulse border border-border"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {filterTabs.map((f) => (
          <button
            key={f.id}
            onClick={() => setActiveFilter(f.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
              activeFilter === f.id
                ? 'bg-gold/10 text-gold border border-gold/30'
                : 'text-muted hover:text-text bg-surface2 border border-border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Contador ─────────────────────────────────────────────────────────── */}
      <p className="text-sm text-muted">
        {sorted.length} {sorted.length === 1 ? 'partida' : 'partidas'}
      </p>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {sorted.length === 0 && (
        <EmptyState
          icon="⚽"
          title="Nenhuma partida encontrada"
          description={
            activeFilter === 'all'
              ? 'Este time ainda não tem partidas registradas.'
              : 'Nenhuma partida com este filtro.'
          }
        />
      )}

      {/* ── Cards de partidas ────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {sorted.map((match) => {
          const status = statusConfig[match.status] ?? statusConfig['PENDING'];
          const canReport =
            isOwner &&
            (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS');

          const isHome = match.home_team.id === teamId;
          const myTeam = isHome ? match.home_team : match.away_team;
          const oppTeam = isHome ? match.away_team : match.home_team;
          const myScore = isHome ? match.home_score : match.away_score;
          const oppScore = isHome ? match.away_score : match.home_score;

          const hasScore =
            match.status === 'FINISHED' || match.status === 'CONTESTED';

          return (
            <div
              key={match.id}
              onClick={() => router.push(`/matches/${match.id}`)}
              className="cursor-pointer"
            >
            <Card
              className="!p-4 sm:!p-5 hover:border-gold/20 transition-colors"
            >
              <div className="flex flex-col gap-3">

                {/* Linha superior: campeonato · rodada · data */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                  {match.championship && (
                    <span className="font-medium text-text/70">
                      {match.championship.name}
                    </span>
                  )}
                  {match.championship && match.round_number && (
                    <span>·</span>
                  )}
                  {match.round_number && (
                    <span>Rodada {match.round_number}</span>
                  )}
                  {(match.championship || match.round_number) && (
                    <span>·</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(match.scheduled_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatTime(match.scheduled_date)}
                  </span>
                </div>

                {/* Placar central */}
                <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">

                  {/* Time da casa / meu time (à esquerda) */}
                  <div className="flex items-center gap-2 min-w-0">
                    {myTeam.logo && (
                      <img
                        src={myTeam.logo}
                        alt={myTeam.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="font-bold text-text text-sm truncate">{myTeam.name}</p>
                      <p className="text-xs text-muted">{myTeam.abbreviation}</p>
                    </div>
                  </div>

                  {/* Placar */}
                  <div className="flex items-center justify-center gap-2 px-2">
                    {hasScore ? (
                      <>
                        <span className="text-2xl font-black text-text font-mono">{myScore}</span>
                        <span className="text-lg font-bold text-muted">×</span>
                        <span className="text-2xl font-black text-text font-mono">{oppScore}</span>
                      </>
                    ) : (
                      <span className="text-xl font-bold text-muted">×</span>
                    )}
                  </div>

                  {/* Adversário (à direita) */}
                  <div className="flex items-center gap-2 justify-end min-w-0">
                    <div className="min-w-0 text-right">
                      <p className="font-bold text-text text-sm truncate">{oppTeam.name}</p>
                      <p className="text-xs text-muted">{oppTeam.abbreviation}</p>
                    </div>
                    {oppTeam.logo && (
                      <img
                        src={oppTeam.logo}
                        alt={oppTeam.name}
                        className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                      />
                    )}
                  </div>
                </div>

                {/* Linha inferior: badge status + ações */}
                <div
                  className="flex items-center justify-between gap-3 pt-2 border-t border-border"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                    >
                      {status.label}
                    </span>
                    {match.winner && (
                      <span className="text-xs text-muted">
                        Vencedor:{' '}
                        <span className="text-success font-semibold">
                          {match.winner.name}
                        </span>
                      </span>
                    )}
                    {match.is_draw && match.status === 'FINISHED' && (
                      <span className="text-xs text-warning font-semibold">Empate</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {canReport && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setReportingMatch(match)}
                      >
                        Reportar Resultado
                      </Button>
                    )}
                    <button
                      onClick={() => router.push(`/matches/${match.id}`)}
                      className="text-muted hover:text-text transition-colors flex-shrink-0"
                      aria-label="Ver detalhes da partida"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

              </div>
            </Card>
            </div>
          );
        })}
      </div>

      {/* ── Modal: Reportar Resultado ─────────────────────────────────────────── */}
      {reportingMatch && (
        <MatchReportModal
          match={reportingMatch}
          isOpen={true}
          onClose={() => setReportingMatch(null)}
        />
      )}
    </div>
  );
}
