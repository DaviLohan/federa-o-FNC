'use client';

import { Bell, CheckCheck, Inbox } from 'lucide-react';

interface NotificationEmptyStateProps {
  /** Contexto do estado vazio */
  variant: 'no-notifications' | 'all-read' | 'no-read' | 'no-results';
  /** 'compact' para dropdown, 'full' para página */
  size?: 'compact' | 'full';
}

const EMPTY_STATES: Record<
  NotificationEmptyStateProps['variant'],
  { icon: typeof Bell; title: string; description: string }
> = {
  'no-notifications': {
    icon: Inbox,
    title: 'Nenhuma notificação',
    description: 'Você está em dia! Não há notificações no momento.',
  },
  'all-read': {
    icon: CheckCheck,
    title: 'Tudo lido!',
    description: 'Você não tem notificações não lidas.',
  },
  'no-read': {
    icon: Bell,
    title: 'Nenhuma notificação lida',
    description: 'As notificações que você ler aparecerão aqui.',
  },
  'no-results': {
    icon: Inbox,
    title: 'Nenhum resultado',
    description: 'Nenhuma notificação encontrada com os filtros selecionados.',
  },
};

/**
 * Estado vazio para notificações — compartilhado entre dropdown e página.
 */
export function NotificationEmptyState({
  variant,
  size = 'full',
}: NotificationEmptyStateProps) {
  const state = EMPTY_STATES[variant];
  const Icon = state.icon;
  const isCompact = size === 'compact';

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        isCompact ? 'py-10 px-4' : 'py-16 px-6'
      }`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-2xl bg-surface2 border border-border ${
          isCompact ? 'w-12 h-12' : 'w-16 h-16'
        }`}
      >
        <Icon
          className={`text-muted ${isCompact ? 'w-6 h-6' : 'w-8 h-8'}`}
        />
      </div>
      <h3
        className={`font-semibold text-text ${
          isCompact ? 'text-sm mb-1' : 'text-lg mb-2'
        }`}
      >
        {state.title}
      </h3>
      <p
        className={`text-muted ${
          isCompact ? 'text-xs max-w-[200px]' : 'text-sm max-w-[300px]'
        }`}
      >
        {state.description}
      </p>
    </div>
  );
}
