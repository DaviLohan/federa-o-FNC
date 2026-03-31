'use client';

import { useQuery } from '@tanstack/react-query';
import { championshipsAPI, matchesAPI } from '@/lib/api';
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
    staleTime: 30000,
  });

  // Buscar partidas do campeonato
  const {
    data: matchesResponse,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['matches', championshipId],
    queryFn: () =>
      matchesAPI.getAll({
        championship: championshipId,
        ordering: '-scheduled_date',
      }),
    enabled: !!championshipId,
    staleTime: 30000,
  });

  const isLoading = isLoadingChampionship;
  const standings = championship?.standings || [];
  const bracket = championship?.bracket || undefined;
  const enrollments = championship?.enrollments || [];

  // Only consider championship error as critical
  const error = championshipError;

  const refetchAll = () => {
    refetchChampionship();
    refetchMatches();
  };

  return {
    championship,
    standings,
    bracket,
    matches: matchesResponse?.results || [],
    enrollments,
    enrolledTeamsCount: enrollments.length,
    isLoading,
    isLoadingStandings: false,
    isLoadingBracket: false,
    error,
    standingsError: null,
    bracketError: null,
    refetch: refetchAll,
    refetchChampionship,
    refetchStandings: refetchChampionship,
    refetchBracket: refetchChampionship,
    refetchMatches,
    refetchEnrollments: refetchChampionship,
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
    staleTime: 30000,
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
