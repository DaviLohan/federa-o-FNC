'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useDashboardData } from '@/hooks/useDashboardData';
import { usePermissions } from '@/hooks/usePermissions';
import {
  WelcomeSection,
  TeamCard,
  QuickActionTile,
  SectionHeader,
  GettingStartedCard,
  DashboardKpis,
  UpcomingMatchesCard,
  RecentResultsCard,
  RankingPodiumCard,
  MyRankCard,
  TeamStandingsCard,
  TopStatsCard,
  RoundHighlightsCard,
  AnnouncementsCard,
  MyPerformancePanel,
} from '@/components/dashboard';
import { Plus, Trophy, Award, Calendar, Shield, UserSquare } from 'lucide-react';

export default function DashboardPage() {
  useRequireAuth();

  const user = useAuthStore((state) => state.user);
  const {
    myTeam, championships, upcomingMatches, recentResults, stats, isLoading,
    ranking, myRank, topScorers, topAssisters, teamRanking, weeklySelection, myProfile, platformStats, loading,
  } = useDashboardData();
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

  const isPlayer = user.user_type === 'PLAYER';
  const isNewUser =
    user.date_joined &&
    new Date().getTime() - new Date(user.date_joined).getTime() < 7 * 24 * 60 * 60 * 1000;

  const gettingStartedSteps = [
    { title: 'Complete seu perfil', description: 'Adicione suas informações e escolha sua plataforma', completed: !!user.player_profile?.gamer_tag, href: '/profile' },
    {
      title: isPlayer ? 'Junte-se a um time' : 'Crie seu time',
      description: isPlayer ? 'Aguarde um convite ou entre em contato com managers' : 'Monte seu elenco e comece a competir',
      completed: !!myTeam,
      href: isPlayer ? undefined : '/teams/create',
    },
    { title: 'Participe de um campeonato', description: 'Inscreva seu time em campeonatos disponíveis', completed: stats.hasEnrollment, href: '/championships' },
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Boas-vindas */}
      <WelcomeSection user={user} />

      {/* KPIs premium personalizados por papel */}
      <DashboardKpis
        user={user}
        stats={stats}
        myRank={myRank}
        myTeam={myTeam}
        teamRanking={teamRanking}
        platformStats={platformStats}
        isAdmin={canManageChampionships}
      />

      {isPlayer ? (
        <>
          {/* Bloco pessoal em destaque */}
          <MyPerformancePanel profile={myProfile} loading={loading.myProfile} playerId={user.player_profile?.id} />

          {/* Próximos jogos · Sua posição · Comunicados (em destaque) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <UpcomingMatchesCard matches={upcomingMatches} loading={isLoading} />
            <MyRankCard myRank={myRank} loading={loading.myRank} />
            <AnnouncementsCard />
          </div>

          {/* Competição: destaques individuais · destaques da rodada */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopStatsCard scorers={topScorers} assisters={topAssisters} loading={loading.scorers || loading.assisters} />
            <RoundHighlightsCard payload={weeklySelection} loading={loading.weekly} />
          </div>

          {/* Pódio do ranking (largura total para respirar) */}
          <RankingPodiumCard ranking={ranking} loading={loading.ranking} />

          {/* Classificação de times · resultados recentes */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TeamStandingsCard rows={teamRanking} myTeamId={myTeam?.id} loading={loading.teamRanking} />
            <RecentResultsCard matches={recentResults} loading={loading.results} />
          </div>
        </>
      ) : (
        <>
          {/* Visão dono/admin */}
          {/* Pódio do ranking (largura total) */}
          <RankingPodiumCard ranking={ranking} loading={loading.ranking} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <UpcomingMatchesCard matches={upcomingMatches} loading={isLoading} />
            <TeamStandingsCard rows={teamRanking} myTeamId={myTeam?.id} loading={loading.teamRanking} />
            <AnnouncementsCard />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopStatsCard scorers={topScorers} assisters={topAssisters} loading={loading.scorers || loading.assisters} />
            <RoundHighlightsCard payload={weeklySelection} loading={loading.weekly} />
          </div>

          <RecentResultsCard matches={recentResults} loading={loading.results} />
        </>
      )}

      {/* Seu time */}
      {(myTeam || user.user_type === 'TEAM_OWNER') && (
        <TeamCard team={myTeam} canCreate={user.user_type === 'TEAM_OWNER' && !myTeam} />
      )}

      {/* Ações rápidas */}
      <div>
        <SectionHeader title="Ações Rápidas" subtitle="Acesso rápido às principais funcionalidades" />
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {user.user_type === 'TEAM_OWNER' && !myTeam && (
            <QuickActionTile title="Criar Time" description="Monte seu elenco" icon={<Plus className="h-6 w-6" />} href="/teams/create" color="gold" />
          )}
          <QuickActionTile title="Jogadores" description="Ranking individual" icon={<UserSquare className="h-6 w-6" />} href="/statistics" color="gold" />
          <QuickActionTile title="Campeonatos" description="Ver disponíveis" icon={<Trophy className="h-6 w-6" />} href="/championships" color="gold" />
          <QuickActionTile title="Ranking" description="Ver classificação" icon={<Award className="h-6 w-6" />} href="/statistics" color="gold" />
          <QuickActionTile title="Partidas" description="Histórico completo" icon={<Calendar className="h-6 w-6" />} href="/matches" color="gold" />
          {canManageChampionships && (
            <QuickActionTile title="Admin" description="Painel administrativo" icon={<Shield className="h-6 w-6" />} href="/admin" color="gold" prefetch={false} />
          )}
        </div>
      </div>

      {/* Primeiros passos (novos usuários) */}
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
