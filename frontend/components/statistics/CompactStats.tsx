'use client';

import { Star, Goal, Handshake, Gamepad2 } from 'lucide-react';

interface CompactStatsProps {
  rating: number;
  goals: number;
  assists: number;
  matches: number;
  variant?: 'inline' | 'grid';
  className?: string;
}

const STATS = [
  { key: 'rating', icon: Star, label: 'Nota', accent: 'text-gold' },
  { key: 'goals', icon: Goal, label: 'Gols', accent: 'text-green' },
  { key: 'assists', icon: Handshake, label: 'Assistências', accent: 'text-violet-300' },
  { key: 'matches', icon: Gamepad2, label: 'Jogos', accent: 'text-cyan-300' },
] as const;

export function CompactStats({ rating, goals, assists, matches, variant = 'inline', className = '' }: CompactStatsProps) {
  const values: Record<string, string | number> = {
    rating: rating.toFixed(2),
    goals,
    assists,
    matches,
  };

  if (variant === 'grid') {
    return (
      <div className={`grid grid-cols-2 gap-1.5 ${className}`}>
        {STATS.map(({ key, icon: Icon, label, accent }) => (
          <div
            key={key}
            className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white/[0.03] px-2 py-1.5"
            title={label}
          >
            <Icon className={`h-3.5 w-3.5 shrink-0 ${accent}`} aria-hidden />
            <span className="truncate font-mono text-sm font-bold text-text tabular-nums">{values[key]}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {STATS.map(({ key, icon: Icon, label, accent }) => (
        <span key={key} className="inline-flex items-center gap-1" title={label} aria-label={`${label}: ${values[key]}`}>
          <Icon className={`h-3.5 w-3.5 shrink-0 ${accent}`} aria-hidden />
          <span className="font-mono text-xs font-semibold text-text tabular-nums">{values[key]}</span>
        </span>
      ))}
    </div>
  );
}
