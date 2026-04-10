'use client';

import { useState } from 'react';
import { Check, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';
import { NotificationIcon } from './NotificationIcon';
import { LeaveRequestActions } from './LeaveRequestActions';
import {
  type Notification,
  getNotificationConfig,
  getTimeAgo,
  getBadgeClasses,
} from '@/lib/utils/notification-utils';
import { formatDateTime } from '@/lib/utils/date';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
  onDelete: (id: number) => void;
  /** 'compact' para dropdown, 'full' para página */
  variant?: 'compact' | 'full';
  onClose?: () => void;
}

/**
 * Item de notificação compartilhado entre dropdown e página.
 * - compact: padding menor, sem badge de tipo, sem data completa
 * - full: padding maior, badge de tipo, data completa, borda esquerda
 */
export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  variant = 'full',
  onClose,
}: NotificationItemProps) {
  const [actionDone, setActionDone] = useState(false);
  const config = getNotificationConfig(notification.notification_type);
  const isCompact = variant === 'compact';

  const isLeaveRequest =
    notification.notification_type === 'TEAM_LEAVE_REQUEST' &&
    !!notification.related_leave_request_id;
  const isActionable = isLeaveRequest && !actionDone;

  const handleLinkClick = () => {
    if (!notification.is_read) onMarkAsRead(notification.id);
    if (onClose) onClose();
  };

  const handleLeaveRequestDone = () => {
    setActionDone(true);
    if (!notification.is_read) onMarkAsRead(notification.id);
  };

  return (
    <div
      className={`group relative transition-all hover:bg-surface2 ${
        isCompact ? 'px-4 py-3' : 'px-6 py-4'
      } ${
        !notification.is_read
          ? isCompact
            ? 'bg-gold/5'
            : 'bg-gold/5 border-l-4 border-l-gold'
          : ''
      }`}
    >
      <div className={`flex items-start ${isCompact ? 'gap-3' : 'gap-4'}`}>
        {/* Icon */}
        <NotificationIcon
          type={notification.notification_type}
          size={isCompact ? 'sm' : 'md'}
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4
                  className={`font-medium text-text truncate ${
                    isCompact ? 'text-sm' : 'text-sm font-semibold'
                  }`}
                >
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <span className="h-2 w-2 flex-shrink-0 rounded-full bg-gold" />
                )}
              </div>

              {/* Badge de tipo — só no variant full */}
              {!isCompact && (
                <span
                  className={`inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getBadgeClasses(
                    config.color
                  )}`}
                >
                  {config.label}
                </span>
              )}
            </div>
          </div>

          {/* Message */}
          <p
            className={`text-muted leading-relaxed ${
              isCompact ? 'text-xs mb-1.5' : 'text-sm mb-3'
            }`}
          >
            {notification.message}
          </p>

          {/* Leave Request Actions */}
          {isActionable && (
            <LeaveRequestActions
              leaveRequestId={notification.related_leave_request_id!}
              onDone={handleLeaveRequestDone}
              variant={isCompact ? 'compact' : 'full'}
            />
          )}
          {actionDone && isLeaveRequest && (
            <p className={`text-gold ${isCompact ? 'text-[11px] mt-1' : 'text-xs mt-1 mb-2'}`}>
              Ação realizada.
            </p>
          )}

          {/* Footer / Meta */}
          <div
            className={`flex items-center justify-between ${
              isCompact ? 'mt-1.5' : 'mt-2'
            }`}
          >
            <div className="flex items-center gap-2 text-xs text-muted/70">
              {!isCompact && <Clock className="h-3 w-3" />}
              <span>{getTimeAgo(notification.created_at)}</span>
              {!isCompact && (
                <>
                  <span>·</span>
                  <span>{formatDateTime(notification.created_at)}</span>
                </>
              )}
            </div>

            {notification.action_url && (
              <Link
                href={notification.action_url}
                onClick={handleLinkClick}
                className={`font-medium text-gold transition-colors hover:text-gold/80 ${
                  isCompact ? 'text-xs' : 'text-sm'
                }`}
              >
                Ver detalhes →
              </Link>
            )}
          </div>
        </div>

        {/* Actions (mark read / delete) */}
        <div
          className={`flex flex-col gap-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 ${
            isCompact ? '' : 'gap-2'
          }`}
        >
          {!notification.is_read && (
            <button
              onClick={() => onMarkAsRead(notification.id)}
              className={`rounded text-muted transition-colors hover:bg-surface1 hover:text-text ${
                isCompact ? 'p-1' : 'p-2 rounded-lg'
              }`}
              title="Marcar como lida"
            >
              <Check className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
            </button>
          )}
          <button
            onClick={() => {
              if (isCompact || confirm('Tem certeza que deseja deletar esta notificação?')) {
                onDelete(notification.id);
              }
            }}
            className={`rounded text-muted transition-colors hover:bg-surface1 hover:text-red-500 ${
              isCompact ? 'p-1' : 'p-2 rounded-lg'
            }`}
            title="Deletar"
          >
            <Trash2 className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
          </button>
        </div>
      </div>
    </div>
  );
}
