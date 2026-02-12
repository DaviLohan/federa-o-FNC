import { useQuery } from '@tanstack/react-query';
import { invitationsAPI } from '@/lib/api';

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => invitationsAPI.getMyInvitations(),
    refetchInterval: 30000, // Atualizar a cada 30 segundos
    staleTime: 0, // Sempre considerar dados "stale"
  });
}

export function useInvitationCount() {
  const { data } = usePendingInvitations();
  return data?.results?.length || 0;
}
