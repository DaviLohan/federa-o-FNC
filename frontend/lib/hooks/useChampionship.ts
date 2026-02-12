'use client';

import { useQuery } from '@tanstack/react-query';
import { championshipsAPI, matchesAPI } from '@/lib/api';
import { apiClient } from '@/lib/api-client';
import type { Championship, Standings, Bracket, Match } from '@/types';

/**
 * Hook para buscar dados de um campeonato específico
 */
export function useChampionship(championshipId: number | null) {
  // Buscar dados básicos do campeonato
  const {
    data: championship,
    isLoading: isLoadingChampionship,
    error: championshipError,
    refetch: refetchChampionship,
  } = useQuery({
    queryKey: ['championship', championshipId],
    queryFn: () => championshipsAPI.getById(championshipId!),
    enabled: !!championshipId,
  });

  // Buscar classificação (apenas para campeonatos tipo LEAGUE)
  const {
    data: standings,
    isLoading: isLoadingStandings,
    error: standingsError,
    refetch: refetchStandings,
  } = useQuery({
    queryKey: ['standings', championshipId],
    queryFn: async () => {
      const response = await apiClient.get<Standings[]>(
        `/api/v1/championships/${championshipId}/standings/`
      );
      return response;
    },
    enabled: !!championshipId && !!championship && championship.championship_type === 'LEAGUE',
  });

  // Buscar chaveamento (apenas para campeonatos tipo KNOCKOUT)
  const {
    data: bracket,
    isLoading: isLoadingBracket,
    error: bracketError,
    refetch: refetchBracket,
  } = useQuery({
    queryKey: ['bracket', championshipId],
    queryFn: async () => {
      const response = await apiClient.get<Bracket>(
        `/api/v1/championships/${championshipId}/bracket/`
      );
      return response;
    },
    enabled: !!championshipId && championship?.championship_type === 'KNOCKOUT',
  });

  // Buscar partidas do campeonato
  const {
    data: matchesResponse,
    isLoading: isLoadingMatches,
    error: matchesError,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['matches', championshipId],
    queryFn: () =>
      matchesAPI.getAll({
        championship: championshipId,
        ordering: '-scheduled_date',
      }),
    enabled: !!championshipId,
  });

  // Buscar times inscritos
  const {
    data: enrollmentsResponse,
    isLoading: isLoadingEnrollments,
    error: enrollmentsError,
    refetch: refetchEnrollments,
  } = useQuery({
    queryKey: ['enrollments', championshipId],
    queryFn: () => championshipsAPI.getEnrollments(championshipId!),
    enabled: !!championshipId,
  });

  const isLoading = isLoadingChampionship;

  // Only consider championship error as critical
  // Other errors (standings, bracket, matches, enrollments) are optional
  const error = championshipError;

  const refetchAll = () => {
    refetchChampionship();
    refetchStandings();
    refetchBracket();
    refetchMatches();
    refetchEnrollments();
  };

  return {
    championship,
    standings: standings || [],
    bracket,
    matches: matchesResponse?.results || [],
    enrollments: enrollmentsResponse?.results || [],
    enrolledTeamsCount: enrollmentsResponse?.count || 0,
    isLoading,
    isLoadingStandings,
    isLoadingBracket,
    error,
    standingsError,
    bracketError,
    refetch: refetchAll,
    refetchChampionship,
    refetchStandings,
    refetchBracket,
    refetchMatches,
    refetchEnrollments,
  };
}

/**
 * Hook para buscar lista de campeonatos (para listagem)
 */
export function useChampionships(filters?: {
  status?: string;
  search?: string;
  ordering?: string;
}) {
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['championships', filters],
    queryFn: () => championshipsAPI.getAll(filters),
  });

  return {
    championships: response?.results || [],
    count: response?.count || 0,
    next: response?.next,
    previous: response?.previous,
    isLoading,
    error,
    refetch,
  };
}
