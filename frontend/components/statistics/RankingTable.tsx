'use client';

import { useMemo, useState } from 'react';
import { ListOrdered, SearchX } from 'lucide-react';
import type { CompetitiveRankingPlayerRow } from '@/types';
import { RankingPlayerRow } from './RankingPlayerRow';
import {
  RankingFilters, applyRankingFilters, DEFAULT_RANKING_FILTERS, type RankingFilterState,
} from './RankingFilters';

interface RankingTableProps {
  rows: CompetitiveRankingPlayerRow[];
}

const MAX_ROWS = 50;

export function RankingTable({ rows }: RankingTableProps) {
  const [filters, setFilters] = useState<RankingFilterState>(DEFAULT_RANKING_FILTERS);
  const isDefault = filters.tier === 'ALL' && filters.team === 'ALL' && filters.range === 'ALL';

  const filtered = useMemo(() => applyRankingFilters(rows, filters), [rows, filters]);
  // Sem filtros, o top 3 já está no pódio — evita duplicação.
  const display = useMemo(
    () => (isDefault ? filtered.slice(3) : filtered).slice(0, MAX_ROWS),
    [filtered, isDefault],
  );

  if (rows.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-center gap-2">
        <ListOrdered className="h-4 w-4 text-gold" />
        <h2 className="text-base font-bold text-text md:text-lg">Classificação geral</h2>
        <span className="text-xs text-muted2">— {rows.length} jogadores no ciclo</span>
      </header>

      <RankingFilters rows={rows} value={filters} onChange={setFilters} resultCount={filtered.length} />

      {display.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-stroke bg-panel/40 p-8 text-center">
          <SearchX className="h-7 w-7 text-muted2" />
          <p className="text-sm font-semibold text-text">Nenhum jogador encontrado</p>
          <p className="text-xs text-muted2">Ajuste os filtros para ver mais resultados.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {display.map((row) => (
            <RankingPlayerRow key={row.playerId} row={row} />
          ))}
        </div>
      )}
    </section>
  );
}
