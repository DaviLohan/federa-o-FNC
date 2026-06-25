'use client';

import {
  Gamepad2, Goal, Handshake, Trophy, Star, ShieldCheck, Square, Percent,
} from 'lucide-react';
import type { PlayerCareerStats as Career } from '@/types';
import { KpiTrendCard } from '@/components/statistics/KpiTrendCard';

interface Props {
  career: Career;
  isGoalkeeper: boolean;
}

export function PlayerCareerStats({ career, isGoalkeeper }: Props) {
  const ratingValue = career.average_rating === null ? '—' : career.average_rating.toFixed(2);

  const cards: {
    icon: React.ReactNode;
    value: string | number;
    label: string;
    accent: 'gold' | 'green' | 'brand' | 'warning' | 'error';
    sublabel?: string;
  }[] = [
    { icon: <Gamepad2 className="h-5 w-5" />, value: career.matches, label: 'Jogos', accent: 'brand' },
    { icon: <Goal className="h-5 w-5" />, value: career.goals, label: 'Gols', accent: 'green' },
    { icon: <Handshake className="h-5 w-5" />, value: career.assists, label: 'Assistências', accent: 'gold' },
    { icon: <Trophy className="h-5 w-5" />, value: career.wins, label: 'Vitórias', accent: 'green' },
    { icon: <Percent className="h-5 w-5" />, value: `${career.win_rate.toFixed(0)}%`, label: 'Aproveitamento', accent: 'gold' },
    {
      icon: <Star className="h-5 w-5" />,
      value: ratingValue,
      label: 'Nota média',
      accent: 'gold',
      sublabel: career.average_rating === null ? 'sem dados EA' : undefined,
    },
    { icon: <Square className="h-5 w-5" />, value: career.cards, label: 'Cartões', accent: 'warning' },
  ];

  if (isGoalkeeper) {
    cards.push({
      icon: <ShieldCheck className="h-5 w-5" />,
      value: career.clean_sheets,
      label: 'Clean Sheets',
      accent: 'green',
    });
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {cards.map((c, i) => (
        <KpiTrendCard
          key={c.label}
          icon={c.icon}
          value={c.value}
          label={c.label}
          sublabel={c.sublabel}
          accent={c.accent}
          index={i}
        />
      ))}
    </div>
  );
}
