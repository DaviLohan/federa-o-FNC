'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import type { WeeklySelectionPlayer } from '@/types';
import { Card, Badge } from '@/components/shared/ui';
import { initials, formatRating } from './weeklyLayout';

export function WeeklyPlayerCard({ player }: { player: WeeklySelectionPlayer }) {
  const isGk = (player.position || '').toUpperCase() === 'GK';
  const lastStat: [string, string] = isGk
    ? ['Defesas', String(player.saves)]
    : ['Partidas', String(player.matches_played)];

  const stats: [string, string][] = [
    ['Nota', formatRating(player.average_rating)],
    ['Gols', String(player.goals)],
    ['Assist.', String(player.assists)],
    lastStat,
  ];

  return (
    <Card hoverable className={`p-4 ${player.is_mvp ? 'border-gold/40' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-panel2 font-mono text-sm font-bold text-text">
              {initials(player.player_name)}
            </div>
            {player.team_logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={player.team_logo}
                alt={player.team_name}
                className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border border-black/40 bg-panel object-cover"
              />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {player.player_id ? (
                <Link
                  href={`/players/${player.player_id}`}
                  className="truncate text-sm font-bold text-text transition-colors hover:text-gold"
                >
                  {player.player_name}
                </Link>
              ) : (
                <span className="truncate text-sm font-bold text-text">{player.player_name}</span>
              )}
              {player.is_mvp && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold uppercase text-black">
                  <Star className="h-2.5 w-2.5 fill-black" /> MVP
                </span>
              )}
            </div>
            <p className="truncate text-xs text-muted2">{player.team_name}</p>
          </div>
        </div>
        <Badge variant="default" className="shrink-0 !px-2 !py-0.5 font-mono">{player.position}</Badge>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-panel2 px-2 py-1.5 text-center">
            <p className="font-mono text-sm font-bold text-text tabular-nums">{value}</p>
            <p className="text-[9px] uppercase tracking-wide text-muted2">{label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
