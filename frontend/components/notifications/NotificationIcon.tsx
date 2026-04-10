'use client';

import {
  getNotificationConfig,
  getIconContainerClasses,
  type NotificationColor,
} from '@/lib/utils/notification-utils';

interface NotificationIconProps {
  type: string;
  /** 'sm' para dropdown, 'md' para página */
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Ícone de notificação com container estilizado por tipo.
 * Substitui os emojis antigos por ícones lucide-react padronizados.
 */
export function NotificationIcon({ type, size = 'md', className = '' }: NotificationIconProps) {
  const config = getNotificationConfig(type);
  const colorClasses = getIconContainerClasses(config.color);

  const sizeClasses = size === 'sm'
    ? 'w-8 h-8 rounded-lg'
    : 'w-10 h-10 rounded-xl';

  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  const Icon = config.icon;

  return (
    <div
      className={`flex-shrink-0 flex items-center justify-center border ${colorClasses} ${sizeClasses} ${className}`}
    >
      <Icon className={iconSize} />
    </div>
  );
}
