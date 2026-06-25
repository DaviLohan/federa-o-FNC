'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import type { PlayerLeaderboardRow, PlayerLeaderboardSort } from '@/types';
import { PlayerAvatar } from '@/components/statistics/PlayerAvatar';

interface PlayerLeaderboardTableProps {
  rows: PlayerLeaderboardRow[];
  sort: PlayerLeaderboardSort;
  onSortChange: (sort: PlayerLeaderboardSort) => void;
}

interface Column {
  key: PlayerLeaderboardSort;
  label: string;
  short: string;
  align: 'left' | 'center';
  render: (row: PlayerLeaderboardRow) => string;
  sortable: boolean;
}

const fmtRating = (value: number | null) => (value === null ? '—' : value.toFixed(2));

const COLUMNS: Column[] = [
  { key: 'rating', label: 'Nota média', short: 'Nota', align: 'center', sortable: true, render: (r) => fmtRating(r.average_rating) },
  { key: 'games', label: 'Jogos', short: 'J', align: 'center', sortable: true, render: (r) => String(r.matches) },
  { key: 'goals', label: 'Gols', short: 'G', align: 'center', sortable: true, render: (r) => String(r.goals) },
  { key: 'assists', label: 'Assistências', short: 'A', align: 'center', sortable: true, render: (r) => String(r.assists) },
  { key: 'wins', label: 'Vitórias', short: 'V', align: 'center', sortable: true, render: (r) => String(r.wins) },
  { key: 'losses', label: 'Derrotas', short: 'D', align: 'center', sortable: true, render: (r) => String(r.losses) },
  { key: 'win_rate', label: 'Aproveitamento', short: '%', align: 'center', sortable: true, render: (r) => `${r.win_rate.toFixed(0)}%` },
  { key: 'cards', label: 'Cartões', short: 'C', align: 'center', sortable: true, render: (r) => String(r.cards) },
  { key: 'clean_sheets', label: 'Clean Sheets', short: 'CS', align: 'center', sortable: true, render: (r) => String(r.clean_sheets) },
];

function rankColor(rank: number) {
  if (rank === 1) return 'text-gold';
  if (rank === 2) return 'text-[#C8CDD6]';
  if (rank === 3) return 'text-[#CD7F32]';
  return 'text-muted2';
}

export function PlayerLeaderboardTable({ rows, sort, onSortChange }: PlayerLeaderboardTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-stroke bg-panel">
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-stroke text-xs uppercase tracking-wide text-muted2">
              <th className="px-3 py-3 text-center font-semibold w-12">#</th>
              <th className="px-3 py-3 text-left font-semibold">Jogador</th>
              {COLUMNS.map((col) => {
                const active = col.key === sort;
                return (
                  <th key={col.key} className="px-2 py-3 text-center font-semibold">
                    <button
                      type="button"
                      onClick={() => col.sortable && onSortChange(col.key)}
                      className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-gold' : 'hover:text-text'}`}
                      title={col.label}
                    >
                      {col.short}
                      {active && <ChevronDown className="h-3 w-3" />}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.player_id}
                className="border-b border-stroke/60 transition-colors last:border-0 hover:bg-white/[0.03]"
              >
                <td className={`px-3 py-3 text-center font-mono text-base font-bold tabular-nums ${rankColor(row.rank)}`}>
                  {row.rank}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <PlayerAvatar name={row.player_name} avatar={row.avatar} size="sm" ring={false} />
                    <div className="min-w-0">
                      <Link
                        href={`/players/${row.player_id}`}
                        className="block truncate font-semibold text-text transition-colors hover:text-gold"
                      >
                        {row.player_name}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-muted2">
                        {row.position && <span className="font-mono">{row.position}</span>}
                        {row.team && (
                          <Link href={`/teams/${row.team.id}`} className="truncate transition-colors hover:text-text">
                            {row.team.abbreviation || row.team.name}
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                {COLUMNS.map((col) => {
                  const active = col.key === sort;
                  return (
                    <td
                      key={col.key}
                      className={`px-2 py-3 text-center font-mono tabular-nums ${active ? 'font-bold text-gold' : 'text-text'}`}
                    >
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="divide-y divide-stroke/60 md:hidden">
        {rows.map((row) => (
          <div key={row.player_id} className="p-3">
            <div className="flex items-center gap-3">
              <span className={`w-6 shrink-0 text-center font-mono text-base font-bold tabular-nums ${rankColor(row.rank)}`}>
                {row.rank}
              </span>
              <PlayerAvatar name={row.player_name} avatar={row.avatar} size="sm" ring={false} />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/players/${row.player_id}`}
                  className="block truncate font-semibold text-text transition-colors hover:text-gold"
                >
                  {row.player_name}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted2">
                  {row.position && <span className="font-mono">{row.position}</span>}
                  {row.team && (
                    <Link href={`/teams/${row.team.id}`} className="truncate transition-colors hover:text-text">
                      {row.team.abbreviation || row.team.name}
                    </Link>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-lg font-bold text-gold tabular-nums">{fmtRating(row.average_rating)}</div>
                <div className="text-[10px] uppercase tracking-wide text-muted2">Nota</div>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1.5 pl-9 text-center">
              {(['games', 'goals', 'assists', 'win_rate'] as const).map((key) => {
                const col = COLUMNS.find((c) => c.key === key)!;
                return (
                  <div key={key} className="rounded-lg bg-white/[0.03] py-1">
                    <div className="font-mono text-sm font-bold text-text tabular-nums">{col.render(row)}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted2">{col.short}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
