'use client';

import { useQuery } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { statisticsAPI } from '@/lib/api';
import type { TeamMembership } from '@/types';
import { formatDateShort } from '@/lib/utils/date';
import { PlayerCardGrid } from '@/components/players/PlayerCardGrid';

interface TeamSquadCardsProps {
  teamId: number;
  members: TeamMembership[];
}

export function TeamSquadCards({ teamId, members }: TeamSquadCardsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['team-squad-cards', teamId],
    queryFn: () => statisticsAPI.getPlayerLeaderboard({ team_id: teamId, sort: 'rating', limit: 100 }),
  });

  const rows = data?.results ?? [];
  const membershipByPlayer = new Map(members.map((m) => [m.player.id, m]));
  const activeCount = members.filter((m) => m.is_active).length;

  const footerFor = (row: { player_id: number }) => {
    const m = membershipByPlayer.get(row.player_id);
    if (!m) return null;
    return (
      <div className="px-1">
        <p className="text-xs text-muted">Entrada: {formatDateShort(m.joined_at)}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            m.is_active ? 'bg-gold/15 text-gold' : 'bg-white/5 text-muted'
          }`}
        >
          {m.is_active ? m.role_display || 'Ativo' : 'Inativo'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-base font-bold text-text md:text-lg">Jogadores do clube</h2>
        <span className="rounded-full bg-gold/15 px-3 py-1 text-sm font-bold text-gold">
          {rows.length}/{members.length}
        </span>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-surface2" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface1 py-12 text-center">
          <Users className="h-7 w-7 text-muted2" />
          <p className="text-sm text-muted">Nenhum jogador do elenco tem partidas registradas ainda.</p>
        </div>
      ) : (
        <>
          <PlayerCardGrid rows={rows} groupByRank footerFor={footerFor} />
          {rows.length < activeCount && (
            <p className="text-center text-xs text-muted2">
              {activeCount - rows.length} jogador(es) do elenco ainda sem partidas registradas.
            </p>
          )}
        </>
      )}
    </div>
  );
}
