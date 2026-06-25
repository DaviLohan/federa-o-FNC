'use client';

import Link from 'next/link';
import { Goal, Handshake, Hand, Sparkles, BarChart3, Users } from 'lucide-react';
import type { WeeklySelectionPayload, WeeklySelectionPlayer } from '@/types';
import { Card } from '@/components/shared/ui';
import { initials, formatRating } from './weeklyLayout';

interface Highlight {
  icon: React.ReactNode;
  label: string;
  player: WeeklySelectionPlayer;
  value: string;
}

function HighlightRow({ icon, label, player, value }: Highlight) {
  const name = (
    <span className="truncate text-sm font-semibold text-text">{player.player_name}</span>
  );
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-stroke bg-panel2 px-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold/20 bg-gold/10 text-gold">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-widest text-muted2">{label}</p>
        <div className="flex items-center gap-1.5">
          {player.team_logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={player.team_logo} alt={player.team_name} className="h-4 w-4 rounded-full object-cover" />
          )}
          {player.player_id ? (
            <Link href={`/players/${player.player_id}`} className="truncate transition-colors hover:text-gold">
              {name}
            </Link>
          ) : (
            name
          )}
        </div>
      </div>
      <span className="shrink-0 font-mono text-lg font-bold text-gold tabular-nums">{value}</span>
    </div>
  );
}

export function WeeklyHighlights({ payload }: { payload: WeeklySelectionPayload }) {
  const players = payload.players;
  const highlights: Highlight[] = [];

  const topScorer = [...players].sort((a, b) => b.goals - a.goals || b.average_rating - a.average_rating)[0];
  if (topScorer && topScorer.goals > 0) {
    highlights.push({ icon: <Goal className="h-4 w-4" />, label: 'Artilheiro da rodada', player: topScorer, value: String(topScorer.goals) });
  }

  const topAssist = [...players].sort((a, b) => b.assists - a.assists || b.average_rating - a.average_rating)[0];
  if (topAssist && topAssist.assists > 0) {
    highlights.push({ icon: <Handshake className="h-4 w-4" />, label: 'Garçom da rodada', player: topAssist, value: String(topAssist.assists) });
  }

  const gks = players.filter((p) => p.group === 'GK' || (p.position || '').toUpperCase() === 'GK');
  const bestGk = [...gks].sort((a, b) => b.average_rating - a.average_rating)[0];
  if (bestGk) {
    highlights.push({ icon: <Hand className="h-4 w-4" />, label: 'Melhor goleiro', player: bestGk, value: formatRating(bestGk.average_rating) });
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-gold" />
        <h3 className="text-sm font-bold text-text">Destaques da rodada</h3>
      </div>

      {highlights.length > 0 ? (
        <div className="space-y-2">
          {highlights.map((h) => (
            <HighlightRow key={h.label} {...h} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted2">Sem destaques individuais nesta rodada.</p>
      )}

      {/* Resumo / scouting */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <div className="flex items-center gap-2 rounded-xl border border-stroke bg-panel2 px-3 py-2">
          <BarChart3 className="h-4 w-4 shrink-0 text-muted2" />
          <div className="min-w-0">
            <p className="font-mono text-base font-bold text-text leading-none">{payload.meta.matches_analyzed}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted2">partidas</p>
          </div>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-stroke bg-panel2 px-3 py-2">
          <Users className="h-4 w-4 shrink-0 text-muted2" />
          <div className="min-w-0">
            <p className="font-mono text-base font-bold text-text leading-none">{payload.meta.players_considered}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted2">avaliados</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
