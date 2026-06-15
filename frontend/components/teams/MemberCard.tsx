'use client';

import { useEffect, useRef, useState } from 'react';
import { UserX, Crown, Shield, Sword, Goal, UserCog } from 'lucide-react';
import type { TeamMembership } from '@/types';

interface MemberCardProps {
  member: TeamMembership;
  canRemove: boolean;
  onRemove?: () => void;
  isRemoving: boolean;
  canManageRole?: boolean;
  onSetRole?: (role: 'PLAYER' | 'CAPTAIN' | 'COMMISSION') => void;
  isUpdatingRole?: boolean;
  canPromoteToCommission?: boolean;
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

export function MemberCard({
  member,
  canRemove,
  onRemove,
  isRemoving,
  canManageRole = false,
  onSetRole,
  isUpdatingRole = false,
  canPromoteToCommission = true,
}: MemberCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const sector = getSector(member.player.primary_position);
  const { color, bg, border, Icon } = sectorConfig[sector];
  const isOwner = member.role === 'OWNER';
  const isCaptain = member.role === 'CAPTAIN';
  const isCommission = member.role === 'COMMISSION';
  const gradient = getGradient(member.player.player_name);

  const handleRemoveClick = () => {
    if (confirmRemove) {
      onRemove?.();
      setConfirmRemove(false);
    } else {
      setConfirmRemove(true);
    }
  };

  useEffect(() => {
    if (!showRoleMenu) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowRoleMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showRoleMenu]);

  const roleActionLabel = isCommission ? 'Remover da Comissão' : 'Promover para Comissão';

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
          {isCaptain && (
            <span className="text-[10px] font-bold text-brand bg-brand/10 px-1.5 py-0.5 rounded-full border border-brand/20 leading-none">
              CAPITÃO
            </span>
          )}
          {isCommission && (
            <span className="text-[10px] font-bold text-info bg-info/10 px-1.5 py-0.5 rounded-full border border-info/20 leading-none">
              COMISSÃO
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
      {(canRemove && onRemove) || (canManageRole && onSetRole && !isOwner) ? (
        <div ref={menuRef} className="relative flex-shrink-0">
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
            <>
              <button
                onClick={() => setShowRoleMenu((prev) => !prev)}
                className="p-1.5 rounded-lg text-muted hover:text-gold hover:bg-gold/10 transition-colors"
                title="Gerenciar função"
              >
                <UserCog className="w-4 h-4" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-xl border border-border bg-surface1 p-1 shadow-xl">
                  {canManageRole && onSetRole && !isOwner && (
                    <>
                      <button
                        onClick={() => {
                          onSetRole(isCommission ? 'PLAYER' : 'COMMISSION');
                          setShowRoleMenu(false);
                        }}
                        disabled={isUpdatingRole || (!isCommission && !canPromoteToCommission)}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface2 disabled:opacity-40"
                      >
                        {roleActionLabel}
                      </button>
                      {!isCaptain && !isCommission && (
                        <button
                          onClick={() => {
                            onSetRole('CAPTAIN');
                            setShowRoleMenu(false);
                          }}
                          disabled={isUpdatingRole}
                          className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface2 disabled:opacity-40"
                        >
                          Definir como Capitão
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onSetRole('PLAYER');
                          setShowRoleMenu(false);
                        }}
                        disabled={isUpdatingRole || member.role === 'PLAYER'}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface2 disabled:opacity-40"
                      >
                        Definir como Jogador
                      </button>
                    </>
                  )}

                  {canRemove && onRemove && (
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        setConfirmRemove(true);
                      }}
                      className="w-full text-left text-xs px-3 py-2 rounded-lg text-error hover:bg-error/10"
                    >
                      <span className="inline-flex items-center gap-2"><UserX className="w-3.5 h-3.5" /> Remover membro</span>
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
