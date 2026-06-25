'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import type { PlayerChampionshipStat } from '@/types';
import { EmptyState } from '@/components/shared/ui';

interface Props {
  items: PlayerChampionshipStat[];
}

export function PlayerChampionships({ items }: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="🏆"
        size="sm"
        title="Sem participações em campeonatos"
        description="As estatísticas por campeonato aparecerão conforme o jogador disputar competições."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke bg-panel">
      <div className="flex items-center gap-2 border-b border-stroke px-5 py-3">
        <Trophy className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-bold text-text">Participações em campeonatos</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b border-stroke text-xs uppercase tracking-wide text-muted2">
              <th className="px-5 py-2.5 text-left font-semibold">Campeonato</th>
              <th className="px-2 py-2.5 text-center font-semibold">J</th>
              <th className="px-2 py-2.5 text-center font-semibold">V-E-D</th>
              <th className="px-2 py-2.5 text-center font-semibold">G</th>
              <th className="px-2 py-2.5 text-center font-semibold">A</th>
              <th className="px-2 py-2.5 text-center font-semibold">Nota</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.championship.id} className="border-b border-stroke/60 last:border-0 hover:bg-white/[0.03]">
                <td className="px-5 py-3">
                  <Link
                    href={`/championships/${it.championship.id}`}
                    className="font-medium text-text transition-colors hover:text-gold"
                  >
                    {it.championship.name || `#${it.championship.id}`}
                  </Link>
                  {it.team && <div className="text-xs text-muted2">{it.team.name}</div>}
                </td>
                <td className="px-2 py-3 text-center font-mono tabular-nums text-text">{it.matches}</td>
                <td className="px-2 py-3 text-center font-mono tabular-nums text-muted2">
                  {it.wins}-{it.draws}-{it.losses}
                </td>
                <td className="px-2 py-3 text-center font-mono tabular-nums text-text">{it.goals}</td>
                <td className="px-2 py-3 text-center font-mono tabular-nums text-text">{it.assists}</td>
                <td className="px-2 py-3 text-center font-mono tabular-nums font-bold text-gold">
                  {it.average_rating !== null ? it.average_rating.toFixed(2) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
