'use client';

import Link from 'next/link';
import { Gamepad2, Goal, Handshake, Trophy, Star, Square, ShieldCheck, Percent, ChevronRight } from 'lucide-react';
import type { PlayerProfilePayload } from '@/types';
import { Card, EmptyState, Skeleton } from '@/components/shared/ui';
import { PlayerEvolutionChart } from '@/components/players/PlayerEvolutionChart';
import { PlayerMatchHistory } from '@/components/players/PlayerMatchHistory';
import { PlayerAchievements } from '@/components/players/PlayerAchievements';

function StatTile({ icon, value, label, accent = 'text-text' }: { icon: React.ReactNode; value: string | number; label: string; accent?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-stroke bg-panel2 px-2 py-2.5 text-center">
      <span className="text-muted2">{icon}</span>
      <span className={`font-mono text-lg font-bold tabular-nums ${accent}`}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted2">{label}</span>
    </div>
  );
}

export function MyPerformancePanel({
  profile,
  loading,
  playerId,
}: {
  profile?: PlayerProfilePayload;
  loading?: boolean;
  playerId?: number;
}) {
  if (loading) {
    return <Skeleton height="220px" className="rounded-3xl" />;
  }

  if (!profile || profile.career.matches === 0) {
    return (
      <Card premium>
        <EmptyState
          icon="📊"
          size="sm"
          title="Seu desempenho aparece aqui"
          description="Assim que você disputar partidas válidas, suas estatísticas, evolução e histórico ficam reunidos aqui."
        />
      </Card>
    );
  }

  const c = profile.career;
  const gk = profile.player.is_goalkeeper;

  const tiles = [
    { icon: <Gamepad2 className="h-4 w-4" />, value: c.matches, label: 'Jogos' },
    { icon: <Trophy className="h-4 w-4" />, value: c.wins, label: 'Vitórias', accent: 'text-green' },
    { icon: <Percent className="h-4 w-4" />, value: `${c.win_rate.toFixed(0)}%`, label: 'Aproveit.', accent: 'text-gold' },
    { icon: <Goal className="h-4 w-4" />, value: c.goals, label: 'Gols', accent: 'text-green' },
    { icon: <Handshake className="h-4 w-4" />, value: c.assists, label: 'Assist.' },
    { icon: <Star className="h-4 w-4" />, value: c.average_rating !== null ? c.average_rating.toFixed(1) : '—', label: 'Nota', accent: 'text-gold' },
    gk
      ? { icon: <ShieldCheck className="h-4 w-4" />, value: c.clean_sheets, label: 'Clean sheets', accent: 'text-green' }
      : { icon: <Square className="h-4 w-4" />, value: c.cards, label: 'Cartões', accent: 'text-warning' },
  ];

  return (
    <section className="space-y-4">
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-text">Meu desempenho</h2>
          <p className="text-sm text-muted2">Suas estatísticas, evolução e histórico</p>
        </div>
        {playerId && (
          <Link
            href={`/players/${playerId}`}
            className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted2 transition-colors hover:text-gold"
          >
            ver perfil completo
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>

      {/* Faixa de stats de carreira */}
      <Card premium className="!p-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {tiles.map((t) => (
            <StatTile key={t.label} icon={t.icon} value={t.value} label={t.label} accent={(t as any).accent} />
          ))}
        </div>
      </Card>

      {/* Evolução + histórico */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PlayerEvolutionChart history={profile.history} />
        <PlayerMatchHistory history={profile.history.slice(0, 6)} />
      </div>

      {/* Conquistas (se houver) */}
      {profile.achievements.length > 0 && <PlayerAchievements achievements={profile.achievements} />}
    </section>
  );
}
