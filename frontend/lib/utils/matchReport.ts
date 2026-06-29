import {
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Gamepad2,
  type LucideIcon,
} from 'lucide-react';
import type { Match } from '@/types';

export type ReportTone = 'success' | 'warning' | 'error' | 'brand' | 'muted';

export interface ReportState {
  label: string;
  tone: ReportTone;
  icon: LucideIcon;
}

/**
 * Deriva o estado de report de uma partida a partir dos campos já expostos pela API
 * (status, has_report, report_status, irregularity_flag, match_result_confirmed).
 * Centraliza a lógica usada pelo ReportStatusBar e pelo MatchSummaryHeader.
 */
export function getReportState(match: Match): ReportState {
  const hasReport = match.has_report ?? !!match.report;
  const reportStatus = match.report_status ?? match.report?.status ?? null;

  if (match.status === 'CANCELLED') {
    return { label: 'Partida cancelada', tone: 'error', icon: XCircle };
  }

  if (match.status === 'CONTESTED') {
    return { label: 'Resultado contestado', tone: 'warning', icon: AlertTriangle };
  }

  if (match.status === 'FINISHED' && match.irregularity_flag && match.match_result_confirmed) {
    return { label: 'Confirmado com irregularidades', tone: 'warning', icon: AlertTriangle };
  }

  if (reportStatus === 'APPROVED' || (match.status === 'FINISHED' && match.match_result_confirmed)) {
    return { label: 'Report enviado', tone: 'success', icon: CheckCircle2 };
  }

  if (hasReport && (reportStatus === 'PENDING' || reportStatus === 'SUBMITTED')) {
    return { label: 'Aguardando validação', tone: 'warning', icon: Clock };
  }

  if (match.status === 'FINISHED') {
    return hasReport
      ? { label: 'Report enviado', tone: 'success', icon: CheckCircle2 }
      : { label: 'Aguardando reporte', tone: 'warning', icon: Clock };
  }

  if (match.status === 'IN_PROGRESS') {
    return { label: 'Partida em andamento', tone: 'brand', icon: Gamepad2 };
  }

  if (match.status === 'SCHEDULED') {
    return { label: 'Aguardando início', tone: 'muted', icon: Clock };
  }

  // PENDING / demais estados pré-partida → ainda indisponível para report.
  return { label: 'Indisponível', tone: 'muted', icon: Clock };
}

/** Classes Tailwind por tom — texto/ícone. */
export const REPORT_TONE_TEXT: Record<ReportTone, string> = {
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  brand: 'text-brand',
  muted: 'text-muted2',
};

/** Classes Tailwind por tom — chip (borda + fundo + texto). */
export const REPORT_TONE_CHIP: Record<ReportTone, string> = {
  success: 'text-success border-success/30 bg-success/10',
  warning: 'text-warning border-warning/30 bg-warning/10',
  error: 'text-error border-error/30 bg-error/10',
  brand: 'text-brand border-brand/30 bg-brand/10',
  muted: 'text-muted2 border-stroke bg-panel2',
};
