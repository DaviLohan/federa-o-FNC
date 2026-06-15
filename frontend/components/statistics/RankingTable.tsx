import type { CompetitiveRankingPlayerRow } from '@/types';
import { RankingPlayerRow } from './RankingPlayerRow';

interface RankingTableProps {
  rows: CompetitiveRankingPlayerRow[];
}

export function RankingTable({ rows }: RankingTableProps) {
  const list = rows.slice(3, 30);
  if (list.length === 0) return null;

  return (
    <section className="space-y-3">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text md:text-lg">Classificação geral</h2>
        <p className="text-xs text-muted2">Posições 4 a {3 + list.length}</p>
      </header>

      <div className="rounded-2xl border border-stroke bg-panel/90 p-3 md:p-4">
        <div className="mb-2 hidden grid-cols-12 gap-3 px-3 text-[11px] uppercase tracking-wide text-muted2 md:grid">
          <span className="col-span-1">Pos</span>
          <span className="col-span-4">Jogador</span>
          <span className="col-span-2">Rank</span>
          <span className="col-span-2 text-right">Score</span>
          <span className="col-span-3 text-right">Estatísticas</span>
        </div>

        <div className="space-y-2">
          {list.map((row) => (
            <RankingPlayerRow key={row.playerId} row={row} />
          ))}
        </div>
      </div>
    </section>
  );
}
