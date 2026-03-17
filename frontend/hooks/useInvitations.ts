import { useQuery } from '@tanstack/react-query';
import { invitationsAPI } from '@/lib/api';

export function usePendingInvitations() {
  return useQuery({
    queryKey: ['invitations', 'pending'],
    queryFn: () => invitationsAPI.getMyInvitations(),
    refetchInterval: 30000,
    staleTime: 30000, // Em sincronia com o intervalo — evita refetch duplo em cada mount
  });
}

export function useInvitationCount() {
  const { data } = usePendingInvitations();
  return data?.results?.length || 0;
}
