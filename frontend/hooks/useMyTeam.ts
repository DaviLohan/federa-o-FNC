import { useQuery } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';

function isNotFoundError(error: unknown) {
  return !!error && typeof error === 'object' && 'response' in error && (error as any).response?.status === 404;
}

/**
 * Hook para buscar o time do usuário logado (como dono ou membro)
 */
export function useMyTeam() {
  return useQuery({
    queryKey: ['my-team'],
    queryFn: async () => {
      try {
        return await teamsAPI.getMyTeam();
      } catch (error) {
        if (isNotFoundError(error)) {
          return null;
        }
        throw error;
      }
    },
    retry: false, // Não retentar se retornar 404 (sem time)
  });
}
