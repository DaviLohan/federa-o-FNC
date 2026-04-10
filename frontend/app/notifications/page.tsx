'use client';

import { useState, useMemo } from 'react';
import { Bell, Filter, CheckCheck, Calendar } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { NotificationEmptyState } from '@/components/notifications/NotificationEmptyState';
import { PageHeader } from '@/components/shared/ui/PageHeader';
import { Skeleton } from '@/components/shared/ui/Skeleton';
import {
  type Notification,
  getNotificationConfig,
  groupNotificationsByDate,
} from '@/lib/utils/notification-utils';

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, isLoading } =
    useNotifications();

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Filtrar notificações
  const filteredNotifications = useMemo(() => {
    return (notifications as Notification[]).filter((notification) => {
      if (filter === 'unread' && notification.is_read) return false;
      if (filter === 'read' && !notification.is_read) return false;
      if (typeFilter !== 'all' && notification.notification_type !== typeFilter) return false;
      return true;
    });
  }, [notifications, filter, typeFilter]);

  // Agrupar por data
  const groupedNotifications = useMemo(
    () => groupNotificationsByDate(filteredNotifications),
    [filteredNotifications]
  );

  // Tipos únicos presentes nas notificações
  const notificationTypes = useMemo(() => {
    return Array.from(
      new Set((notifications as Notification[]).map((n) => n.notification_type))
    );
  }, [notifications]);

  // Determinar variante do empty state
  const emptyVariant = filter === 'unread'
    ? 'all-read'
    : filter === 'read'
      ? 'no-read'
      : typeFilter !== 'all'
        ? 'no-results'
        : 'no-notifications';

  const filterButtons: { key: typeof filter; label: string; count: number }[] = [
    { key: 'all', label: 'Todas', count: notifications.length },
    { key: 'unread', label: 'Não lidas', count: unreadCount },
    { key: 'read', label: 'Lidas', count: notifications.length - unreadCount },
  ];

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border bg-surface1">
        <div className="container mx-auto max-w-5xl px-4 py-8">
          <PageHeader
            title="Notificações"
            subtitle="Acompanhe todas as suas atualizações"
            icon={<Bell className="w-6 h-6" />}
            actions={
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-surface2 border border-border px-4 py-2.5 text-center">
                  <div className="text-2xl font-bold font-heading text-gold">{unreadCount}</div>
                  <div className="text-[11px] text-muted font-medium">Não lidas</div>
                </div>
                <div className="rounded-xl bg-surface2 border border-border px-4 py-2.5 text-center">
                  <div className="text-2xl font-bold font-heading text-text">{notifications.length}</div>
                  <div className="text-[11px] text-muted font-medium">Total</div>
                </div>
              </div>
            }
          />
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="border-b border-border bg-surface1/50">
        <div className="container mx-auto max-w-5xl px-4 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Read Status Filter */}
            <div className="flex items-center gap-3">
              <Filter className="h-4 w-4 text-muted flex-shrink-0" />
              <div className="flex flex-wrap gap-1 rounded-xl bg-surface2 border border-border p-1">
                {filterButtons.map(({ key, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setFilter(key)}
                    className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all ${
                      filter === key
                        ? 'bg-gold text-white shadow-sm shadow-gold/25'
                        : 'text-muted hover:text-text hover:bg-surface1'
                    }`}
                  >
                    {label}
                    {filter === key && (
                      <span className="ml-1.5 text-xs opacity-80">({count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Type Filter */}
              {notificationTypes.length > 1 && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface2 px-4 py-2 text-sm text-text transition-colors focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
                >
                  <option value="all">Todos os tipos</option>
                  {notificationTypes.map((type) => (
                    <option key={type} value={type}>
                      {getNotificationConfig(type).label}
                    </option>
                  ))}
                </select>
              )}

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="flex items-center gap-2 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition-all hover:bg-gold2 shadow-sm shadow-gold/25"
                >
                  <CheckCheck className="h-4 w-4" />
                  Marcar todas como lidas
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="container mx-auto max-w-5xl px-4 py-6">
        {isLoading ? (
          /* Loading skeleton */
          <div className="space-y-4">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <div className="overflow-hidden rounded-2xl border border-border bg-surface1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 px-6 py-4 border-b border-border last:border-b-0">
                  <Skeleton variant="circle" className="w-10 h-10 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          /* Empty state */
          <div className="overflow-hidden rounded-2xl border border-border bg-surface1">
            <NotificationEmptyState variant={emptyVariant} size="full" />
          </div>
        ) : (
          /* Grouped notifications */
          <div className="space-y-6">
            {groupedNotifications.map((group) => (
              <div key={group.label}>
                {/* Group header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <Calendar className="h-4 w-4 text-muted" />
                  <h2 className="text-sm font-heading font-semibold text-muted uppercase tracking-wider">
                    {group.label}
                  </h2>
                  <span className="text-xs text-muted/60 font-medium">
                    ({group.notifications.length})
                  </span>
                  <div className="flex-1 h-px bg-border/50" />
                </div>

                {/* Group items */}
                <div className="overflow-hidden rounded-2xl border border-border bg-surface1">
                  <div className="divide-y divide-border/50">
                    {group.notifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                        variant="full"
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Count */}
        {filteredNotifications.length > 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              Mostrando {filteredNotifications.length} de {notifications.length} notificações
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
