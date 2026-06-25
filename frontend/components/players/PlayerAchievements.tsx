'use client';

import { Award, Crown, Trophy, Medal } from 'lucide-react';
import type { PlayerAchievement } from '@/types';

interface Props {
  achievements: PlayerAchievement[];
}

const ICONS: Record<PlayerAchievement['type'], React.ReactNode> = {
  golden_boot: <Trophy className="h-5 w-5" />,
  best_player: <Crown className="h-5 w-5" />,
  champion: <Medal className="h-5 w-5" />,
  runner_up: <Award className="h-5 w-5" />,
};

export function PlayerAchievements({ achievements }: Props) {
  return (
    <div className="rounded-2xl border border-stroke bg-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-bold text-text">Conquistas</h3>
      </div>
      {achievements.length === 0 ? (
        <p className="text-xs text-muted2">
          Nenhuma conquista registrada ainda. Prêmios e títulos aparecem ao fim de cada temporada.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {achievements.map((a, i) => (
            <div
              key={`${a.type}-${a.season}-${i}`}
              className="flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/5 p-3"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 text-gold">
                {ICONS[a.type]}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text">
                  {a.label}
                  {a.count && a.count > 1 ? ` ×${a.count}` : ''}
                </p>
                <p className="font-mono text-xs text-muted2">{a.season}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
