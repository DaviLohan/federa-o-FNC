'use client';

import { useRouter } from 'next/navigation';
import { Button, Badge } from '@/components/shared/ui';
import { PhaseBadge } from './PhaseBadge';
import { Calendar, Trophy, Users, Edit, ArrowLeft, Zap, Clock } from 'lucide-react';
import type { Championship } from '@/types';

interface ChampionshipHeroProps {
  championship: Championship;
  canManage?: boolean;
  onEdit?: () => void;
}

const statusConfig = {
  SCHEDULED: { label: 'Programado', variant: 'default' as const },
  OPEN: { label: 'Inscrições Abertas', variant: 'pending' as const },
  IN_PROGRESS: { label: 'Em Andamento', variant: 'live' as const },
  FINISHED: { label: 'Finalizado', variant: 'finished' as const },
  CANCELLED: { label: 'Cancelado', variant: 'error' as const },
};

export function ChampionshipHero({ championship, canManage = false, onEdit }: ChampionshipHeroProps) {
  const router = useRouter();
  const status = statusConfig[championship.status];

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue === 0) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Determinar fase atual baseado no status do backend e tipo do campeonato
  const getCurrentPhase = (): 'GROUPS' | 'KNOCKOUT' | 'FINISHED' => {
    // Se o campeonato está finalizado, retorna FINISHED
    if (championship.status === 'FINISHED') return 'FINISHED';
    
    // Se o backend fornece a fase atual, use ela
    if (championship.current_phase) {
      return championship.current_phase;
    }
    
    // Fallback: Para campeonatos de grupos + mata-mata
    if (championship.championship_type === 'GROUPS_KNOCKOUT') {
      // Se não estiver em progresso, assume que está na fase de grupos
      if (championship.status !== 'IN_PROGRESS') {
        return 'GROUPS';
      }
      
      // Se está em progresso mas não tem current_phase definido,
      // assumimos que ainda está na fase de grupos
      return 'GROUPS';
    }
    
    // Para outros tipos (KNOCKOUT puro ou LEAGUE), não tem fase de grupos
    return 'KNOCKOUT';
  };

  const currentPhase = getCurrentPhase();

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/championships')}
        className="group"
      >
        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Voltar
      </Button>

      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* Banner Background */}
        <div className="relative min-h-[30rem] lg:min-h-[34rem]">
          {championship.banner ? (
            <div
              className="absolute inset-0 bg-cover bg-center transform scale-105 hover:scale-110 transition-transform duration-700"
              style={{
                backgroundImage: `url(${championship.banner})`,
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-gold/20 via-gold/20 to-gold2/20" />
          )}
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#05060A] via-[#05060A]/80 to-transparent" />
          <div className="absolute inset-0 bg-[#05060A]/40" />

          {/* Animated Grid Pattern (subtle) */}
          <div 
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage: `
                linear-gradient(rgba(214, 161, 30, 0.3) 1px, transparent 1px),
                linear-gradient(90deg, rgba(214, 161, 30, 0.3) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px',
            }}
          />
        </div>

        {/* Content Container */}
        <div className="absolute inset-0 flex flex-col justify-between">
          {/* Top Bar: Status + Actions */}
          <div className="flex flex-wrap items-start justify-between gap-3 p-4 sm:p-6">
            <Badge variant={status.variant} className="backdrop-blur-md bg-surface1/80 border border-border/50">
              {status.label}
            </Badge>

            {canManage && (
              <div className="flex flex-wrap gap-2 sm:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="backdrop-blur-md bg-surface1/80 border border-border/50 hover:border-gold/50"
                  onClick={onEdit}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar
                </Button>
                {championship.championship_type === 'GROUPS_KNOCKOUT' && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="backdrop-blur-md bg-surface1/80 border border-border/50 hover:border-gold/50"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Gerar Grupos
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="backdrop-blur-md bg-surface1/80 border border-border/50 hover:border-warning/50"
                    >
                      <Trophy className="w-4 h-4 mr-2" />
                      Gerar Chavamento
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Bottom Content: Logo + Info */}
          <div className="mt-auto p-6 md:p-8 pb-12">
            <div className="flex flex-col xl:flex-row items-start xl:items-end gap-6 xl:gap-8">
              {/* Logo */}
              <div className="shrink-0">
                {championship.logo ? (
                  <div className="w-32 h-32 rounded-3xl overflow-hidden border-4 border-surface1 shadow-2xl bg-surface1 ring-2 ring-gold/20">
                    <img
                      src={championship.logo}
                      alt={championship.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-3xl border-4 border-surface1 shadow-2xl bg-gradient-to-br from-gold via-gold to-gold2 flex items-center justify-center text-5xl ring-2 ring-gold/20">
                    🏆
                  </div>
                )}
              </div>

              {/* Title + Meta Info */}
              <div className="flex-1 min-w-0 space-y-4">
                {/* Phase Badge */}
                <PhaseBadge phase={currentPhase} />

                {/* Title */}
                <h1 className="max-w-4xl break-words text-3xl md:text-5xl font-heading font-bold text-text leading-tight">
                  {championship.name}
                </h1>

                {/* Description */}
                <p className="max-w-3xl text-muted text-base md:text-lg leading-relaxed line-clamp-3">
                  {championship.description}
                </p>

                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 pt-2 max-w-6xl">
                  {/* Teams */}
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 shrink-0">
                      <Users className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wide font-semibold">Times</p>
                      <p className="text-xl font-mono font-bold text-text">
                        {championship.enrolled_teams_count}
                        {championship.max_teams ? `/${championship.max_teams}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Prize */}
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-2xl bg-warning/10 flex items-center justify-center border border-warning/20 shrink-0">
                      <Trophy className="w-6 h-6 text-warning" />
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wide font-semibold">Premiação</p>
                      <p className="text-xl font-mono font-bold gradient-text">
                        {formatCurrency(championship.prize_pool)}
                      </p>
                    </div>
                  </div>

                  {/* Start Date */}
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md">
                    <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold3/20 shrink-0">
                      <Calendar className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <p className="text-xs text-muted uppercase tracking-wide font-semibold">Início</p>
                      <p className="text-lg font-mono font-bold text-text">
                        {formatDate(championship.start_date)}
                      </p>
                    </div>
                  </div>

                  {/* Championship Type Info (Groups + Knockout) */}
                  {championship.championship_type === 'GROUPS_KNOCKOUT' && championship.num_groups && (
                    <>
                      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md">
                        <div className="w-12 h-12 rounded-2xl bg-green/10 flex items-center justify-center border border-green/20 shrink-0">
                          <span className="text-2xl">🔢</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wide font-semibold">Grupos</p>
                          <p className="text-xl font-mono font-bold text-text">
                            {championship.num_groups}
                          </p>
                        </div>
                      </div>

                      <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md">
                        <div className="w-12 h-12 rounded-2xl bg-gold2/10 flex items-center justify-center border border-gold2/20 shrink-0">
                          <span className="text-2xl">✅</span>
                        </div>
                        <div>
                          <p className="text-xs text-muted uppercase tracking-wide font-semibold">Classificados/Grupo</p>
                          <p className="text-xl font-mono font-bold text-text">
                            Top {championship.qualified_per_group || 2}
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Agenda de Jogos */}
                  {championship.game_days && championship.game_days.length > 0 && championship.game_start_time && championship.game_end_time && (
                    <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/50 bg-surface1/55 px-4 py-3 backdrop-blur-md sm:col-span-2">
                      <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20 shrink-0">
                        <Clock className="w-6 h-6 text-gold" />
                      </div>
                      <div>
                        <p className="text-xs text-muted uppercase tracking-wide font-semibold">Agenda</p>
                        <p className="text-base font-mono font-bold text-text">
                          {championship.game_days.map((d: string) => {
                            const dayMap: Record<string, string> = {
                              MON: 'Seg', TUE: 'Ter', WED: 'Qua',
                              THU: 'Qui', FRI: 'Sex', SAT: 'Sab', SUN: 'Dom'
                            };
                            return dayMap[d] || d;
                          }).join(', ')}{' '}
                          <span className="text-gold">
                            {championship.game_start_time.slice(0, 5)}-{championship.game_end_time.slice(0, 5)}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Gradient Border */}
        <div className="absolute left-0 right-0 bottom-0 h-1 bg-gradient-to-r from-gold via-gold to-gold2 max-w-full" />
      </div>
    </div>
  );
}
