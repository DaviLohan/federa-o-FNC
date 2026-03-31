'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/shared/ui';
import type { Championship } from '@/types';
import { Calendar, Trophy, Users, DollarSign } from 'lucide-react';

interface ChampionshipCardProps {
  championship: Championship;
}

const statusConfig = {
  SCHEDULED: { label: 'Programado', variant: 'default' as const },
  OPEN: { label: 'Inscrições Abertas', variant: 'pending' as const },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'live' as const },
  FINISHED: { label: 'Finalizado', variant: 'finished' as const },
  CANCELLED: { label: 'Cancelado', variant: 'error' as const },
};

const typeConfig = {
  KNOCKOUT: { label: 'Mata-Mata', icon: '🏆', isLegacy: true },
  LEAGUE: { label: 'Pontos Corridos', icon: '📊', isLegacy: false },
  GROUPS_KNOCKOUT: { label: 'Grupos + Mata-Mata', icon: '🏆', isLegacy: false },
};

export function ChampionshipCard({ championship }: ChampionshipCardProps) {
  const router = useRouter();

  const status = statusConfig[championship.status];
  const type = typeConfig[championship.championship_type];

  const handleClick = () => {
    router.push(`/championships/${championship.id}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue === 0) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  return (
    <div
      onClick={handleClick}
      className="group relative overflow-hidden rounded-2xl bg-surface1 border border-border hover:border-gold/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/10 cursor-pointer"
    >
      {/* Banner Background */}
      <div className="relative h-40 overflow-hidden">
        {championship.banner ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
            style={{
              backgroundImage: `url(${championship.banner})`,
            }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-gold/10 to-gold2/10" />
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface1 via-surface1/60 to-transparent" />

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <Badge variant={status.variant}>
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="relative px-5 pb-5 -mt-12">
        {/* Logo */}
        <div className="relative mb-4">
          {championship.logo ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-surface1 shadow-xl bg-surface1">
              <img
                src={championship.logo}
                alt={championship.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-2xl border-4 border-surface1 shadow-xl bg-gradient-to-br from-gold via-gold to-gold2 flex items-center justify-center text-3xl">
              {type.icon}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-heading font-bold text-text mb-1 line-clamp-1 group-hover:gradient-text transition-colors">
          {championship.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted mb-4 line-clamp-2 min-h-[2.5rem]">
          {championship.description}
        </p>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Teams */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 border border-gold/20">
              <Users className="w-4 h-4 text-gold" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Times</p>
              <p className="text-sm font-mono font-semibold text-text truncate">
                {championship.enrolled_teams_count}
                {championship.max_teams ? `/${championship.max_teams}` : ''}
              </p>
            </div>
          </div>

          {/* Prize */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0 border border-warning/20">
              <Trophy className="w-4 h-4 text-warning" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Premiação</p>
              <p className="text-sm font-mono font-semibold text-text truncate">
                {formatCurrency(championship.prize_pool)}
              </p>
            </div>
          </div>

          {/* Type */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center shrink-0 border border-gold3/20">
              <span className="text-sm">{type.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Tipo</p>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-semibold text-text truncate">
                  {type.label}
                </p>
                {type.isLegacy && (
                  <Badge variant="warning" className="!text-[10px] !px-1.5 !py-0.5">
                    LEGADO
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Start Date */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green/10 flex items-center justify-center shrink-0 border border-green/20">
              <Calendar className="w-4 h-4 text-green" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted">Início</p>
              <p className="text-sm font-mono font-semibold text-text truncate">
                {formatDate(championship.start_date)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hover Effect Indicator */}
      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-gold via-gold to-gold2 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
    </div>
  );
}
