'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';
import { Card, Button, EmptyState } from '@/components/shared/ui';
import type { TeamPerformanceMatch, TeamPerformancePayload, TeamPerformancePlayer } from '@/types';
import { formatDate, formatTime } from '@/lib/utils/date';
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type ContextFilter = 'all' | 'championship' | 'friendly';
type SortKey =
  | 'player_name'
  | 'position'
  | 'matches_played'
  | 'average_rating'
  | 'goals'
  | 'assists'
  | 'passes_made'
  | 'passes_missed'
  | 'pass_accuracy'
  | 'tackles_made'
  | 'tackles_missed'
  | 'tackle_accuracy'
  | 'saves';

interface TeamPerformanceTabProps {
  teamId: number;
}

const RESULT_STYLES = {
  W: 'bg-success/10 text-success border-success/20',
  D: 'bg-warning/10 text-warning border-warning/20',
  L: 'bg-error/10 text-error border-error/20',
};

const KPI_CONFIG: Array<{ key: keyof TeamPerformancePayload['summary']; label: string; icon: LucideIcon; suffix?: string; fixed?: number }> = [
  { key: 'matches', label: 'Partidas', icon: CalendarDays },
  { key: 'wins', label: 'Vitórias', icon: Trophy },
  { key: 'draws', label: 'Empates', icon: Shield },
  { key: 'losses', label: 'Derrotas', icon: Target },
  { key: 'goals_scored', label: 'Gols Marcados', icon: Target },
  { key: 'goals_conceded', label: 'Gols Sofridos', icon: Shield },
  { key: 'clean_sheets', label: 'Clean Sheets', icon: CheckCircle2 },
  { key: 'win_rate', label: 'Aproveitamento', icon: Activity, suffix: '%' },
  { key: 'avg_team_rating', label: 'Nota Média', icon: Sparkles, fixed: 2 },
  { key: 'pass_accuracy', label: 'P% do Time', icon: BarChart3, suffix: '%' },
  { key: 'tackle_accuracy', label: 'D% do Time', icon: Shield, suffix: '%' },
  { key: 'saves', label: 'Defesas', icon: Users },
] as const;

function formatMetric(value: number | null | undefined, options?: { suffix?: string; fixed?: number }) {
  if (value === null || value === undefined) return '—';
  if (options?.fixed !== undefined) return `${value.toFixed(options.fixed)}${options.suffix ?? ''}`;
  return `${value}${options?.suffix ?? ''}`;
}

