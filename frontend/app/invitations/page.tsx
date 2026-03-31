'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invitationsAPI } from '@/lib/api';
import { Card, Button, useToast } from '@/components/shared/ui';
import { usePendingInvitations } from '@/hooks/useInvitations';
import { InvitationCard } from '@/components/invitations/InvitationCard';
import { InvitationEmptyState } from '@/components/invitations/InvitationEmptyState';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function InvitationsPage() {
  useRequireAuth();
  
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [processingId, setProcessingId] = useState<number | null>(null);
  
  const { data, isLoading } = usePendingInvitations();
  const invitations = data?.results || [];

  // Accept mutation
  const acceptMutation = useMutation({
    mutationFn: (id: number) => invitationsAPI.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['team'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      queryClient.invalidateQueries({ queryKey: ['my-team'] });
      queryClient.invalidateQueries({ queryKey: ['user'] });
      showToast('Convite aceito! Você agora é membro do time.', 'success');
      setProcessingId(null);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao aceitar convite', 'error');
      setProcessingId(null);
    },
  });

  // Decline mutation
  const declineMutation = useMutation({
    mutationFn: (id: number) => invitationsAPI.decline(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
      showToast('Convite recusado.', 'success');
      setProcessingId(null);
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao recusar convite', 'error');
      setProcessingId(null);
    },
  });

  const handleAccept = (id: number, teamName: string) => {
    if (confirm(`Aceitar convite do ${teamName}?`)) {
      setProcessingId(id);
      acceptMutation.mutate(id);
    }
  };

  const handleDecline = (id: number, teamName: string) => {
    if (confirm(`Recusar convite do ${teamName}?`)) {
      setProcessingId(id);
      declineMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text mb-2">
            Convites Pendentes
          </h1>
          <p className="text-muted">
            {invitations.length === 0 
              ? 'Você não tem convites pendentes'
              : `${invitations.length} ${invitations.length === 1 ? 'convite' : 'convites'} aguardando resposta`
            }
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          Voltar
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
            <p className="text-muted mt-4">Carregando convites...</p>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && invitations.length === 0 && <InvitationEmptyState />}

      {/* Invitations List */}
      {!isLoading && invitations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {invitations.map((invitation) => (
            <InvitationCard
              key={invitation.id}
              invitation={invitation}
              onAccept={() => handleAccept(invitation.id, invitation.team.name)}
              onDecline={() => handleDecline(invitation.id, invitation.team.name)}
              isProcessing={processingId === invitation.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
