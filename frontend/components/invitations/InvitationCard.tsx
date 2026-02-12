'use client';

import { Card, Badge, Button } from '@/components/shared/ui';
import type { TeamInvitation } from '@/types';

interface InvitationCardProps {
  invitation: TeamInvitation;
  onAccept: () => void;
  onDecline: () => void;
  isProcessing: boolean;
}

export function InvitationCard({ invitation, onAccept, onDecline, isProcessing }: InvitationCardProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Há ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Há ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays === 1) return 'Ontem';
    return `Há ${diffDays} dias`;
  };

  return (
    <Card className="hover:border-brand/50 transition-all">
      <div className="space-y-4">
        {/* Team Info */}
        <div className="flex items-start gap-4">
          {invitation.team.logo ? (
            <img
              src={invitation.team.logo}
              alt={invitation.team.name}
              className="w-16 h-16 rounded-lg object-cover border-2 border-border"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-surface-dark flex items-center justify-center text-3xl">
              🏆
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-xl font-bold text-text">{invitation.team.name}</h3>
            <p className="text-sm text-muted">{invitation.team.abbreviation}</p>
            <p className="text-xs text-muted2 mt-1">{formatDate(invitation.created_at)}</p>
          </div>
          <Badge variant="info">Pendente</Badge>
        </div>

        {/* Message */}
        {invitation.message && (
          <div className="bg-surface-dark rounded-lg p-4">
            <p className="text-sm text-muted mb-1">Mensagem do {invitation.invited_by.full_name}:</p>
            <p className="text-text">{invitation.message}</p>
          </div>
        )}

        {/* Team Stats */}
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted2">Jogadores:</span>
            <span className="text-text ml-1 font-semibold">{invitation.team.player_count}/15</span>
          </div>
          <div>
            <span className="text-muted2">Status:</span>
            <span className="text-success ml-1 font-semibold">
              {invitation.team.is_active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="primary"
            onClick={onAccept}
            disabled={isProcessing}
            loading={isProcessing}
            className="flex-1"
          >
            ✓ Aceitar Convite
          </Button>
          <Button
            variant="ghost"
            onClick={onDecline}
            disabled={isProcessing}
            className="flex-1"
          >
            ✗ Recusar
          </Button>
        </div>
      </div>
    </Card>
  );
}
