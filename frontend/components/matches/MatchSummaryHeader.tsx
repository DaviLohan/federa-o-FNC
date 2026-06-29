'use client';

import type { Match } from '@/types';
import { formatDateShort, formatTime } from '@/lib/utils/date';
import { getReportState, REPORT_TONE_CHIP } from '@/lib/utils/matchReport';
import { Trophy, CalendarClock, Shield } from 'lucide-react';

interface MatchSummaryHeaderProps {
  match: Match;
  /** Exibe o chip de status do report (default: true). */
  showStatus?: boolean;
  /** Exibe o placar atual entre os times (default: false). */
  showScore?: boolean;
  className?: string;
}

function TeamCrest({ name, logo }: { name: string; logo?: string }) {
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={logo} alt={name} className="h-10 w-10 shrink-0 rounded-lg object-cover sm:h-12 sm:w-12" />;
  }
  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-stroke bg-panel2 text-muted2 sm:h-12 sm:w-12">
      <Shield className="h-5 w-5" />
    </span>
  );
}

/**
 * Cabeçalho-resumo da partida: mandante × visitante, campeonato · rodada · data,
 * e chip de status do report. Reutilizado nos modais de report (EA e manual).
 */
export function MatchSummaryHeader({
  match,
  showStatus = true,
  showScore = false,
  className = '',
}: MatchSummaryHeaderProps) {
  const state = getReportState(match);
  const StateIcon = state.icon;

  const competition = match.championship
    ? match.championship.name
    : match.match_type === 'FRIENDLY'
    ? 'Amistoso'
    : match.match_type === 'PLAYOFF'
    ? 'Playoff'
    : match.match_type === 'FINAL'
    ? 'Final'
    : 'Campeonato';

  return (
    <div className={`rounded-xl border border-stroke bg-panel2 p-4 ${className}`}>
      {/* Mandante × Visitante */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-4">
        {/* Mandante */}
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          <div className="min-w-0 text-right">
            <h3 className="truncate font-bold text-text">{match.home_team.name}</h3>
            <p className="text-xs text-muted2">{match.home_team.abbreviation}</p>
          </div>
          <TeamCrest name={match.home_team.name} logo={match.home_team.logo} />
        </div>

        {/* Centro: placar ou × */}
        <div className="flex shrink-0 items-center justify-center">
          {showScore ? (
            <span className="font-heading text-2xl font-extrabold tabular-nums text-text sm:text-3xl">
              {match.home_score}
              <span className="mx-1.5 text-muted2">×</span>
              {match.away_score}
            </span>
          ) : (
            <span className="text-xl font-bold text-muted2">×</span>
          )}
        </div>

        {/* Visitante */}
        <div className="flex items-center justify-start gap-2 sm:gap-3">
          <TeamCrest name={match.away_team.name} logo={match.away_team.logo} />
          <div className="min-w-0 text-left">
            <h3 className="truncate font-bold text-text">{match.away_team.name}</h3>
            <p className="text-xs text-muted2">{match.away_team.abbreviation}</p>
          </div>
        </div>
      </div>

      {/* Meta: campeonato · rodada · data + chip de status */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-t border-stroke/60 pt-3 text-xs text-muted2">
        <span className="inline-flex items-center gap-1.5">
          <Trophy className="h-3.5 w-3.5 text-gold/70" />
          <span className="truncate">{competition}</span>
          {match.round_number ? <span className="text-muted2">· Rodada {match.round_number}</span> : null}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDateShort(match.scheduled_date)} · {formatTime(match.scheduled_date)}
        </span>
        {showStatus && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-medium ${REPORT_TONE_CHIP[state.tone]}`}
          >
            <StateIcon className="h-3.5 w-3.5" />
            {state.label}
          </span>
        )}
      </div>
    </div>
  );
}
