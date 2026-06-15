'use client';

import { Button } from '@/components/shared/ui';
import { AlertTriangle, CheckCircle2, Eye, Gamepad2, ShieldAlert } from 'lucide-react';
import type { Match, Team } from '@/types';

export interface BracketTieView {
  id: string;
  roundName: string;
  teamA?: Team;
  teamB?: Team;
  firstLeg?: Match;
  secondLeg?: Match;
  winnerId?: number;
  aggregate?: { home: number; away: number; label: string };
  aggregateReady?: boolean;
  aggregatePartial?: boolean;
  firstLegLabel?: string;
  secondLegLabel?: string;
  statusLabel: string;
  statusTone: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  canReport: boolean;
  canOpenReport: boolean;
  reportMatch?: Match;
}

interface BracketMatchCardProps {
  tie: BracketTieView;
  compact?: boolean;
  onReportEA?: (match: Match) => void;
  onViewMatch?: (match: Match) => void;
}

function TeamRow({ team, score, winner, compact }: { team?: Team; score?: number; winner: boolean; compact: boolean }) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl ${compact ? 'p-2.5' : 'p-3'} ${winner ? 'border border-green/40 bg-green/10' : 'border border-border bg-surface1/50'}`}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {team?.logo ? (
          <img src={team.logo} alt={team.name} className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-lg object-cover ring-1 ring-border`} />
        ) : (
          <div className={`${compact ? 'h-7 w-7' : 'h-8 w-8'} rounded-lg border border-border bg-surface2 text-center text-xs leading-7 text-muted2`}>?</div>
        )}
        <span className={`truncate ${winner ? 'font-semibold text-green' : team ? 'text-text' : 'italic text-muted2'}`}>{team?.name || 'A definir'}</span>
      </div>
      {typeof score === 'number' && <span className="ml-3 font-mono text-lg font-bold text-text">{score}</span>}
    </div>
  );
}

export function BracketMatchCard({ tie, compact = false, onReportEA, onViewMatch }: BracketMatchCardProps) {
  const tone = {
    success: 'border-green/35 bg-green/10 text-green',
    warning: 'border-yellow-500/35 bg-yellow-500/10 text-yellow-300',
    danger: 'border-red-500/35 bg-red-500/10 text-red-300',
    info: 'border-blue-500/35 bg-blue-500/10 text-blue-300',
    neutral: 'border-border bg-surface2/50 text-muted2',
  }[tie.statusTone];

  const ida = tie.firstLeg;
  const volta = tie.secondLeg;
  const mainMatch = volta || ida;

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br from-[#0B0F16] to-[#101828] ${compact ? 'p-3' : 'p-4'} border-border shadow-lg shadow-black/30`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gold">{tie.roundName}</p>
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}>{tie.statusLabel}</span>
      </div>

      <div className="space-y-2">
        <TeamRow team={tie.teamA} compact={compact} winner={tie.winnerId === tie.teamA?.id} />
        <TeamRow team={tie.teamB} compact={compact} winner={tie.winnerId === tie.teamB?.id} />
      </div>

      <div className="mt-3 space-y-2 rounded-xl border border-border bg-black/20 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted2">Ida</span>
          <span className="font-mono text-text">{tie.firstLegLabel || 'Aguardando partida'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted2">Volta</span>
          <span className="font-mono text-text">{tie.secondLegLabel || (ida ? 'Jogo único' : 'Aguardando partida')}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted2">Agregado</span>
          <span className="font-mono font-semibold text-gold">
            {tie.aggregateReady ? tie.aggregate?.label : (tie.aggregatePartial ? 'Aguardando volta' : 'Aguardando resultados')}
          </span>
        </div>
      </div>

      {tie.winnerId && (
        <div className="mt-2 flex items-center gap-2 text-xs text-green">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Vencedor definido</span>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {tie.canReport && tie.canOpenReport && tie.reportMatch && onReportEA && (
          <Button size="sm" variant="primary" onClick={() => onReportEA(tie.reportMatch!)}>
            <Gamepad2 className="mr-1.5 h-3.5 w-3.5" />
            Reportar Resultado
          </Button>
        )}
        {mainMatch && onViewMatch && (
          <Button size="sm" variant="ghost" onClick={() => onViewMatch(mainMatch)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Ver Partida
          </Button>
        )}
        {tie.statusTone === 'danger' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-500/35 bg-red-500/10 px-2 py-1 text-[11px] text-red-300">
            <ShieldAlert className="h-3 w-3" /> Contestação aberta
          </span>
        )}
        {!tie.canReport && tie.reportMatch && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface2/60 px-2 py-1 text-[11px] text-muted2">
            <AlertTriangle className="h-3 w-3" /> Sem permissão para reportar
          </span>
        )}
      </div>
    </div>
  );
}
