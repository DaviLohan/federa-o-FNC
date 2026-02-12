'use client';

import { Badge, Button } from '@/components/shared/ui';
import type { TeamMembership } from '@/types';

interface MemberCardProps {
  member: TeamMembership;
  canRemove: boolean;
  onRemove?: () => void;
  isRemoving: boolean;
}

export function MemberCard({ member, canRemove, onRemove, isRemoving }: MemberCardProps) {
  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      'OWNER': 'warning',
      'CAPTAIN': 'info',
      'PLAYER': 'default',
    };
    return variants[role] || 'default';
  };

  const getPositionEmoji = (position: string) => {
    if (position === 'GK') return '🥅';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return '🛡️';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return '⚙️';
    if (['LW', 'RW', 'ST', 'CF'].includes(position)) return '⚽';
    return '👤';
  };

  return (
    <div className="bg-surface-dark rounded-lg p-4 flex items-center gap-4">
      {/* Avatar */}
      {member.player.avatar ? (
        <img
          src={member.player.avatar}
          alt={member.player.player_name}
          className="w-14 h-14 rounded-full object-cover border-2 border-border"
        />
      ) : (
        <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center text-2xl">
          {getPositionEmoji(member.player.primary_position)}
        </div>
      )}

      {/* Info */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold text-text">{member.player.player_name}</h4>
          <Badge variant={getRoleBadge(member.role)} className="text-xs">
            {member.role_display}
          </Badge>
        </div>
        <p className="text-sm text-muted">@{member.player.gamer_tag}</p>
        <p className="text-xs text-muted2 mt-1">
          {getPositionEmoji(member.player.primary_position)} {member.player.primary_position}
          {member.player.shirt_number && ` • #${member.player.shirt_number}`}
        </p>
      </div>

      {/* Actions */}
      {canRemove && onRemove && (
        <Button
          variant="ghost"
          onClick={onRemove}
          disabled={isRemoving}
          className="text-error hover:bg-error/10"
        >
          Remover
        </Button>
      )}
      {!canRemove && member.role === 'OWNER' && (
        <div className="text-warning text-sm font-semibold">
          🏆 Dono
        </div>
      )}
    </div>
  );
}
