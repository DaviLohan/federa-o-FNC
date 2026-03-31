import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsAPI } from '@/lib/api';

/**
 * Hook para gerenciar notificações do usuário.
 * Polling único a cada 30s — o unreadCount é derivado da lista local,
 * eliminando a request duplicada para /notifications/unread-count/.
 */
export function useNotifications() {
  const queryClient = useQueryClient();

  // Um único fetch com polling — sem request duplicada para o count
  const {
    data: notificationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsAPI.getAll({ ordering: '-created_at' }),
    refetchInterval: 30000,
    staleTime: 30000,
  });

  // Marcar como lida
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => notificationsAPI.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Marcar todas como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationsAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  // Deletar notificação
  const deleteMutation = useMutation({
    mutationFn: (id: number) => notificationsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const notifications = (notificationsData as any)?.results || [];
  // Derivado da lista — sem request extra para /unread-count/
  const unreadCount: number = notifications.filter((n: any) => !n.is_read).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
    refetch,
  };
}
