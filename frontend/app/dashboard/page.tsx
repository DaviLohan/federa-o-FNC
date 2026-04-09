'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';
import {
  WelcomeSection,
  KpiCard,
  TeamCard,
  MatchCard,
  ChampionshipCard,
  QuickActionTile,
  SectionHeader,
  PlayerStatsSection,
  GettingStartedCard,
} from '@/components/dashboard';
import {
  Users,
  Trophy,
  Calendar,
  BarChart3,
  Plus,
  Search,
  Award,
  Mail,
  Shield,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  useRequireAuth();

  const user = useAuthStore((state) => state.user);
  const { myTeam, championships, upcomingMatches, pendingInvitations, stats, isLoading } =
    useDashboardData();
  const { canManageChampionships } = usePermissions();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-gold"></div>
          <p className="mt-4 text-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  // Verificar se é usuário novo (menos de 7 dias)
  const isNewUser =
    user.date_joined &&
    new Date().getTime() - new Date(user.date_joined).getTime() < 7 * 24 * 60 * 60 * 1000;

  // Getting Started Steps
  const gettingStartedSteps = [
    {
      title: 'Complete seu perfil',
      description: 'Adicione suas informações e escolha sua plataforma',
      completed: !!user.player_profile?.gamer_tag,
      href: '/profile',
    },
    {
      title: user.user_type === 'PLAYER' ? 'Junte-se a um time' : 'Crie seu time',
      description:
        user.user_type === 'PLAYER'
          ? 'Aguarde um convite ou entre em contato com managers'
          : 'Monte seu elenco e comece a competir',
      completed: !!myTeam,
      href: user.user_type === 'PLAYER' ? undefined : '/teams/create',
    },
    {
      title: 'Participe de um campeonato',
      description: 'Inscreva seu time em campeonatos disponíveis',
      completed: stats.hasEnrollment,
      href: '/championships',
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Welcome Section */}
      <WelcomeSection user={user} />

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Times"
          value={stats.hasTeam ? '1' : '0'}
          subtitle="Seu time"
          icon={<Users className="h-5 w-5" />}
          color="cyan"
          loading={isLoading}
          href={stats.hasTeam ? `/teams/${myTeam?.id}` : '/teams'}
        />
        <KpiCard
          title="Campeonatos"
          value={stats.openChampionships}
          subtitle="Abertos para inscrição"
          icon={<Trophy className="h-5 w-5" />}
          color="lime"
          loading={isLoading}
          href="/championships"
        />
        <KpiCard
          title="Próximas Partidas"
          value={stats.upcomingMatches}
          subtitle="Agendadas"
          icon={<Calendar className="h-5 w-5" />}
          color="teal"
          loading={isLoading}
          href="/matches"
        />
        <KpiCard
          title="Convites"
          value={stats.pendingInvitations}
          subtitle="Pendentes"
          icon={<Mail className="h-5 w-5" />}
          color="green"
          loading={isLoading}
          href="/teams"
        />
      </div>

      {/* 3. My Team */}
      <TeamCard team={myTeam} canCreate={user.user_type === 'TEAM_OWNER' && !myTeam} />

      {/* 4. Grid 2 cols: Próximas Partidas + Campeonatos */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Próximas Partidas */}
        <div className="space-y-4">
          <SectionHeader
            title="Próximas Partidas"
            subtitle="Suas partidas agendadas"
            href="/matches"
          />
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-xl bg-surface1" />
              ))}
            </div>
          ) : upcomingMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface1 p-12 text-center">
              <Calendar className="mb-4 h-12 w-12 text-muted" />
              <p className="text-muted">Nenhuma partida agendada</p>
              <p className="mt-2 text-sm text-muted/70">
                Suas próximas partidas aparecerão aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingMatches.slice(0, 3).map((match: any) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}
        </div>

        {/* Campeonatos Abertos */}
        <div className="space-y-4">
          <SectionHeader
            title="Campeonatos Abertos"
            subtitle="Inscrições disponíveis"
            href="/championships"
          />
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div key={i} className="h-64 animate-pulse rounded-xl bg-surface1" />
              ))}
            </div>
          ) : championships.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface1 p-12 text-center">
              <Trophy className="mb-4 h-12 w-12 text-muted" />
              <p className="text-muted">Nenhum campeonato disponível</p>
              <p className="mt-2 text-sm text-muted/70">
                Novos campeonatos serão exibidos aqui
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {championships.slice(0, 2).map((championship: any) => (
                <ChampionshipCard key={championship.id} championship={championship} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. Quick Actions */}
      <div>
        <SectionHeader title="Ações Rápidas" subtitle="Acesso rápido às principais funcionalidades" />
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {user.user_type === 'TEAM_OWNER' && !myTeam && (
            <QuickActionTile
              title="Criar Time"
              description="Monte seu elenco"
              icon={<Plus className="h-6 w-6" />}
              href="/teams/create"
              color="cyan"
            />
          )}
          <QuickActionTile
            title="Campeonatos"
            description="Ver disponíveis"
            icon={<Trophy className="h-6 w-6" />}
            href="/championships"
            color="lime"
          />
          <QuickActionTile
            title="Ranking"
            description="Ver classificação"
            icon={<Award className="h-6 w-6" />}
            href="/statistics"
            color="teal"
          />
          <QuickActionTile
            title="Partidas"
            description="Histórico completo"
            icon={<Calendar className="h-6 w-6" />}
            href="/matches"
            color="green"
          />
          {canManageChampionships && (
            <QuickActionTile
              title="Admin"
              description="Painel administrativo"
              icon={<Shield className="h-6 w-6" />}
              href="/admin"
              color="purple"
            />
          )}
        </div>
      </div>

      {/* 6. Player Stats (se for PLAYER) */}
      {user.user_type === 'PLAYER' && user.player_profile && (
        <div className="space-y-4">
          <SectionHeader
            title="Suas Estatísticas"
            subtitle="Seu desempenho em partidas"
            href="/statistics"
          />
          <PlayerStatsSection
            stats={{
              goals: user.player_profile.total_goals || 0,
              assists: user.player_profile.total_assists || 0,
              matches_played: user.player_profile.total_games || 0,
              rating: user.player_profile.win_rate || 0,
            }}
            loading={isLoading}
          />
        </div>
      )}

      {/* 7. Getting Started (se for novo usuário) */}
      {isNewUser && (
        <div>
          <SectionHeader title="Primeiros Passos" subtitle="Complete seu cadastro" />
          <div className="mt-4">
            <GettingStartedCard steps={gettingStartedSteps} />
          </div>
        </div>
      )}
    </div>
  );
}
