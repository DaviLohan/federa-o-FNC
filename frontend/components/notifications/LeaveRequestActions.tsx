'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { leaveRequestsAPI } from '@/lib/api';

interface LeaveRequestActionsProps {
  leaveRequestId: number;
  onDone: () => void;
  /** 'compact' para dropdown (botões menores), 'full' para página */
  variant?: 'compact' | 'full';
}

/**
 * Botões Aprovar/Recusar para notificações do tipo TEAM_LEAVE_REQUEST.
 * Componente único compartilhado pelo dropdown e pela página.
 */
export function LeaveRequestActions({
  leaveRequestId,
  onDone,
  variant = 'full',
}: LeaveRequestActionsProps) {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    queryClient.invalidateQueries({ queryKey: ['leave-requests'] });
    queryClient.invalidateQueries({ queryKey: ['team-members'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => leaveRequestsAPI.approve(leaveRequestId),
    onSuccess: () => {
      invalidateAll();
      onDone();
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => leaveRequestsAPI.reject(leaveRequestId),
    onSuccess: () => {
      invalidateAll();
      onDone();
    },
  });

  const busy = approveMutation.isPending || rejectMutation.isPending;

  const isCompact = variant === 'compact';

  return (
    <div className={`flex gap-2 ${isCompact ? 'mt-1.5' : 'mt-2 mb-1'}`}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          approveMutation.mutate();
        }}
        disabled={busy}
        className={`
          font-semibold bg-gold/10 text-gold border border-gold/30
          hover:bg-gold/20 transition-colors disabled:opacity-50
          ${isCompact
            ? 'px-2 py-1 rounded text-[11px]'
            : 'px-3 py-1.5 rounded-lg text-xs'
          }
        `}
      >
        {approveMutation.isPending
          ? (isCompact ? '...' : 'Aprovando...')
          : (isCompact ? 'Aprovar' : 'Aprovar saída')
        }
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          rejectMutation.mutate();
        }}
        disabled={busy}
        className={`
          font-semibold bg-surface2 text-muted border border-border
          hover:text-text hover:bg-surface1 transition-colors disabled:opacity-50
          ${isCompact
            ? 'px-2 py-1 rounded text-[11px]'
            : 'px-3 py-1.5 rounded-lg text-xs'
          }
        `}
      >
        {rejectMutation.isPending
          ? (isCompact ? '...' : 'Recusando...')
          : 'Recusar'
        }
      </button>
    </div>
  );
}
