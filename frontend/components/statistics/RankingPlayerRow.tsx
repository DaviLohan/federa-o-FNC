import type { CompetitiveRankingPlayerRow } from '@/types';
import { PromotionBadge } from './PromotionBadge';
import { RankBadge } from './RankBadge';

interface RankingPlayerRowProps {
  row: CompetitiveRankingPlayerRow;
}

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '—';
}

export function RankingPlayerRow({ row }: RankingPlayerRowProps) {
  return (
    <article className="group rounded-xl border border-stroke/70 bg-panel2/40 p-3 transition-all hover:border-brand/40 hover:bg-panel2/70 md:hover:-translate-y-0.5">
      {/* Mobile */}
      <div className="flex items-start justify-between gap-3 md:hidden">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-panel font-mono text-xs font-bold text-brand">
            #{row.generalPosition}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{row.playerName}</p>
            <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <RankBadge tier={row.tier} />
              <PromotionBadge tier={row.tier} isPromotionZone={row.isPromotionZone} />
            </div>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-base font-bold text-gold">{row.score.toFixed(2)}</p>
          <p className="text-[10px] text-muted2">score</p>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1 text-center text-[11px] md:hidden">
        <Cell label="Nota" value={row.averageRating.toFixed(2)} />
        <Cell label="Gols" value={row.goals} />
        <Cell label="Assist." value={row.assists} />
        <Cell label="Jogos" value={row.matchesPlayed} />
      </div>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-12 md:items-center md:gap-3">
        <div className="col-span-1 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stroke bg-panel font-mono text-xs font-bold text-brand">
            #{row.generalPosition}
          </span>
        </div>
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-stroke bg-panel2/80 text-xs font-mono font-bold text-text">
            {getInitials(row.playerName)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-text">{row.playerName}</p>
            <p className="truncate text-[11px] text-muted2">{row.teamName}</p>
          </div>
        </div>
        <div className="col-span-2 flex flex-wrap items-center gap-1.5">
          <RankBadge tier={row.tier} />
          <PromotionBadge tier={row.tier} isPromotionZone={row.isPromotionZone} />
        </div>
        <div className="col-span-2 text-right">
          <p className="font-mono text-lg font-bold text-gold leading-none">{row.score.toFixed(2)}</p>
          <p className="text-[10px] text-muted2">score</p>
        </div>
        <div className="col-span-3 grid grid-cols-4 gap-1 text-center text-[11px]">
          <Cell label="Nota" value={row.averageRating.toFixed(2)} />
          <Cell label="Gols" value={row.goals} />
          <Cell label="Assist." value={row.assists} />
          <Cell label="Jogos" value={row.matchesPlayed} />
        </div>
      </div>
    </article>
  );
}

function Cell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-stroke/40 bg-panel/60 py-1">
      <p className="font-mono font-bold text-text">{value}</p>
      <p className="text-[10px] text-muted2">{label}</p>
    </div>
  );
}
