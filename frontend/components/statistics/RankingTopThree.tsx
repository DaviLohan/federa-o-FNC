import { Medal, Trophy } from 'lucide-react';
import type { CompetitiveRankingPlayerRow } from '@/types';

interface RankingTopThreeProps {
  rows: CompetitiveRankingPlayerRow[];
}

function medalColor(position: number) {
  if (position === 1) return 'text-gold border-gold/40 bg-gold/10';
  if (position === 2) return 'text-muted border-stroke bg-panel2/60';
  return 'text-warning border-warning/30 bg-warning/10';
}

export function RankingTopThree({ rows }: RankingTopThreeProps) {
  const topThree = rows.slice(0, 3);
  if (topThree.length === 0) return null;

  return (
    <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {topThree.map((player) => (
        <article
          key={player.playerId}
          className={`rounded-2xl border p-4 ${medalColor(player.generalPosition)} ${player.generalPosition === 1 ? 'shadow-[0_0_30px_rgba(255,214,102,0.12)]' : ''}`}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              {player.generalPosition === 1 ? <Trophy className="h-4 w-4" /> : <Medal className="h-4 w-4" />}
              Top {player.generalPosition}
            </div>
            <span className="text-xs text-muted2">{player.tierDisplay}</span>
          </div>
          <p className="text-lg font-bold text-text">{player.playerName}</p>
          <p className="text-xs text-muted2">{player.teamName}</p>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-xs text-muted2">Rank Score</p>
              <p className="text-xl font-mono font-bold text-gold">{player.score.toFixed(2)}</p>
            </div>
            <p className="text-xs text-muted2">Nota {player.averageRating.toFixed(2)} • G {player.goals} • A {player.assists}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
