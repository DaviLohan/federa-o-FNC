'use client';

import Link from 'next/link';
import type { Match } from '@/types';
import { formatDate, formatTime } from '@/lib/utils/date';

function TeamSide({ team, align }: { team: Match['home_team']; align: 'left' | 'right' }) {
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      {team?.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={team.logo} alt={team.name} className="h-6 w-6 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-stroke bg-panel2 font-mono text-[10px] text-muted2">
          {team?.abbreviation?.slice(0, 3) || '—'}
        </span>
      )}
      <span className="truncate text-xs font-medium text-text">{team?.abbreviation || team?.name || '—'}</span>
    </div>
  );
}

export function MatchRow({ match }: { match: Match }) {
  const finished = match.status === 'FINISHED';

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center gap-2 rounded-xl border border-stroke bg-panel2/50 px-3 py-2 transition-colors hover:border-gold/30 hover:bg-panel2"
    >
      <TeamSide team={match.home_team} align="left" />
      <div className="shrink-0 px-1 text-center">
        {finished ? (
          <span className="font-mono text-sm font-bold text-gold tabular-nums">
            {match.home_score} <span className="text-muted2">-</span> {match.away_score}
          </span>
        ) : (
          <div className="leading-tight">
            <p className="font-mono text-[11px] font-semibold text-text">{formatTime(match.scheduled_date)}</p>
            <p className="text-[9px] text-muted2">{formatDate(match.scheduled_date)}</p>
          </div>
        )}
      </div>
      <TeamSide team={match.away_team} align="right" />
    </Link>
  );
}
