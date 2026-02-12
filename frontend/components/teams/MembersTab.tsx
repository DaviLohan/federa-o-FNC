'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { membershipsAPI } from '@/lib/api';
import { useToast } from '@/components/shared/ui';
import { MemberCard } from './MemberCard';
import type { TeamMembership } from '@/types';

interface MembersTabProps {
  teamId: number;
  members: TeamMembership[];
  isLoading: boolean;
  onMemberRemoved: () => void;
  readOnly?: boolean;
}

export function MembersTab({ teamId, members, isLoading, onMemberRemoved, readOnly = false }: MembersTabProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Remove member mutation
  const removeMutation = useMutation({
    mutationFn: (membershipId: number) => membershipsAPI.removeMember(membershipId),
    onSuccess: () => {
      showToast('Membro removido com sucesso', 'success');
      onMemberRemoved();
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao remover membro', 'error');
    },
  });

  const handleRemoveMember = (membership: TeamMembership) => {
    const playerName = membership.player.player_name;
    if (confirm(`Remover ${playerName} do time?`)) {
      removeMutation.mutate(membership.id);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand"></div>
        <p className="text-muted mt-4">Carregando membros...</p>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">👥</div>
        <h3 className="text-lg font-semibold text-text mb-2">Nenhum membro ainda</h3>
        <p className="text-muted">Convide jogadores para participar do seu time!</p>
      </div>
    );
  }

  // Sort: Owner first, then others
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role === 'OWNER') return -1;
    if (b.role === 'OWNER') return 1;
    return 0;
  });

  return (
    <div className="space-y-4">
      {sortedMembers.map((member) => (
        <MemberCard
          key={member.id}
          member={member}
          canRemove={!readOnly && member.role !== 'OWNER'}
          onRemove={readOnly ? undefined : () => handleRemoveMember(member)}
          isRemoving={removeMutation.isPending}
        />
      ))}
    </div>
  );
}
