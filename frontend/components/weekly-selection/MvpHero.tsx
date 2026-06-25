'use client';

import Link from 'next/link';
import { Crown } from 'lucide-react';
import type { WeeklySelectionPlayer } from '@/types';
import { Card } from '@/components/shared/ui';
import { PlayerAvatar } from '@/components/statistics/PlayerAvatar';
import { formatRating } from './weeklyLayout';

export function MvpHero({ mvp }: { mvp: WeeklySelectionPlayer | null }) {
  if (!mvp) return null;

  const isGk = (mvp.position || '').toUpperCase() === 'GK';
  const stats: [string, string][] = [
    ['Nota', formatRating(mvp.average_rating)],
    ['Gols', String(mvp.goals)],
    ['Assistências', String(mvp.assists)],
    isGk ? ['Defesas', String(mvp.saves)] : ['Partidas', String(mvp.matches_played)],
  ];

  const name = (
    <h3 className="gradient-text text-2xl font-black leading-tight">{mvp.player_name}</h3>
  );

  return (
    <Card premium className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_50%_100%_at_50%_0%,rgba(214,161,30,0.15),transparent_70%)]" />
      <div className="relative flex items-center gap-4">
        <div className="relative shrink-0">
          <PlayerAvatar name={mvp.player_name} size="xl" ring={false} />
          <span className="absolute inset-0 rounded-full ring-2 ring-gold shadow-[0_0_24px_rgba(214,161,30,0.4)]" />
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold">
            <Crown className="h-5 w-5 fill-gold" />
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold">MVP da rodada</p>
          {mvp.player_id ? (
            <Link href={`/players/${mvp.player_id}`} className="transition-opacity hover:opacity-80">
              {name}
            </Link>
          ) : (
            name
          )}
          <div className="mt-1 flex items-center gap-2 text-sm text-muted2">
            {mvp.team_logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mvp.team_logo} alt={mvp.team_name} className="h-5 w-5 rounded-full object-cover" />
            )}
            <span className="truncate">{mvp.team_name}</span>
            <span className="text-muted">·</span>
            <span className="font-mono">{mvp.position}</span>
          </div>
        </div>
      </div>

      <div className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-stroke bg-panel2 px-4 py-3 text-center">
            <p className="text-[10px] uppercase tracking-widest text-muted2">{label}</p>
            <p className="mt-1 font-mono text-xl font-bold text-gold">{value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