function LeaderCard({ title, player, accent }: { title: string; player?: TeamPerformancePlayer | null; accent: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <p className="text-[11px] uppercase tracking-widest text-muted font-mono">{title}</p>
      {player ? (
        <>
          <p className="mt-3 text-lg font-semibold text-text truncate">{player.player_name}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted">
            <span className="inline-flex items-center rounded-full border border-border bg-surface1 px-2.5 py-1">
              {player.position}
            </span>
            <span className="inline-flex items-center rounded-full border border-border bg-surface1 px-2.5 py-1">
              {player.matches_played} PJ
            </span>
            {player.average_rating !== null && (
              <span className="inline-flex items-center rounded-full border border-border bg-surface1 px-2.5 py-1">
                Nota {player.average_rating.toFixed(2)}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">Sem dados suficientes.</p>
      )}
    </div>
  );
}

export function TeamPerformanceTab({ teamId }: TeamPerformanceTabProps) {
  const [context, setContext] = useState<ContextFilter>('all');
  const [championshipId, setChampionshipId] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('average_rating');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['team-performance', teamId, context, championshipId, dateFrom, dateTo],
    queryFn: () =>
      teamsAPI.getPerformance(teamId, {
        context,
        championship_id: championshipId !== 'all' ? Number(championshipId) : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }),
    enabled: !Number.isNaN(teamId),
    staleTime: 30_000,
  });

  const performance = data as TeamPerformancePayload | undefined;

  const players = useMemo(() => {
    const rows = [...(performance?.players ?? [])];
    rows.sort((a, b) => {
      const left = a[sortKey] ?? (sortKey === 'player_name' ? '' : -1);
      const right = b[sortKey] ?? (sortKey === 'player_name' ? '' : -1);
      const comparison = typeof left === 'string'
        ? left.localeCompare(String(right), 'pt-BR')
        : Number(left) - Number(right);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return rows;
  }, [performance?.players, sortDirection, sortKey]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection(key === 'player_name' ? 'asc' : 'desc');
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-28 rounded-2xl border border-border bg-surface2 animate-pulse" />
          ))}
        </div>
        <div className="h-80 rounded-2xl border border-border bg-surface2 animate-pulse" />
      </div>
    );
  }

  if (!performance || performance.summary.matches === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="mx-auto h-14 w-14 text-gold/40" />}
        title="Sem desempenho registrado ainda"
        description="Assim que o time tiver partidas finalizadas, esta aba vai consolidar o rendimento coletivo e individual automaticamente."
        action={
          <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>
            Atualizar dados
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-surface1 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-gold">Desempenho do Time</p>
            <h3 className="mt-1 text-2xl font-heading font-bold text-text">Leitura coletiva e individual do elenco</h3>
            <p className="mt-1 text-sm text-muted">
              Dados avancados via EA quando disponiveis e fallback basico para partidas sem integracao completa.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <select
              value={context}
              onChange={(e) => setContext(e.target.value as ContextFilter)}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-text focus:border-gold/50 focus:outline-none"
            >
              <option value="all">Todos os contextos</option>
              <option value="championship">Campeonatos</option>
              <option value="friendly">Amistosos</option>
            </select>
            <select
              value={championshipId}
              onChange={(e) => setChampionshipId(e.target.value)}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-text focus:border-gold/50 focus:outline-none"
            >
              <option value="all">Todos os campeonatos</option>
              {performance.filters.championships.map((championship) => (
                <option key={championship.id} value={championship.id}>{championship.name}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-text focus:border-gold/50 focus:outline-none"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-text focus:border-gold/50 focus:outline-none"
            />
            <Button variant="secondary" onClick={() => refetch()} loading={isFetching}>Atualizar</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        {KPI_CONFIG.map(({ key, label, icon: Icon, suffix, fixed }) => (
          <Card key={key} className="!p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-muted font-mono">{label}</p>
                <p className="mt-2 text-2xl font-black font-mono text-text">
                  {formatMetric((performance.summary as any)[key], { suffix, fixed })}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/20 bg-gold/10 text-gold">
                <Icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <LeaderCard title="Melhor Nota" player={performance.leaders.best_rating} accent="bg-gold/5 border-gold/20" />
        <LeaderCard title="Mais Participa em Gols" player={performance.leaders.top_scorer} accent="bg-success/5 border-success/20" />
        <LeaderCard title="Mais Partidas" player={performance.leaders.most_matches} accent="bg-info/5 border-info/20" />
        <LeaderCard title="Melhor Passe %" player={performance.leaders.best_passer} accent="bg-warning/5 border-warning/20" />
        <LeaderCard title="Melhor Desarme %" player={performance.leaders.best_tackler} accent="bg-purple-500/5 border-purple-500/20" />
        <LeaderCard title="Mais Assistencias" player={performance.leaders.top_assister} accent="bg-white/5 border-border" />
      </div>

      <Card title="Tabela de Desempenho do Elenco">
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted">
          <span className="inline-flex items-center rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-gold">
            {performance.summary.advanced_matches} partidas com dados avancados
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-surface2 px-3 py-1">
            {performance.summary.basic_matches} partidas com fallback basico
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="min-w-full divide-y divide-border bg-surface1 text-sm">
            <thead className="bg-surface2/80 text-xs uppercase tracking-wider text-muted">
              <tr>
                {[
                  ['player_name', 'Jogador'],
                  ['position', 'Pos'],
                  ['matches_played', 'PJ'],
                  ['average_rating', 'Nota'],
                  ['goals', 'Gols'],
                  ['assists', 'Assists'],
                  ['passes_made', 'P. Certos'],
                  ['passes_missed', 'P. Errados'],
                  ['pass_accuracy', 'P%'],
                  ['tackles_made', 'Desarmes'],
                  ['tackles_missed', 'Des. Errados'],
                  ['tackle_accuracy', 'D%'],
                  ['saves', 'Defesas'],
                ].map(([key, label]) => (
                  <th key={key} className="px-4 py-3 text-left font-semibold">
                    <button className="transition-colors hover:text-gold" onClick={() => handleSort(key as SortKey)}>
                      {label}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {players.map((player) => (
                <tr key={`${player.player_id ?? player.player_name}`} className="hover:bg-surface2/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="min-w-[180px]">
                      <p className="font-medium text-text">{player.player_name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
                        {player.has_advanced_data ? (
                          <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-gold">EA</span>
                        ) : (
                          <span className="rounded-full border border-border bg-surface2 px-2 py-0.5">Basico</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-text">{player.position}</td>
                  <td className="px-4 py-3 text-text">{player.matches_played}</td>
                  <td className="px-4 py-3 text-text">{player.average_rating?.toFixed(2) ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-text">{player.goals}</td>
                  <td className="px-4 py-3 text-text">{player.assists}</td>
                  <td className="px-4 py-3 text-text">{player.passes_made}</td>
                  <td className="px-4 py-3 text-text">{player.passes_missed}</td>
                  <td className="px-4 py-3 text-text">{player.pass_accuracy?.toFixed(1) ?? '—'}{player.pass_accuracy !== null ? '%' : ''}</td>
                  <td className="px-4 py-3 text-text">{player.tackles_made}</td>
                  <td className="px-4 py-3 text-text">{player.tackles_missed}</td>
                  <td className="px-4 py-3 text-text">{player.tackle_accuracy?.toFixed(1) ?? '—'}{player.tackle_accuracy !== null ? '%' : ''}</td>
                  <td className="px-4 py-3 text-text">{player.saves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Ultimas Partidas e Impacto nas Metricas">
        <div className="space-y-3">
          {performance.matches.map((match: TeamPerformanceMatch) => (
            <div key={match.match_id} className="rounded-2xl border border-border bg-surface1 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${RESULT_STYLES[match.result]}`}>
                      {match.result}
                    </span>
                    <span className="text-sm font-semibold text-text">
                      {match.goals_scored} x {match.goals_conceded} {match.opponent.name}
                    </span>
                    {match.championship && (
                      <span className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-xs text-muted">
                        {match.championship.name}
                      </span>
                    )}
                    <span className="rounded-full border border-border bg-surface2 px-2.5 py-1 text-xs text-muted">
                      {match.context === 'championship' ? 'Campeonato' : 'Amistoso'}
                    </span>
                    <span className={`rounded-full border px-2.5 py-1 text-xs ${match.has_advanced_data ? 'border-gold/20 bg-gold/10 text-gold' : 'border-border bg-surface2 text-muted'}`}>
                      {match.has_advanced_data ? 'Dados avancados EA' : 'Dados basicos'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {formatDate(match.played_at)} às {formatTime(match.played_at)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div className="rounded-xl border border-border bg-surface2 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted font-mono">Nota média</p>
                    <p className="mt-1 font-semibold text-text">{match.average_rating?.toFixed(2) ?? '—'}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted font-mono">P%</p>
                    <p className="mt-1 font-semibold text-text">{match.pass_accuracy?.toFixed(1) ?? '—'}{match.pass_accuracy !== null ? '%' : ''}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted font-mono">D%</p>
                    <p className="mt-1 font-semibold text-text">{match.tackle_accuracy?.toFixed(1) ?? '—'}{match.tackle_accuracy !== null ? '%' : ''}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface2 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-widest text-muted font-mono">Defesas</p>
                    <p className="mt-1 font-semibold text-text">{match.saves}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
