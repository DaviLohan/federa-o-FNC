import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';

/**
 * Hook para buscar o time do usuário logado (como dono ou membro)
 */
export function useMyTeam() {
  return useQuery({
    queryKey: ['my-team'],
    queryFn: () => teamsAPI.getMyTeam(),
    retry: false, // Não retentar se retornar 404 (sem time)
  });
}
