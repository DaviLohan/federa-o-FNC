'use client';

import Link from 'next/link';
import { Shield, MapPin, Hash } from 'lucide-react';
import type { PlayerProfilePayload } from '@/types';
import { PlayerAvatar } from '@/components/statistics/PlayerAvatar';

interface Props {
  player: PlayerProfilePayload['player'];
}

export function PlayerProfileHeader({ player }: Props) {
  const positions = [
    player.primary_position_label || player.primary_position,
    player.secondary_position_label || player.secondary_position,
  ].filter(Boolean) as string[];

  return (
    <section className="relative overflow-hidden rounded-3xl border border-stroke bg-panel">
      <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent" />
      <div className="relative flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-center sm:gap-6">
        <PlayerAvatar name={player.player_name} avatar={player.avatar} size="xl" ring={false} />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-2xl font-bold text-text sm:text-3xl">{player.player_name}</h1>
            {player.shirt_number != null && (
              <span className="inline-flex items-center gap-0.5 rounded-lg border border-stroke bg-panel2 px-2 py-0.5 font-mono text-sm font-bold text-gold">
                <Hash className="h-3 w-3" />
                {player.shirt_number}
              </span>
            )}
          </div>

          {player.gamer_tag && (
            <p className="mt-1 font-mono text-sm text-muted2">@{player.gamer_tag}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {positions.map((pos) => (
              <span
                key={pos}
                className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold"
              >
                {pos}
              </span>
            ))}
            {player.team && (
              <Link
                href={`/teams/${player.team.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-stroke bg-panel2 px-3 py-1 text-xs font-semibold text-text transition-colors hover:border-gold/40 hover:text-gold"
              >
                <Shield className="h-3.5 w-3.5" />
                {player.team.name}
              </Link>
            )}
            {player.country && (
              <span className="inline-flex items-center gap-1 text-xs text-muted2">
                <MapPin className="h-3.5 w-3.5" />
                {player.country}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
