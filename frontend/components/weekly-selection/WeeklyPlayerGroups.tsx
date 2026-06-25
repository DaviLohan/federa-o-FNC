'use client';

import type { WeeklySelectionPayload, WeeklySelectionPlayer } from '@/types';
import { WeeklyPlayerCard } from './WeeklyPlayerCard';

const GROUPS: { key: keyof WeeklySelectionPayload['lineup']; label: string }[] = [
  { key: 'GK', label: 'Goleiro' },
  { key: 'DEF', label: 'Defesa' },
  { key: 'MID', label: 'Meio-campo' },
  { key: 'ATT', label: 'Ataque' },
];

export function WeeklyPlayerGroups({ lineup }: { lineup: WeeklySelectionPayload['lineup'] }) {
  return (
    <div className="space-y-5">
      {GROUPS.map(({ key, label }) => {
        const players = (lineup[key] ?? []) as WeeklySelectionPlayer[];
        if (players.length === 0) return null;

        return (
          <section key={key} className="space-y-3">
            {/* Cabeçalho da seção */}
            <div className="flex items-center gap-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-widest text-gold">
                {label}
              </h3>
              <span className="rounded-full border border-stroke bg-panel2 px-2 py-0.5 font-mono text-[10px] font-semibold text-muted2">
                {players.length}
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-gold/25 to-transparent" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {players.map((player) => (
                <WeeklyPlayerCard key={`${player.team_id}-${player.player_name}`} player={player} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
