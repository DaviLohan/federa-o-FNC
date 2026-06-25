'use client';

import { useMemo } from 'react';
import { ChevronDown, Users2 } from 'lucide-react';
import type { CompetitiveRankingPlayerRow, PlayerTier } from '@/types';
import { TIER_STYLES } from './tierStyles';

export interface RankingFilterState {
  tier: PlayerTier | 'ALL';
  team: string | 'ALL';
  range: 'ALL' | 3 | 10 | 25;
}

export const DEFAULT_RANKING_FILTERS: RankingFilterState = { tier: 'ALL', team: 'ALL', range: 'ALL' };

export function applyRankingFilters(
  rows: CompetitiveRankingPlayerRow[],
  f: RankingFilterState,
): CompetitiveRankingPlayerRow[] {
  return rows.filter((r) => {
    if (f.tier !== 'ALL' && r.tier !== f.tier) return false;
    if (f.team !== 'ALL' && r.teamName !== f.team) return false;
    if (f.range !== 'ALL' && r.generalPosition > f.range) return false;
    return true;
  });
}

const TIERS: PlayerTier[] = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
const RANGES: { label: string; value: RankingFilterState['range'] }[] = [
  { label: 'Todos', value: 'ALL' },
  { label: 'Top 3', value: 3 },
  { label: 'Top 10', value: 10 },
  { label: 'Top 25', value: 25 },
];

interface Props {
  rows: CompetitiveRankingPlayerRow[];
  value: RankingFilterState;
  onChange: (next: RankingFilterState) => void;
  resultCount: number;
}

export function RankingFilters({ rows, value, onChange, resultCount }: Props) {
  const teams = useMemo(
    () => Array.from(new Set(rows.map((r) => r.teamName))).sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-stroke bg-panel/70 p-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Divisão */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip active={value.tier === 'ALL'} onClick={() => onChange({ ...value, tier: 'ALL' })}>
          Todas
        </Chip>
        {TIERS.map((t) => {
          const s = TIER_STYLES[t];
          const active = value.tier === t;
          return (
            <button
              key={t}
              onClick={() => onChange({ ...value, tier: active ? 'ALL' : t })}
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
                active ? `${s.border} ${s.bg} ${s.text}` : 'border-stroke bg-panel2/50 text-muted2 hover:text-text'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.solid }} />
              {s.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Faixa */}
        <div className="flex items-center gap-1 rounded-full border border-stroke bg-panel2/50 p-0.5">
          {RANGES.map((r) => (
            <button
              key={String(r.value)}
              onClick={() => onChange({ ...value, range: r.value })}
              className={`rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                value.range === r.value ? 'bg-gold/15 text-gold' : 'text-muted2 hover:text-text'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Time */}
        <label className="group relative inline-flex items-center">
          <span className="sr-only">Filtrar por time</span>
          <Users2 className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-muted2" aria-hidden />
          <select
            value={value.team}
            onChange={(e) => onChange({ ...value, team: e.target.value })}
            className="cursor-pointer appearance-none rounded-full border border-stroke bg-panel2/50 py-1.5 pl-8 pr-7 text-xs font-medium text-text outline-none transition-colors hover:border-gold/40 focus:border-gold/60"
          >
            <option value="ALL">Todos os times</option>
            {teams.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-muted2" aria-hidden />
        </label>

        <span className="font-mono text-[11px] text-muted2">{resultCount} result.</span>
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-all ${
        active ? 'border-gold/40 bg-gold/15 text-gold' : 'border-stroke bg-panel2/50 text-muted2 hover:text-text'
      }`}
    >
      {children}
    </button>
  );
}
