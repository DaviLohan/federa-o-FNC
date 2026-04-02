'use client';

import { Button } from '@/components/shared/ui';
import type { Match } from '@/types';
import {
  Gamepad2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportStatusBarProps {
  match: Match;
  canReport: boolean;
  canContest: boolean;
  onReportEA: () => void;
  onReportManual: () => void;
  onContest: () => void;
}

// ─── Status Config ────────────────────────────────────────────────────────────

const reportStatusConfig: Record<
  string,
  { icon: typeof CheckCircle2; label: string; className: string } | null
> = {
  PENDING: { icon: Clock, label: 'Aguardando agendamento', className: 'text-muted2' },
  SCHEDULED: { icon: Gamepad2, label: 'Reportar resultado da partida', className: 'text-brand' },
  IN_PROGRESS: { icon: Gamepad2, label: 'Partida em andamento', className: 'text-brand' },
  FINISHED: { icon: CheckCircle2, label: 'Resultado confirmado', className: 'text-success' },
  CONTESTED: { icon: AlertTriangle, label: 'Resultado contestado', className: 'text-warning' },
  CANCELLED: { icon: XCircle, label: 'Partida cancelada', className: 'text-error' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportStatusBar({
  match,
  canReport,
  canContest,
  onReportEA,
  onReportManual,
  onContest,
}: ReportStatusBarProps) {
  const hasReportActions =
    canReport && (match.status === 'SCHEDULED' || match.status === 'IN_PROGRESS');
  const hasContestActions =
    canContest && (match.status === 'FINISHED' || match.status === 'CONTESTED');

  // Only render if there are actions or a meaningful status to show
  if (!hasReportActions && !hasContestActions) return null;

  const statusInfo = reportStatusConfig[match.status];
  const StatusIcon = statusInfo?.icon || Clock;

  return (
    <div className="px-4 md:px-6 py-3 border-t border-stroke bg-panel2/50 flex items-center justify-between gap-3 flex-wrap">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 shrink-0 ${statusInfo?.className || 'text-muted2'}`} />
        <span className={`text-xs font-medium ${statusInfo?.className || 'text-muted2'}`}>
          {statusInfo?.label || match.status}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasReportActions && (
          <>
            <Button variant="primary" size="sm" onClick={onReportEA}>
              <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
              Reportar EA
            </Button>
            {match.status === 'SCHEDULED' && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted2"
                onClick={onReportManual}
              >
                Manual
              </Button>
            )}
          </>
        )}
        {hasContestActions && (
          <Button
            variant="ghost"
            size="sm"
            className="text-warning border-warning/30 hover:bg-warning/10"
            onClick={onContest}
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            Contestar
          </Button>
        )}
      </div>
    </div>
  );
}
