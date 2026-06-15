import type { CompetitiveRankingPlayerRow, PlayerTier } from '@/types';
import { PromotionBadge } from './PromotionBadge';

interface TierPlayerItemProps {
  row: CompetitiveRankingPlayerRow;
  tier: PlayerTier;
}

const positionAccent: Record<number, string> = {
  1: 'border-gold/50 bg-gold/15 text-gold',
  2: 'border-stroke bg-panel2/70 text-text',
  3: 'border-warning/40 bg-warning/15 text-warning',
};

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '—';
}

export function TierPlayerItem({ row, tier }: TierPlayerItemProps) {
  const positionStyle = positionAccent[row.position] ?? 'border-stroke/60 bg-panel/60 text-muted';

  return (
    <article className="group rounded-xl border border-stroke/60 bg-panel/80 p-3 transition-all hover:border-brand/30 hover:bg-panel">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border font-mono text-xs font-bold ${positionStyle}`}
        >
          #{row.position}
        </span>

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="hidden h-9 w-9 items-center justify-center rounded-lg border border-stroke bg-panel2/80 text-[11px] font-mono font-bold text-text sm:inline-flex">
            {getInitials(row.playerName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{row.playerName}</p>
            <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-mono text-base font-bold text-gold leading-none">{row.score.toFixed(2)}</p>
          <p className="text-[10px] text-muted2">score</p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted2">
        <p className="font-mono">
          Nota <span className="text-text">{row.averageRating.toFixed(2)}</span> • G{' '}
          <span className="text-text">{row.goals}</span> • A <span className="text-text">{row.assists}</span> • J{' '}
          <span className="text-text">{row.matchesPlayed}</span>
        </p>
        <PromotionBadge tier={tier} isPromotionZone={row.isPromotionZone} />
      </div>
    </article>
  );
}
