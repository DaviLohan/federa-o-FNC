'use client';

import { Button } from '@/components/shared/ui';
import { MatchScorecard } from './MatchScorecard';
import { ReportStatusBar } from './ReportStatusBar';
import type { Match } from '@/types';
import { Eye, Play } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchCardProps {
  match: Match;
  onDetails: (match: Match) => void;
  onStart: (match: Match) => void;
  onReportEA: (match: Match) => void;
  onReportManual: (match: Match) => void;
  onContest: (match: Match) => void;
}

// ─── Status border accent ─────────────────────────────────────────────────────

const statusBorderAccent: Record<string, string> = {
  SCHEDULED: 'hover:border-brand/40',
  IN_PROGRESS: 'border-brand/50 hover:border-brand/70',
  FINISHED: 'hover:border-success/40',
  CONTESTED: 'border-warning/50 hover:border-warning/70',
  CANCELLED: 'opacity-60',
  PENDING: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchCard({
  match,
  onDetails,
  onStart,
  onReportEA,
  onReportManual,
  onContest,
}: MatchCardProps) {
  const borderAccent = statusBorderAccent[match.status] ?? '';

  // canReport: partida pode ter resultado reportado (SCHEDULED ou IN_PROGRESS)
  const canReport =
    match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS';

  // canContest: resultado pode ser contestado
  const canContest =
    match.status === 'FINISHED' || match.status === 'CONTESTED';

  // Reporte manual: somente IN_PROGRESS (conforme decisão do usuário)
  const handleReportManual = () => {
    if (match.status === 'IN_PROGRESS') {
      onReportManual(match);
    }
  };

  return (
    <div
      className={`rounded-2xl border border-stroke bg-panel transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${borderAccent}`}
    >
      {/* Linha de gradiente dourado no topo */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-gold/20 to-transparent" />

      {/* Scorecard principal */}
      <MatchScorecard match={match}>
        {/* ReportStatusBar como children — só renderiza se houver ações */}
        <ReportStatusBar
          match={match}
          canReport={canReport}
          canContest={canContest}
          onReportEA={() => onReportEA(match)}
          onReportManual={handleReportManual}
          onContest={() => onContest(match)}
        />
      </MatchScorecard>

      {/* Rodapé: ações secundárias */}
      <div className="px-4 md:px-6 py-3 border-t border-stroke/50 flex items-center justify-between gap-2 bg-panel2/30">
        {/* Info de campeonato/rodada */}
        <div className="text-xs text-muted2 truncate min-w-0">
          {match.championship ? (
            <span>
              {match.championship.name}
              {match.round_number ? ` · Rodada ${match.round_number}` : ''}
            </span>
          ) : (
            <span className="capitalize">
              {match.match_type === 'FRIENDLY'
                ? 'Amistoso'
                : match.match_type === 'PLAYOFF'
                ? 'Playoff'
                : match.match_type === 'FINAL'
                ? 'Final'
                : 'Campeonato'}
            </span>
          )}
        </div>

        {/* Botões de ação rápida */}
        <div className="flex items-center gap-2 shrink-0">
          {match.status === 'SCHEDULED' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-warning border-warning/20 hover:bg-warning/10 hover:border-warning/40"
              onClick={() => onStart(match)}
            >
              <Play className="w-3 h-3 mr-1" />
              Iniciar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-muted2 hover:text-text"
            onClick={() => onDetails(match)}
          >
            <Eye className="w-3 h-3 mr-1" />
            Detalhes
          </Button>
        </div>
      </div>
    </div>
  );
}
