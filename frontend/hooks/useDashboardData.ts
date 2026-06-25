import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  championshipsAPI,
  matchesAPI,
  invitationsAPI,
  statisticsAPI,
  platformStatsAPI,
} from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyTeam } from './useMyTeam';
import { apiClient } from '@/lib/api-client';
import type {
  CompetitiveRankingPayload,
  CompetitiveMyRankingPayload,
  PlayerLeaderboardPayload,
  GlobalTeamRankingRow,
  WeeklySelectionPayload,
  PlayerProfilePayload,
} from '@/types';

/**
 * Hook agregado do dashboard inteligente: dados operacionais (time, campeonatos,
 * partidas, convites) + dados competitivos (ranking, artilharia/assistências,
 * classificação de times, seleção da semana) + totais da plataforma.
 */
export function useDashboardData() {
  const user = useAuthStore((state) => state.user);
  const isPlayer = user?.user_type === 'PLAYER';

  const { data: myTeam, isLoading: isLoadingTeam } = useMyTeam();

  const { data: championshipsData, isLoading: isLoadingChampionships } = useQuery({
    queryKey: ['championships', { status: 'OPEN' }],
    queryFn: () => championshipsAPI.getAll({ status: 'OPEN' }),
    staleTime: 30000,
  });

  // Todos os campeonatos (para auto-selecionar o da seleção da semana)
  const { data: allChampionshipsData } = useQuery({
    queryKey: ['championships', 'all-dashboard'],
    queryFn: () => championshipsAPI.getAll({ ordering: '-created_at', page_size: 50 }),
    staleTime: 60000,
  });

  const { data: upcomingMatchesData, isLoading: isLoadingMatches } = useQuery({
    queryKey: ['matches', 'upcoming'],
    queryFn: () => matchesAPI.getAll({ status: 'SCHEDULED,LIVE', ordering: 'scheduled_date' }),
    staleTime: 30000,
  });

  const { data: recentResultsData, isLoading: isLoadingResults } = useQuery({
    queryKey: ['matches', 'recent-results'],
    queryFn: () => matchesAPI.getAll({ status: 'FINISHED', ordering: '-scheduled_date' }),
    staleTime: 60000,
  });

  const { data: invitationsData } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => invitationsAPI.getMyInvitations(),
    enabled: isPlayer,
    staleTime: 30000,
  });

  const { data: enrollmentsData, isLoading: isLoadingEnrollments } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      if (!myTeam?.id) return { results: [], count: 0 };
      return apiClient.get<any>(`/api/v1/enrollments/?team=${myTeam.id}`);
    },
    enabled: !!myTeam?.id,
    staleTime: 30000,
  });

  // ── Dados competitivos ───────────────────────────────────────────────────
  const { data: ranking, isLoading: isLoadingRanking } = useQuery({
    queryKey: ['dashboard', 'competitive-ranking'],
    queryFn: () => statisticsAPI.getCompetitiveRankings(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: myRank, isLoading: isLoadingMyRank } = useQuery({
    queryKey: ['dashboard', 'my-rank', user?.id],
    queryFn: () => statisticsAPI.getCompetitiveRankingMe(),
    enabled: isPlayer,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Perfil de desempenho do próprio jogador (carreira, evolução, histórico)
  const myProfileId = isPlayer ? user?.player_profile?.id : undefined;
  const { data: myProfile, isLoading: isLoadingMyProfile } = useQuery({
    queryKey: ['dashboard', 'my-profile', myProfileId],
    queryFn: () => statisticsAPI.getPlayerProfile(Number(myProfileId)),
    enabled: !!myProfileId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: topScorers, isLoading: isLoadingScorers } = useQuery({
    queryKey: ['dashboard', 'top-scorers'],
    queryFn: () => statisticsAPI.getPlayerLeaderboard({ sort: 'goals', limit: 5 }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: topAssisters, isLoading: isLoadingAssisters } = useQuery({
    queryKey: ['dashboard', 'top-assisters'],
    queryFn: () => statisticsAPI.getPlayerLeaderboard({ sort: 'assists', limit: 5 }),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: teamRanking, isLoading: isLoadingTeamRanking } = useQuery({
    queryKey: ['dashboard', 'global-team-ranking'],
    queryFn: () => statisticsAPI.getGlobalRankings(),
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: platformStats } = useQuery({
    queryKey: ['dashboard', 'platform-stats'],
    queryFn: () => platformStatsAPI.get(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Seleção da semana — auto-selecionar campeonato (preferir IN_PROGRESS)
  const preferredChampionshipId = useMemo(() => {
    const all = allChampionshipsData?.results ?? [];
    if (all.length === 0) return null;
    const preferred = all.find((c: any) => c.status === 'IN_PROGRESS') || all[0];
    return preferred?.id ?? null;
  }, [allChampionshipsData]);

  const { data: weeklySelection, isLoading: isLoadingWeekly } = useQuery({
    queryKey: ['dashboard', 'weekly-selection', preferredChampionshipId],
    queryFn: () => statisticsAPI.getWeeklySelection(Number(preferredChampionshipId)),
    enabled: !!preferredChampionshipId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const championships = championshipsData?.results || [];
  const upcomingMatches = upcomingMatchesData?.results || [];
  const recentResults = recentResultsData?.results || [];
  const pendingInvitations = invitationsData?.results || [];
  const myEnrollments = enrollmentsData?.results || [];

  const stats = {
    totalChampionships: championshipsData?.count || 0,
    openChampionships: championships.length,
    upcomingMatches: upcomingMatches.length,
    pendingInvitations: pendingInvitations.length,
    hasTeam: !!myTeam,
    hasEnrollment: myEnrollments.length > 0,
  };

  const isLoading =
    isLoadingTeam || isLoadingChampionships || isLoadingMatches || isLoadingEnrollments;

  return {
    myTeam,
    championships,
    upcomingMatches,
    recentResults,
    pendingInvitations,
    stats,
    isLoading,
    // competitivos
    ranking: ranking as CompetitiveRankingPayload | undefined,
    myRank: myRank as CompetitiveMyRankingPayload | undefined,
    topScorers: topScorers as PlayerLeaderboardPayload | undefined,
    topAssisters: topAssisters as PlayerLeaderboardPayload | undefined,
    teamRanking: (teamRanking?.results ?? []) as GlobalTeamRankingRow[],
    weeklySelection: weeklySelection as WeeklySelectionPayload | undefined,
    myProfile: myProfile as PlayerProfilePayload | undefined,
    platformStats,
    loading: {
      results: isLoadingResults,
      ranking: isLoadingRanking,
      myRank: isLoadingMyRank,
      scorers: isLoadingScorers,
      assisters: isLoadingAssisters,
      teamRanking: isLoadingTeamRanking,
      weekly: isLoadingWeekly,
      myProfile: isLoadingMyProfile,
    },
  };
}
