import { Trophy } from 'lucide-react';
import type { CompetitiveRankingPlayerRow } from '@/types';
import { PodiumCard } from './PodiumCard';

interface RankingPodiumProps {
  rows: CompetitiveRankingPlayerRow[];
  /** Exibe o cabeçalho interno "Pódio do ciclo". Desligue quando o container já tiver título. */
  showHeader?: boolean;
}

export function RankingPodium({ rows, showHeader = true }: RankingPodiumProps) {
  const [first, second, third] = rows.slice(0, 3);
  if (!first) return null;

  return (
    <section className="space-y-3">
      {showHeader && (
        <header className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-gold" />
          <h2 className="text-base font-bold text-text md:text-lg">Pódio do ciclo</h2>
          <span className="text-xs text-muted2">— os melhores do ranking geral</span>
        </header>
      )}

      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
        <div className="order-2 sm:order-1">{second && <PodiumCard player={second} emphasis="second" />}</div>
        <div className="order-1 sm:order-2">{first && <PodiumCard player={first} emphasis="lead" />}</div>
        <div className="order-3">{third && <PodiumCard player={third} emphasis="third" />}</div>
      </div>
    </section>
  );
}
