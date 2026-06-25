'use client';

import Link from 'next/link';
import { History } from 'lucide-react';
import type { PlayerHistoryMatch } from '@/types';
import { EmptyState } from '@/components/shared/ui';

interface Props {
  history: PlayerHistoryMatch[];
}

const RESULT_STYLE: Record<string, string> = {
  W: 'bg-green/15 text-green border-green/30',
  D: 'bg-warning/15 text-warning border-warning/30',
  L: 'bg-error/15 text-error border-error/30',
};

const RESULT_LABEL: Record<string, string> = { W: 'V', D: 'E', L: 'D' };

export function PlayerMatchHistory({ history }: Props) {
  if (history.length === 0) {
    return <EmptyState icon="📋" size="sm" title="Sem histórico de partidas" description="As partidas finalizadas aparecerão aqui." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stroke bg-panel">
      <div className="flex items-center gap-2 border-b border-stroke px-5 py-3">
        <History className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-bold text-text">Histórico de partidas</h3>
      </div>
      <ul className="divide-y divide-stroke/60">
        {history.map((m) => (
          <li key={m.match_id}>
            <Link
              href={`/matches/${m.match_id}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/[0.03]"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border font-mono text-xs font-bold ${
                  m.result ? RESULT_STYLE[m.result] : 'border-stroke bg-panel2 text-muted2'
                }`}
              >
                {m.result ? RESULT_LABEL[m.result] : '—'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text">
                  vs {m.opponent?.name || '—'}
                </p>
                <p className="truncate text-xs text-muted2">
                  {m.championship?.name || 'Amistoso'}
                  {m.goals_scored != null && m.goals_conceded != null && (
                    <span className="ml-1 font-mono">· {m.goals_scored}-{m.goals_conceded}</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3 text-right">
                <span className="font-mono text-xs text-muted2">{m.goals}G {m.assists}A</span>
                <span className="font-mono text-sm font-bold text-gold">
                  {m.rating !== null ? m.rating.toFixed(1) : '—'}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
