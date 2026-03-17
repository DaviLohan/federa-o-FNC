'use client';

import { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, Trash2 } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsAPI } from '@/lib/api';
import Link from 'next/link';

/** Mini-botões Aprovar/Recusar para TEAM_LEAVE_REQUEST no dropdown */
function LeaveRequestActions({
  leaveRequestId,
  onDone,
}: {
  leaveRequestId: number;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();

  const approveMutation = useMutation({
    mutationFn: () => leaveRequestsAPI.approve(leaveRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      onDone();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => leaveRequestsAPI.reject(leaveRequestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
      onDone();
    },
  });

  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <div className="flex gap-1.5 mt-1.5">
      <button
        onClick={(e) => { e.stopPropagation(); approveMutation.mutate(); }}
        disabled={busy}
        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gold/10 text-gold border border-gold/30 hover:bg-gold/20 transition-colors disabled:opacity-50"
      >
        {approveMutation.isPending ? '...' : 'Aprovar'}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); rejectMutation.mutate(); }}
        disabled={busy}
        className="px-2 py-0.5 rounded text-[11px] font-semibold bg-surface2 text-muted border border-border hover:text-text transition-colors disabled:opacity-50"
      >
        {rejectMutation.isPending ? '...' : 'Recusar'}
      </button>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [resolvedIds, setResolvedIds] = useState<Set<number>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } =
    useNotifications();

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TEAM_INVITATION':
        return '📧';
      case 'TEAM_LEAVE_REQUEST':
        return '🚪';
      case 'INVITATION_ACCEPTED':
        return '✅';
      case 'INVITATION_DECLINED':
        return '❌';
      case 'MATCH_SCHEDULED':
        return '📅';
      case 'MATCH_RESULT':
        return '⚽';
      case 'MATCH_CANCELLED':
        return '🚫';
      case 'CHAMPIONSHIP_ENROLLED':
        return '🏆';
      case 'CHAMPIONSHIP_STARTED':
        return '🎮';
      case 'CONTESTATION_SUBMITTED':
        return '⚠️';
      case 'CONTESTATION_REVIEWED':
        return '👨‍⚖️';
      case 'WALKOVER_DECLARED':
        return '🏁';
      case 'PENALTY_ISSUED':
        return '🟥';
      case 'PENALTY_APPEAL_REVIEWED':
        return '📋';
      default:
        return '🔔';
    }
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / 60000);

    if (diffInMins < 1) return 'Agora';
    if (diffInMins < 60) return `${diffInMins}m atrás`;
    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d atrás`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 transition-colors hover:bg-surface1"
      >
        <Bell className="h-5 w-5 text-muted hover:text-text" />
        {unreadCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-r from-gold to-gold2 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-surface1 shadow-xl">
          {/* Header */}
          <div className="border-b border-border bg-surface2 px-4 py-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text">Notificações</h3>
              {notifications.length > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-1 text-xs text-gold transition-colors hover:text-gold/80"
                >
                  <Check className="h-3 w-3" />
                  <span>Marcar todas como lidas</span>
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Bell className="mb-3 h-12 w-12 text-muted" />
                <p className="text-sm text-muted">Nenhuma notificação</p>
                <p className="mt-1 text-xs text-muted/70">
                  Você está em dia!
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.slice(0, 10).map((notification: any) => {
                  const isLeaveRequest =
                    notification.notification_type === 'TEAM_LEAVE_REQUEST' &&
                    notification.related_leave_request_id;
                  const isResolved = resolvedIds.has(notification.id);

                  return (
                    <div
                      key={notification.id}
                      className={`group relative px-4 py-3 transition-colors hover:bg-surface2 ${
                        !notification.is_read ? 'bg-gold/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {/* Icon */}
                        <div className="text-2xl">
                          {getNotificationIcon(notification.notification_type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1">
                          <div className="mb-1 flex items-start justify-between gap-2">
                            <h4 className="text-sm font-medium text-text">
                              {notification.title}
                            </h4>
                            {!notification.is_read && (
                              <div className="h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                            )}
                          </div>
                          <p className="mb-2 text-xs text-muted">
                            {notification.message}
                          </p>

                          {/* Mini-ações para leave request */}
                          {isLeaveRequest && !isResolved && (
                            <LeaveRequestActions
                              leaveRequestId={notification.related_leave_request_id}
                              onDone={() => {
                                setResolvedIds((prev) => new Set(prev).add(notification.id));
                                if (!notification.is_read) markAsRead(notification.id);
                              }}
                            />
                          )}
                          {isLeaveRequest && isResolved && (
                            <p className="text-[11px] text-gold mt-1">Ação realizada.</p>
                          )}

                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs text-muted/70">
                              {getTimeAgo(notification.created_at)}
                            </span>
                            {notification.action_url && (
                              <Link
                                href={notification.action_url}
                                onClick={() => {
                                  if (!notification.is_read) {
                                    markAsRead(notification.id);
                                  }
                                  setIsOpen(false);
                                }}
                                className="text-xs text-gold hover:text-gold/80"
                              >
                                Ver detalhes →
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          {!notification.is_read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="rounded p-1 text-muted transition-colors hover:bg-surface1 hover:text-text"
                              title="Marcar como lida"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="rounded p-1 text-muted transition-colors hover:bg-surface1 hover:text-red-500"
                            title="Deletar"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border bg-surface2 px-4 py-2 text-center">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-gold transition-colors hover:text-gold/80"
              >
                Ver todas as notificações
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


