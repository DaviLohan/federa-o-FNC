'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Users } from 'lucide-react';
import { membershipsAPI } from '@/lib/api';
import { TEAM_MAX_PLAYERS } from '@/lib/team-constants';
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

// Agrupar por setor de campo
type Sector = 'OWNER' | 'GK' | 'DEF' | 'MID' | 'ATT';

function getSector(member: TeamMembership): Sector {
  if (member.role === 'OWNER' || member.role === 'CAPTAIN') return 'OWNER';
  const pos = member.player.primary_position;
  if (pos === 'GK') return 'GK';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(pos)) return 'DEF';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(pos)) return 'MID';
  return 'ATT';
}

const sectorLabels: Record<Sector, string> = {
  OWNER: 'Comissão Técnica',
  GK: 'Goleiros',
  DEF: 'Defensores',
  MID: 'Meio-Campistas',
  ATT: 'Atacantes',
};

const sectorOrder: Sector[] = ['OWNER', 'GK', 'DEF', 'MID', 'ATT'];

export function MembersTab({ teamId, members, isLoading, onMemberRemoved, readOnly = false }: MembersTabProps) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-surface2 animate-pulse" />
        ))}
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted">
        <div className="w-16 h-16 rounded-2xl bg-surface2 flex items-center justify-center">
          <Users className="w-8 h-8 text-gold/30" />
        </div>
        <p className="font-semibold text-text">Nenhum membro ainda</p>
        <p className="text-sm text-center max-w-xs">Convide jogadores para participar do time!</p>
      </div>
    );
  }

  // Agrupar membros por setor
  const grouped: Record<Sector, TeamMembership[]> = {
    OWNER: [], GK: [], DEF: [], MID: [], ATT: [],
  };
  members.forEach((m) => grouped[getSector(m)].push(m));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted text-sm">
          <Users className="w-4 h-4" />
          <span><span className="text-text font-bold">{members.length}</span> / {TEAM_MAX_PLAYERS} jogadores</span>
        </div>
        {/* Barra de ocupação */}
        <div className="w-32 h-1.5 bg-surface2 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold2 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((members.length / TEAM_MAX_PLAYERS) * 100, 100)}%` }}
          />
        </div>
      </div>

      {/* Grupos por setor */}
      {sectorOrder.map((sector) => {
        const group = grouped[sector];
        if (group.length === 0) return null;
        return (
          <div key={sector}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-3">
              {sectorLabels[sector]} ({group.length})
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.map((member) => (
                <MemberCard
                  key={member.id}
                  member={member}
                  canRemove={!readOnly && member.role !== 'OWNER'}
                  onRemove={readOnly ? undefined : () => removeMutation.mutate(member.id)}
                  isRemoving={removeMutation.isPending && removeMutation.variables === member.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
