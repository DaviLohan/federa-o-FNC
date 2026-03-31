'use client';

import { useState } from 'react';
import { UserX, Crown, Shield, Sword, Goal } from 'lucide-react';
import type { TeamMembership } from '@/types';

interface MemberCardProps {
  member: TeamMembership;
  canRemove: boolean;
  onRemove?: () => void;
  isRemoving: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Sector = 'gk' | 'def' | 'mid' | 'att';

function getSector(position: string): Sector {
  if (position === 'GK') return 'gk';
  if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return 'def';
  if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return 'mid';
  return 'att';
}

const sectorConfig: Record<Sector, { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  gk:  { label: 'Goleiro',    color: 'text-yellow-300', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', Icon: Shield },
  def: { label: 'Defensor',   color: 'text-blue-400',   bg: 'bg-blue-400/10',   border: 'border-blue-400/30',   Icon: Shield },
  mid: { label: 'Meio',       color: 'text-green-400',  bg: 'bg-green-400/10',  border: 'border-green-400/30',  Icon: Sword  },
  att: { label: 'Atacante',   color: 'text-red-400',    bg: 'bg-red-400/10',    border: 'border-red-400/30',    Icon: Goal   },
};

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const avatarGradients = [
  'from-gold to-amber-600',
  'from-blue-500 to-indigo-600',
  'from-green-500 to-emerald-600',
  'from-red-500 to-rose-600',
  'from-purple-500 to-violet-600',
  'from-cyan-500 to-teal-600',
  'from-orange-500 to-amber-600',
];

function getGradient(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberCard({ member, canRemove, onRemove, isRemoving }: MemberCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const sector = getSector(member.player.primary_position);
  const { color, bg, border, Icon } = sectorConfig[sector];
  const isOwner = member.role === 'OWNER';
  const gradient = getGradient(member.player.player_name);

  const handleRemoveClick = () => {
    if (confirmRemove) {
      onRemove?.();
      setConfirmRemove(false);
    } else {
      setConfirmRemove(true);
    }
  };

  return (
    <div className={`relative group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200
      bg-surface2 border-border hover:border-gold/20 hover:bg-surface1
      ${isOwner ? 'ring-1 ring-gold/20' : ''}
    `}>

      {/* Avatar */}
      <div className="relative flex-shrink-0">
        {member.player.avatar ? (
          <img
            src={member.player.avatar}
            alt={member.player.player_name}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}>
            <span className="text-white font-black text-sm tracking-tight">
              {getInitials(member.player.player_name)}
            </span>
          </div>
        )}
        {isOwner && (
          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gold flex items-center justify-center shadow-lg">
            <Crown className="w-3 h-3 text-black" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-text text-sm leading-tight truncate">
            {member.player.player_name}
          </span>
          {isOwner && (
            <span className="text-[10px] font-bold text-gold bg-gold/10 px-1.5 py-0.5 rounded-full border border-gold/20 leading-none">
              DONO
            </span>
          )}
        </div>
        <p className="text-xs text-muted mt-0.5 truncate">@{member.player.gamer_tag}</p>

        {/* Position badge */}
        <div className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${bg} ${border} ${color}`}>
          <Icon className="w-2.5 h-2.5" />
          {member.player.primary_position_display || member.player.primary_position}
        </div>
      </div>

      {/* Remove action */}
      {canRemove && onRemove && (
        <div className="flex-shrink-0">
          {confirmRemove ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setConfirmRemove(false)}
                className="text-xs text-muted hover:text-text px-2 py-1 rounded-lg transition-colors"
              >
                Não
              </button>
              <button
                onClick={handleRemoveClick}
                disabled={isRemoving}
                className="text-xs font-semibold text-white bg-error hover:bg-error/80 px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50"
              >
                {isRemoving ? '...' : 'Sim'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleRemoveClick}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-muted hover:text-error hover:bg-error/10"
              title="Remover membro"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
