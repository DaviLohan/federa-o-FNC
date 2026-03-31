'use client';

import { useState } from 'react';
import { Bell, Filter, CheckCheck, Inbox } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } =
    useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filtrar notificações
  const filteredNotifications = notifications.filter((notification: any) => {
    // Filtro por status de leitura
    if (filter === 'unread' && notification.is_read) return false;
    if (filter === 'read' && !notification.is_read) return false;

    // Filtro por tipo
    if (typeFilter !== 'all' && notification.notification_type !== typeFilter) return false;

    return true;
  });

  // Obter tipos únicos de notificações
  const notificationTypes = Array.from(
    new Set(notifications.map((n: any) => n.notification_type as string))
  ) as string[];

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      TEAM_INVITATION: 'Convites de Equipe',
      INVITATION_ACCEPTED: 'Convites Aceitos',
      INVITATION_DECLINED: 'Convites Recusados',
      MATCH_SCHEDULED: 'Partidas Agendadas',
      MATCH_RESULT: 'Resultados',
      MATCH_CANCELLED: 'Partidas Canceladas',
      CHAMPIONSHIP_ENROLLED: 'Inscrições',
      CHAMPIONSHIP_STARTED: 'Campeonatos',
      CONTESTATION_SUBMITTED: 'Contestações',
      CONTESTATION_REVIEWED: 'Revisões',
      WALKOVER_DECLARED: 'W.O.',
      PENALTY_ISSUED: 'Penalidades',
      PENALTY_APPEAL_REVIEWED: 'Recursos',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border bg-surface1">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-xl bg-gradient-to-br from-gold to-gold2 p-3">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text">Notificações</h1>
                  <p className="text-sm text-muted">
                    Acompanhe todas as suas atualizações
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-gold">{unreadCount}</div>
                <div className="text-xs text-muted">Não lidas</div>
              </div>
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-text">{notifications.length}</div>
                <div className="text-xs text-muted">Total</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="border-b border-border bg-surface1">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Read Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted" />
              <div className="flex flex-wrap gap-1 rounded-lg bg-surface2 p-1">
                <button
                  onClick={() => setFilter('all')}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Todas
                  {filter === 'all' && (
                    <span className="ml-2 text-xs">({notifications.length})</span>
                  )}
                </button>
                <button
                  onClick={() => setFilter('unread')}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    filter === 'unread'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Não lidas
                  {filter === 'unread' && (
                    <span className="ml-2 text-xs">({unreadCount})</span>
                  )}
                </button>
                <button
                  onClick={() => setFilter('read')}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    filter === 'read'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:text-text'
                  }`}
                >
                  Lidas
                  {filter === 'read' && (
                    <span className="ml-2 text-xs">
                      ({notifications.length - unreadCount})
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Type Filter */}
            {notificationTypes.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-lg border border-border bg-surface2 px-4 py-2 text-sm text-text transition-colors focus:border-gold focus:outline-none"
                >
                  <option value="all">Todos os tipos</option>
                  {notificationTypes.map((type: string) => (
                    <option key={type} value={type}>
                      {getTypeLabel(type)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold/90"
              >
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        <div className="overflow-hidden rounded-xl border border-border bg-surface1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-surface2 border-t-gold"></div>
              <p className="text-sm text-muted">Carregando notificações...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              {filter === 'all' ? (
                <>
                  <Inbox className="mb-4 h-16 w-16 text-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-text">
                    Nenhuma notificação
                  </h3>
                  <p className="text-sm text-muted">
                    Você está em dia! Não há notificações no momento.
                  </p>
                </>
              ) : filter === 'unread' ? (
                <>
                  <CheckCheck className="mb-4 h-16 w-16 text-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-text">
                    Tudo lido!
                  </h3>
                  <p className="text-sm text-muted">
                    Você não tem notificações não lidas.
                  </p>
                </>
              ) : (
                <>
                  <Bell className="mb-4 h-16 w-16 text-muted" />
                  <h3 className="mb-2 text-lg font-semibold text-text">
                    Nenhuma notificação lida
                  </h3>
                  <p className="text-sm text-muted">
                    As notificações que você ler aparecerão aqui.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div>
              {filteredNotifications.map((notification: any) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination Info */}
        {filteredNotifications.length > 0 && (
          <div className="mt-4 text-center">
            <p className="text-sm text-muted">
              Mostrando {filteredNotifications.length} de {notifications.length}{' '}
              notificações
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
