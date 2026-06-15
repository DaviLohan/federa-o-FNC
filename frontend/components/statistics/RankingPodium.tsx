import type { CompetitiveRankingPlayerRow } from '@/types';
import { PodiumCard } from './PodiumCard';

interface RankingPodiumProps {
  rows: CompetitiveRankingPlayerRow[];
}

export function RankingPodium({ rows }: RankingPodiumProps) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;

  const [first, second, third] = top;

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text md:text-lg">Pódio do ciclo</h2>
        <p className="text-xs text-muted2">Melhores jogadores do ranking geral</p>
      </header>

      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-3">
        <div className="order-2 md:order-1">{second && <PodiumCard player={second} emphasis="second" />}</div>
        <div className="order-1 md:order-2">{first && <PodiumCard player={first} emphasis="lead" />}</div>
        <div className="order-3 md:order-3">{third && <PodiumCard player={third} emphasis="third" />}</div>
      </div>
    </section>
  );
}
