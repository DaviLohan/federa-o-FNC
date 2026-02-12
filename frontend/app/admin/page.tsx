'use client';

import { useAuthStore } from '@/lib/auth-store';
import { useAdminData } from '@/hooks/useAdminData';
import { KpiCard, SectionHeader } from '@/components/dashboard';
import {
  Users,
  Shield,
  Trophy,
  Calendar,
  TrendingUp,
  UserPlus,
  Activity,
} from 'lucide-react';

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const { stats, isLoading } = useAdminData();
  
  // Cast para any para evitar erros de tipo
  const adminStats = stats as any;

  // Show loading during SSR and initial client render
  if (typeof window === 'undefined' || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold mx-auto mb-4"></div>
          <p className="text-muted">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-text">
          <span className="gradient-text">Painel Administrativo</span>
        </h1>
        <p className="text-muted">Visão geral da plataforma</p>
      </div>

      {/* Overview Stats */}
      <div>
        <SectionHeader title="Estatísticas Gerais" subtitle="Dados globais da plataforma" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            title="Usuários"
            value={adminStats?.overview?.total_users || 0}
            subtitle="Usuários ativos"
            icon={<Users className="h-5 w-5" />}
            color="cyan"
            loading={isLoading}
          />
          <KpiCard
            title="Times"
            value={adminStats?.overview?.total_teams || 0}
            subtitle="Times registrados"
            icon={<Shield className="h-5 w-5" />}
            color="lime"
            loading={isLoading}
          />
          <KpiCard
            title="Campeonatos"
            value={adminStats?.overview?.total_championships || 0}
            subtitle="Campeonatos criados"
            icon={<Trophy className="h-5 w-5" />}
            color="teal"
            loading={isLoading}
          />
          <KpiCard
            title="Partidas"
            value={adminStats?.overview?.total_matches || 0}
            subtitle="Partidas jogadas"
            icon={<Calendar className="h-5 w-5" />}
            color="green"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Championships Stats */}
      <div>
        <SectionHeader title="Campeonatos" subtitle="Status dos campeonatos" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          <KpiCard
            title="Abertos"
            value={adminStats?.championships?.open || 0}
            subtitle="Aceitando inscrições"
            icon={<Trophy className="h-5 w-5" />}
            color="cyan"
            loading={isLoading}
          />
          <KpiCard
            title="Em Andamento"
            value={adminStats?.championships?.in_progress || 0}
            subtitle="Campeonatos ativos"
            icon={<Activity className="h-5 w-5" />}
            color="lime"
            loading={isLoading}
          />
          <KpiCard
            title="Finalizados"
            value={adminStats?.championships?.finished || 0}
            subtitle="Campeonatos concluídos"
            icon={<Trophy className="h-5 w-5" />}
            color="teal"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Matches Stats */}
      <div>
        <SectionHeader title="Partidas" subtitle="Status das partidas" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-4">
          <KpiCard
            title="Agendadas"
            value={adminStats?.matches?.scheduled || 0}
            subtitle="Partidas futuras"
            icon={<Calendar className="h-5 w-5" />}
            color="cyan"
            loading={isLoading}
          />
          <KpiCard
            title="Ao Vivo"
            value={adminStats?.matches?.live || 0}
            subtitle="Partidas em andamento"
            icon={<Activity className="h-5 w-5" />}
            color="lime"
            loading={isLoading}
          />
          <KpiCard
            title="Finalizadas"
            value={adminStats?.matches?.finished || 0}
            subtitle="Partidas concluídas"
            icon={<Trophy className="h-5 w-5" />}
            color="teal"
            loading={isLoading}
          />
          <KpiCard
            title="Contestadas"
            value={adminStats?.matches?.contested || 0}
            subtitle="Requerem revisão"
            icon={<TrendingUp className="h-5 w-5" />}
            color="green"
            loading={isLoading}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <SectionHeader title="Atividade Recente" subtitle="Últimos 7 dias" />
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-3">
          <KpiCard
            title="Novos Usuários"
            value={adminStats?.recent_activity?.new_users_week || 0}
            subtitle="Últimos 7 dias"
            icon={<UserPlus className="h-5 w-5" />}
            color="cyan"
            loading={isLoading}
          />
          <KpiCard
            title="Novos Times"
            value={adminStats?.recent_activity?.new_teams_week || 0}
            subtitle="Últimos 7 dias"
            icon={<Shield className="h-5 w-5" />}
            color="lime"
            loading={isLoading}
          />
          <KpiCard
            title="Partidas Recentes"
            value={adminStats?.recent_activity?.recent_matches || 0}
            subtitle="Últimos 7 dias"
            icon={<Calendar className="h-5 w-5" />}
            color="teal"
            loading={isLoading}
          />
        </div>
      </div>

      {/* User Types Distribution */}
      {adminStats?.users_by_type && (
        <div className="rounded-xl border border-border bg-surface1 p-6">
          <h3 className="mb-4 text-lg font-bold text-text">
            Distribuição de Usuários por Tipo
          </h3>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Object.entries(adminStats.users_by_type).map(([type, count]) => (
              <div
                key={type}
                className="rounded-lg border border-border bg-surface2 p-4 text-center"
              >
                <div className="mb-2 text-2xl font-mono font-bold text-gold">
                  {count as number}
                </div>
                <div className="text-xs text-muted">{type}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
