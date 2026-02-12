import { useQuery } from '@tanstack/react-query';
import { championshipsAPI, matchesAPI, invitationsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyTeam } from './useMyTeam';
import { apiClient } from '@/lib/api-client';

/**
 * Hook agregado para buscar todos os dados necessários do dashboard
 */
export function useDashboardData() {
  const user = useAuthStore((state) => state.user);

  // Buscar time do usuário
  const {
    data: myTeam,
    isLoading: isLoadingTeam,
    error: teamError,
  } = useMyTeam();

  // Buscar campeonatos abertos
  const {
    data: championshipsData,
    isLoading: isLoadingChampionships,
  } = useQuery({
    queryKey: ['championships', { status: 'OPEN' }],
    queryFn: () => championshipsAPI.getAll({ status: 'OPEN' }),
  });

  // Buscar próximas partidas (scheduled + live)
  const {
    data: upcomingMatchesData,
    isLoading: isLoadingMatches,
  } = useQuery({
    queryKey: ['matches', 'upcoming'],
    queryFn: () => matchesAPI.getAll({ status: 'SCHEDULED,LIVE', ordering: 'scheduled_date' }),
  });

  // Buscar convites pendentes (se for jogador)
  const {
    data: invitationsData,
    isLoading: isLoadingInvitations,
  } = useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => invitationsAPI.getMyInvitations(),
    enabled: user?.user_type === 'PLAYER',
  });

  // Buscar enrollments do usuário (se tem time)
  const {
    data: enrollmentsData,
    isLoading: isLoadingEnrollments,
  } = useQuery({
    queryKey: ['my-enrollments'],
    queryFn: async () => {
      if (!myTeam?.id) return { results: [], count: 0 };
      const response = await apiClient.get<any>(`/api/v1/enrollments/?team=${myTeam.id}`);
      return response;
    },
    enabled: !!myTeam?.id,
  });

  const championships = championshipsData?.results || [];
  const upcomingMatches = upcomingMatchesData?.results || [];
  const pendingInvitations = invitationsData?.results || [];
  const myEnrollments = enrollmentsData?.results || [];

  // Calcular estatísticas
  const stats = {
    totalChampionships: championshipsData?.count || 0,
    openChampionships: championships.length,
    upcomingMatches: upcomingMatches.length,
    pendingInvitations: pendingInvitations.length,
    hasTeam: !!myTeam && !teamError,
    hasEnrollment: myEnrollments.length > 0,
  };

  const isLoading =
    isLoadingTeam || isLoadingChampionships || isLoadingMatches || isLoadingInvitations || isLoadingEnrollments;

  return {
    myTeam,
    championships,
    upcomingMatches,
    pendingInvitations,
    stats,
    isLoading,
  };
}
