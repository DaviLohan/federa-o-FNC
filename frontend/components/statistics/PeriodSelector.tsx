'use client';

import { CalendarClock, ChevronDown } from 'lucide-react';
import type { RankingCycleOption } from '@/types';

interface Props {
  cycles: RankingCycleOption[];
  value: string | null;
  onChange: (slug: string) => void;
}

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
];

export function formatCycleLabel(slug: string): string {
  const [y, m] = slug.split('-');
  const month = MONTHS[Number(m) - 1];
  return month ? `${month} ${y}` : slug;
}

export function PeriodSelector({ cycles, value, onChange }: Props) {
  if (!cycles.length) return null;

  return (
    <label className="group relative inline-flex items-center">
      <span className="sr-only">Selecionar período do ranking</span>
      <CalendarClock className="pointer-events-none absolute left-3 h-4 w-4 text-muted2" aria-hidden />
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-xl border border-stroke bg-panel2 py-2 pl-9 pr-9 text-sm font-medium text-text outline-none transition-colors hover:border-gold/40 focus:border-gold/60 focus:ring-2 focus:ring-gold/15"
        aria-label="Período do ranking"
      >
        {cycles.map((c) => (
          <option key={c.slug} value={c.slug}>
            {formatCycleLabel(c.slug)}
            {c.status === 'OPEN' ? ' • Atual' : ''}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-muted2 transition-transform group-focus-within:rotate-180" aria-hidden />
    </label>
  );
}
