'use client';

import { Card } from '@/components/shared/ui';
import type { Championship, Enrollment } from '@/types';
import { Calendar, DollarSign, Users, Trophy, FileText, Clock, Zap, Target } from 'lucide-react';

interface OverviewTabProps {
  championship: Championship;
  enrollments: Enrollment[];
}

export function OverviewTab({ championship, enrollments }: OverviewTabProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

  const getEnrollmentProgress = () => {
    if (!championship.max_teams) return 100;
    return Math.min((championship.enrolled_teams_count / championship.max_teams) * 100, 100);
  };

  const isEnrollmentOpen = championship.status === 'OPEN' && championship.is_enrollment_open;

  return (
    <div className="space-y-8">
      {/* Key Metrics - Premium KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Teams Enrolled */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-gold/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gold/10">
          <div className="absolute inset-0 bg-gradient-to-br from-gold/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold/20 to-gold3/20 flex items-center justify-center border border-gold/30">
                <Users className="w-7 h-7 text-gold" />
              </div>
              {championship.max_teams && (
                <span className="text-xs px-3 py-1.5 rounded-full bg-gold/10 text-gold font-mono font-bold border border-gold/20">
                  {getEnrollmentProgress().toFixed(0)}%
                </span>
              )}
            </div>
            <div>
              <h3 className="text-4xl font-heading font-bold gradient-text mb-2">
                {championship.enrolled_teams_count}
                {championship.max_teams && <span className="text-muted text-2xl">/{championship.max_teams}</span>}
              </h3>
              <p className="text-sm text-muted font-semibold uppercase tracking-wide">Times Inscritos</p>
            </div>
            {championship.max_teams && (
              <div className="h-2 bg-surface2 rounded-full overflow-hidden border border-border/50">
                <div
                  className="h-full bg-gradient-to-r from-gold via-gold to-gold2 rounded-full transition-all duration-500"
                  style={{ width: `${getEnrollmentProgress()}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Prize Pool */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-warning/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-lime/10">
          <div className="absolute inset-0 bg-gradient-to-br from-gold2/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold2/20 to-green/20 flex items-center justify-center border border-warning/30">
                <Trophy className="w-7 h-7 text-warning" />
              </div>
              <span className="text-xs px-3 py-1.5 rounded-full bg-warning/10 text-warning font-mono font-bold border border-warning/20">
                🏆
              </span>
            </div>
            <div>
              <h3 className="text-3xl font-heading font-bold text-warning mb-2">
                {formatCurrency(championship.prize_pool)}
              </h3>
              <p className="text-sm text-muted font-semibold uppercase tracking-wide">Premiação Total</p>
            </div>
            <p className="text-xs text-muted flex items-center gap-2">
              <Target className="w-4 h-4" />
              {championship.number_of_winners} {championship.number_of_winners === 1 ? 'vencedor' : 'vencedores'}
            </p>
          </div>
        </div>

        {/* Enrollment Fee */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-gold3/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-teal/10">
          <div className="absolute inset-0 bg-gradient-to-br from-gold3/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold3/20 to-gold/20 flex items-center justify-center border border-gold3/30">
                <DollarSign className="w-7 h-7 text-gold" />
              </div>
              {isEnrollmentOpen && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green"></span>
                </span>
              )}
            </div>
            <div>
              <h3 className="text-3xl font-heading font-bold text-gold mb-2">
                {formatCurrency(championship.enrollment_fee)}
              </h3>
              <p className="text-sm text-muted font-semibold uppercase tracking-wide">Taxa de Inscrição</p>
            </div>
            {isEnrollmentOpen && (
              <p className="text-xs text-green flex items-center gap-2 font-semibold">
                <Zap className="w-4 h-4" />
                Inscrições Abertas
              </p>
            )}
          </div>
        </div>

        {/* Tournament Format */}
        <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-green/40 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-green/10">
          <div className="absolute inset-0 bg-gradient-to-br from-green/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green/20 to-gold2/20 flex items-center justify-center border border-green/30">
                <FileText className="w-7 h-7 text-green" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-heading font-bold text-text mb-2">
                {championship.championship_type === 'LEAGUE' ? 'Pontos Corridos' : 
                 championship.championship_type === 'GROUPS_KNOCKOUT' ? 'Grupos + Mata-Mata' : 'Grupos + Eliminatórias'}
              </h3>
              <p className="text-sm text-muted font-semibold uppercase tracking-wide">Formato</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Min: {championship.min_teams}</span>
              </div>
              {championship.num_groups && (
                <div className="flex items-center gap-1">
                  <span>•</span>
                  <span>{championship.num_groups} grupos</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Information Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dates & Timeline */}
        <Card className="p-8 bg-gradient-to-br from-surface1 to-surface2 border-border hover:border-gold/30 transition-all duration-300 rounded-3xl">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold/20 to-gold3/20 flex items-center justify-center border border-gold/30">
              <Calendar className="w-6 h-6 text-gold" />
            </div>
            <h2 className="text-2xl font-heading font-bold gradient-text">Cronograma</h2>
          </div>

          <div className="space-y-5">
            {[
              { label: 'Início das Inscrições', date: championship.enrollment_start, icon: '📅' },
              { label: 'Fim das Inscrições', date: championship.enrollment_end, icon: '🔒' },
              { label: 'Início do Campeonato', date: championship.start_date, icon: '🚀' },
              championship.end_date && { label: 'Fim do Campeonato', date: championship.end_date, icon: '🏁' },
            ].filter(Boolean).map((item: any, index) => (
              <div key={index} className="flex items-start gap-4 group">
                <div className="text-2xl group-hover:scale-110 transition-transform">{item.icon}</div>
                <div className="flex-1 pt-1">
                  <p className="text-sm font-heading font-semibold text-text mb-1">{item.label}</p>
                  <p className="text-sm text-muted font-mono">{formatDate(item.date)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Rules */}
        <Card className="p-8 bg-gradient-to-br from-surface1 to-surface2 border-border hover:border-warning/30 transition-all duration-300 rounded-3xl">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-border/50">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold2/20 to-green/20 flex items-center justify-center border border-warning/30">
              <FileText className="w-6 h-6 text-warning" />
            </div>
            <h2 className="text-2xl font-heading font-bold gradient-text">Regras</h2>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-sm text-muted whitespace-pre-wrap leading-relaxed">
              {championship.rules || 'Nenhuma regra específica foi definida para este campeonato.'}
            </p>
          </div>
        </Card>
      </div>

      {/* Enrollment Status Banner */}
      {championship.status === 'OPEN' && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-gold/10 via-gold/10 to-gold2/10 border-2 border-gold/30 hover:border-gold/50 transition-all duration-300 hover:shadow-2xl hover:shadow-gold/20">
          <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-gold/5 to-gold2/5 animate-pulse-slow" />
          <div className="relative p-8 flex items-start gap-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold/30 to-gold3/30 flex items-center justify-center shrink-0 border-2 border-gold/50">
              <Users className="w-8 h-8 text-gold" />
            </div>
            <div className="flex-1 space-y-3">
              <h3 className="text-2xl font-heading font-bold gradient-text">
                {isEnrollmentOpen ? '🎉 Inscrições Abertas!' : '⏳ Inscrições em Breve'}
              </h3>
              <p className="text-muted text-lg">
                {isEnrollmentOpen
                  ? 'As inscrições estão abertas. Não perca a chance de participar deste campeonato épico!'
                  : `As inscrições abrirão em ${formatDate(championship.enrollment_start)}`}
              </p>
              {isEnrollmentOpen && championship.max_teams && (
                <div className="flex items-center gap-3 pt-2">
                  <span className="text-text font-mono font-bold text-lg">
                    {championship.max_teams - championship.enrolled_teams_count} vagas restantes
                  </span>
                  {championship.enrolled_teams_count >= championship.max_teams * 0.8 && (
                    <span className="px-4 py-2 rounded-xl bg-gradient-to-r from-gold2 to-green text-[#05060A] text-sm font-bold animate-pulse">
                      ⚡ Vagas limitadas!
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
