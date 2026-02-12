'use client';

import { Check, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

interface NotificationItemProps {
  notification: {
    id: number;
    title: string;
    message: string;
    notification_type: string;
    is_read: boolean;
    created_at: string;
    action_url?: string;
  };
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  onClose?: () => void;
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onClose,
}: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TEAM_INVITATION':
        return '📧';
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

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'TEAM_INVITATION':
        return 'Convite de Equipe';
      case 'INVITATION_ACCEPTED':
        return 'Convite Aceito';
      case 'INVITATION_DECLINED':
        return 'Convite Recusado';
      case 'MATCH_SCHEDULED':
        return 'Partida Agendada';
      case 'MATCH_RESULT':
        return 'Resultado de Partida';
      case 'MATCH_CANCELLED':
        return 'Partida Cancelada';
      case 'CHAMPIONSHIP_ENROLLED':
        return 'Inscrição em Campeonato';
      case 'CHAMPIONSHIP_STARTED':
        return 'Campeonato Iniciado';
      case 'CONTESTATION_SUBMITTED':
        return 'Contestação Enviada';
      case 'CONTESTATION_REVIEWED':
        return 'Contestação Revisada';
      case 'WALKOVER_DECLARED':
        return 'W.O. Declarado';
      case 'PENALTY_ISSUED':
        return 'Penalidade Aplicada';
      case 'PENALTY_APPEAL_REVIEWED':
        return 'Recurso de Penalidade';
      default:
        return 'Notificação';
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
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} ${weeks === 1 ? 'semana' : 'semanas'} atrás`;
    }
    const months = Math.floor(diffInDays / 30);
    return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`group relative border-b border-border px-6 py-4 transition-all hover:bg-surface2 ${
        !notification.is_read ? 'bg-gold/5 border-l-4 border-l-gold' : ''
      }`}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface2 text-2xl">
            {getNotificationIcon(notification.notification_type)}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="mb-1 flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-text">
                  {notification.title}
                </h3>
                {!notification.is_read && (
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                )}
              </div>
              <span className="inline-flex items-center rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium text-muted">
                {getNotificationTypeLabel(notification.notification_type)}
              </span>
            </div>
          </div>

          {/* Message */}
          <p className="mb-3 text-sm text-muted leading-relaxed">
            {notification.message}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted/70">
              <Clock className="h-3 w-3" />
              <span>{getTimeAgo(notification.created_at)}</span>
              <span>•</span>
              <span>{formatDate(notification.created_at)}</span>
            </div>

            {notification.action_url && (
              <Link
                href={notification.action_url}
                onClick={() => {
                  if (!notification.is_read) {
                    onMarkAsRead(notification.id);
                  }
                  if (onClose) onClose();
                }}
                className="text-sm font-medium text-gold transition-colors hover:text-gold/80"
              >
                Ver detalhes →
              </Link>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 opacity-0 transition-opacity group-hover:opacity-100">
          {!notification.is_read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className="rounded-lg p-2 text-muted transition-colors hover:bg-surface1 hover:text-text"
              title="Marcar como lida"
            >
              <Check className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja deletar esta notificação?')) {
                onDelete(notification.id);
              }
            }}
            className="rounded-lg p-2 text-muted transition-colors hover:bg-surface1 hover:text-red-500"
            title="Deletar notificação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
