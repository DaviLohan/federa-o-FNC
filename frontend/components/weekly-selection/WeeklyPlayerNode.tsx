'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { WeeklySelectionPlayer } from '@/types';
import { initials, formatRating } from './weeklyLayout';

interface WeeklyPlayerNodeProps {
  label: string;
  player: WeeklySelectionPlayer | null;
}

export function WeeklyPlayerNode({ label, player }: WeeklyPlayerNodeProps) {
  const isMvp = !!player?.is_mvp;

  const avatar = (
    <div className="relative">
      {/* anel/glow do MVP */}
      <div
        className={`relative flex h-11 w-11 items-center justify-center rounded-full border text-sm font-bold sm:h-14 sm:w-14 ${
          isMvp
            ? 'border-gold bg-gold/15 text-gold shadow-[0_0_18px_rgba(214,161,30,0.45)] animate-pulseGold'
            : 'border-white/15 bg-[#0b1118] text-text'
        }`}
      >
        <span className="font-mono">{player ? initials(player.player_name) : label}</span>

        {/* escudo do time */}
        {player?.team_logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.team_logo}
            alt={player.team_name}
            className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-black/40 bg-panel object-cover sm:h-6 sm:w-6"
          />
        )}

        {/* coroa do MVP */}
        {isMvp && (
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold">
            <Crown className="h-3.5 w-3.5 fill-gold" />
          </span>
        )}
      </div>

      {/* chip de nota */}
      <span
        className={`absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none ${
          isMvp ? 'border-gold/50 bg-gold text-black' : 'border-stroke bg-panel text-gold'
        }`}
      >
        {formatRating(player?.average_rating)}
      </span>
    </div>
  );

  return (
    <div className="flex w-16 flex-col items-center gap-2 text-center sm:w-20">
      {player?.player_id ? (
        <Link href={`/players/${player.player_id}`} className="transition-transform hover:scale-105">
          {avatar}
        </Link>
      ) : (
        avatar
      )}

      <div className="w-full">
        <p className="truncate text-[11px] font-semibold leading-tight text-text">
          {player?.player_name ?? '—'}
        </p>
        <p className="truncate text-[9px] uppercase tracking-wide text-muted2">
          {player ? player.position : label}
        </p>
      </div>
    </div>
  );
}
