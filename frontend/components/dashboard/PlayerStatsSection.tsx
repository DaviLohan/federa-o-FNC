'use client';

import { Trophy, Target, Award, TrendingUp } from 'lucide-react';

interface PlayerStatsSectionProps {
  stats?: {
    goals: number;
    assists: number;
    matches_played: number;
    rating: number;
  };
  loading?: boolean;
}

export function PlayerStatsSection({ stats, loading = false }: PlayerStatsSectionProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-surface1" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    {
      label: 'Gols',
      value: stats.goals,
      icon: <Target className="h-5 w-5" />,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      label: 'Assistências',
      value: stats.assists,
      icon: <Trophy className="h-5 w-5" />,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Partidas',
      value: stats.matches_played,
      icon: <Award className="h-5 w-5" />,
      color: 'text-gold',
      bgColor: 'bg-gold/10',
    },
    {
      label: 'Rating',
      value: stats.rating.toFixed(1),
      icon: <TrendingUp className="h-5 w-5" />,
      color: 'text-green',
      bgColor: 'bg-green/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-surface1 p-4 transition-all hover:-translate-y-1"
        >
          <div className={`mb-3 inline-flex rounded-lg p-2 ${stat.bgColor}`}>
            <div className={stat.color}>{stat.icon}</div>
          </div>
          <div className="font-mono text-2xl font-bold text-text">
            {stat.value}
          </div>
          <div className="text-xs text-muted">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}
