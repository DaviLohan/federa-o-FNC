import type { ReactElement } from 'react';
import { Crown, Medal, Trophy } from 'lucide-react';
import type { CompetitiveRankingPlayerRow } from '@/types';
import { RankBadge } from './RankBadge';

interface PodiumCardProps {
  player: CompetitiveRankingPlayerRow;
  emphasis?: 'lead' | 'second' | 'third';
}

const emphasisStyles: Record<NonNullable<PodiumCardProps['emphasis']>, string> = {
  lead:
    'border-gold/50 bg-gradient-to-br from-gold/15 via-panel to-panel shadow-[0_0_40px_rgba(255,214,102,0.15)] md:translate-y-[-12px] md:py-7',
  second: 'border-stroke bg-gradient-to-br from-panel2/80 via-panel to-panel',
  third: 'border-warning/30 bg-gradient-to-br from-warning/10 via-panel to-panel',
};

const positionLabel: Record<NonNullable<PodiumCardProps['emphasis']>, string> = {
  lead: 'Líder Geral',
  second: 'Top 2',
  third: 'Top 3',
};

const positionIcon: Record<NonNullable<PodiumCardProps['emphasis']>, ReactElement> = {
  lead: <Crown className="h-4 w-4" />,
  second: <Medal className="h-4 w-4" />,
  third: <Trophy className="h-4 w-4" />,
};

const positionAccent: Record<NonNullable<PodiumCardProps['emphasis']>, string> = {
  lead: 'text-gold',
  second: 'text-muted',
  third: 'text-warning',
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '—';
}

export function PodiumCard({ player, emphasis = 'lead' }: PodiumCardProps) {
  return (
    <article
      className={`relative overflow-hidden rounded-3xl border p-5 transition-all hover:-translate-y-0.5 ${emphasisStyles[emphasis]}`}
    >
      <div className="absolute -top-12 -right-10 h-32 w-32 rounded-full bg-gold/5 blur-3xl" aria-hidden />
      <div className="relative flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border border-current/30 bg-current/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${positionAccent[emphasis]}`}
        >
          {positionIcon[emphasis]}
          {positionLabel[emphasis]}
        </span>
        <RankBadge tier={player.tier} size="sm" />
      </div>

      <div className="relative mt-5 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-stroke bg-panel2/80 text-base font-mono font-bold text-text">
          {getInitials(player.playerName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-text md:text-lg">{player.playerName}</p>
          <p className="truncate text-xs text-muted2">{player.teamName}</p>
        </div>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted2">Score</p>
          <p className={`font-mono text-3xl font-bold leading-none ${emphasis === 'lead' ? 'text-gold' : 'text-text'}`}>
            {player.score.toFixed(2)}
          </p>
        </div>
        <p className="text-right text-[11px] text-muted2">
          Pos. <span className="font-mono text-text">#{player.generalPosition}</span>
        </p>
      </div>

      <div className="relative mt-4 grid grid-cols-4 gap-1 rounded-xl border border-stroke/60 bg-panel2/40 p-2 text-center text-[11px]">
        <div>
          <p className="font-mono font-bold text-text">{player.averageRating.toFixed(2)}</p>
          <p className="text-[10px] text-muted2">Nota</p>
        </div>
        <div>
          <p className="font-mono font-bold text-text">{player.goals}</p>
          <p className="text-[10px] text-muted2">Gols</p>
        </div>
        <div>
          <p className="font-mono font-bold text-text">{player.assists}</p>
          <p className="text-[10px] text-muted2">Assist.</p>
        </div>
        <div>
          <p className="font-mono font-bold text-text">{player.matchesPlayed}</p>
          <p className="text-[10px] text-muted2">Jogos</p>
        </div>
      </div>
    </article>
  );
}
