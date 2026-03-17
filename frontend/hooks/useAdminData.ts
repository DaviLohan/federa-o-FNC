import { useQuery } from '@tanstack/react-query';
import { adminAPI, teamsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';

/**
 * Hook para dados do painel administrativo
 * Apenas para usuários ADMIN e SUPERVISOR
 */
export function useAdminData() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.user_type === 'ADMIN' || user?.user_type === 'SUPERVISOR';

  // Buscar estatísticas globais
  const {
    data: stats,
    isLoading: isLoadingStats,
  } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminAPI.getStats(),
    enabled: isAdmin,
  });

  // Buscar todos os times (para admin)
  const {
    data: teamsData,
    isLoading: isLoadingTeams,
  } = useQuery({
    queryKey: ['admin', 'teams'],
    queryFn: () => teamsAPI.getAll(),
    enabled: isAdmin,
  });

  const teams = (teamsData as any)?.results || [];

  return {
    stats,
    teams,
    isLoading: isLoadingStats || isLoadingTeams,
    isAdmin,
  };
}
