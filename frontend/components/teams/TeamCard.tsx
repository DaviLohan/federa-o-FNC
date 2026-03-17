import React from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/shared/ui';
import { Users, Trophy, Target } from 'lucide-react';
import type { Team } from '@/types';

interface TeamCardProps {
  team: Team;
  onClick?: () => void;
  className?: string;
}

export function TeamCard({ team, onClick, className = '' }: TeamCardProps) {
  const router = useRouter();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/teams/${team.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative rounded-3xl bg-surface1 border border-border p-6 neon-glow-hover cursor-pointer transition-all duration-300 reveal-fade ${className}`}
    >
      {/* Header com Logo e Info */}
      <div className="flex items-center gap-4 mb-6">
        {/* Logo */}
        <div className="w-20 h-20 rounded-2xl border-2 border-gold/30 flex items-center justify-center overflow-hidden bg-surface2 flex-shrink-0 group-hover:border-gold/60 transition-colors">
          {team.logo ? (
            <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">⚽</span>
          )}
        </div>

        {/* Team Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-text truncate group-hover:text-gold transition-colors">
            {team.name}
          </h3>
          <p className="text-sm font-mono text-gold">{team.abbreviation}</p>
          <p className="text-xs text-muted mt-1">{team.owner.full_name}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
        <div className="text-center p-2 md:p-3 rounded-xl bg-surface2 border border-border">
          <Users className="w-4 h-4 md:w-5 md:h-5 text-gold mx-auto mb-1" />
          <div className="text-base md:text-lg font-mono font-bold text-text">{team.player_count || 0}</div>
          <div className="text-[10px] md:text-xs text-muted">Jogadores</div>
        </div>
        
        <div className="text-center p-2 md:p-3 rounded-xl bg-surface2 border border-border">
          <Trophy className="w-4 h-4 md:w-5 md:h-5 text-warning mx-auto mb-1" />
          <div className="text-base md:text-lg font-mono font-bold text-text">-</div>
          <div className="text-[10px] md:text-xs text-muted">Vitórias</div>
        </div>
        
        <div className="text-center p-2 md:p-3 rounded-xl bg-surface2 border border-border">
          <Target className="w-4 h-4 md:w-5 md:h-5 text-gold mx-auto mb-1" />
          <div className="text-base md:text-lg font-mono font-bold text-text">-</div>
          <div className="text-[10px] md:text-xs text-muted">Gols</div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-4 border-t border-border">
        <Badge variant={team.is_active ? 'finished' : 'default'}>
          {team.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
        
        <span className="text-sm text-gold group-hover:text-gold2 font-medium flex items-center gap-1">
          Ver Detalhes
          <span className="group-hover:translate-x-1 transition-transform">→</span>
        </span>
      </div>
    </div>
  );
}
