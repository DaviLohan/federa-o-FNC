'use client';

import { Button } from '@/components/shared/ui';
import type { Match } from '@/types';
import { getReportState, REPORT_TONE_TEXT } from '@/lib/utils/matchReport';
import { Gamepad2, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportStatusBarProps {
  match: Match;
  canReport: boolean;
  canContest: boolean;
  onReportEA: () => void;
  onReportManual: () => void;
  onContest: () => void;
}

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
    canReport && (match.status === 'IN_PROGRESS' || match.status === 'CONTESTED' || match.status === 'FINISHED');
  const hasContestActions =
    canContest && (match.status === 'FINISHED' || match.status === 'CONTESTED');

  // Only render if there are actions or a meaningful status to show
  if (!hasReportActions && !hasContestActions && match.status !== 'SCHEDULED') return null;

  const state = getReportState(match);
  const StatusIcon = state.icon;
  const toneText = REPORT_TONE_TEXT[state.tone];

  return (
    <div className="px-4 md:px-6 py-3 border-t border-stroke bg-panel2/50 flex items-center justify-between gap-3 flex-wrap">
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 shrink-0 ${toneText}`} />
        <span className={`text-xs font-medium ${toneText}`}>{state.label}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {hasReportActions && (
          <>
            <Button variant="primary" size="sm" onClick={onReportEA}>
              <Gamepad2 className="w-3.5 h-3.5 mr-1.5" />
              Reportar EA
            </Button>
            {match.status === 'IN_PROGRESS' && (
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
