'use client';

import { useQuery } from '@tanstack/react-query';
import { adminAPI, championshipsAPI, teamsAPI, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import Link from 'next/link';
import {
  Users, Shield, Trophy, Calendar, Activity,
  UserPlus, TrendingUp, AlertTriangle, CheckCircle,
  Clock, BarChart2, ArrowRight, Zap, Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

// ─── helpers ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = 'gold',
  href,
  loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  accent?: 'gold' | 'green' | 'red' | 'blue' | 'warning';
  href?: string;
  loading?: boolean;
}) {
  const accentMap = {
    gold:    { bg: 'bg-gold/10',    text: 'text-gold',    border: 'border-gold/20'    },
    green:   { bg: 'bg-green/10',   text: 'text-green',   border: 'border-green/20'   },
    red:     { bg: 'bg-error/10',   text: 'text-error',   border: 'border-error/20'   },
    blue:    { bg: 'bg-info/10',    text: 'text-info',    border: 'border-info/20'    },
    warning: { bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20' },
  };
  const a = accentMap[accent];

  const inner = (
    <div
      className={`
        group relative flex flex-col gap-4 rounded-2xl border ${a.border}
        bg-surface1 p-5 transition-all duration-200
        hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30
        ${href ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.bg}`}>
          <Icon className={`h-5 w-5 ${a.text}`} />
        </div>
        {href && (
          <ArrowRight className="h-4 w-4 text-muted/40 transition-colors group-hover:text-muted" />
        )}
      </div>
      <div>
        {loading ? (
          <div className="h-9 w-20 animate-pulse rounded-lg bg-surface2" />
        ) : (
          <p className="font-mono text-3xl font-bold text-text">{value}</p>
        )}
        <p className="mt-1 text-sm font-medium text-muted">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-muted/60">{sub}</p>}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="h-4 w-1 rounded-full bg-gold" />
      <h2 className="text-sm font-bold uppercase tracking-widest text-muted">{children}</h2>
    </div>
  );
}

const USER_TYPE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  TEAM_OWNER: 'Dono de Time',
  PLAYER: 'Jogador',
};

const USER_TYPE_COLORS: Record<string, string> = {
  ADMIN:      '#D6A11E',
  SUPERVISOR: '#3B82F6',
  TEAM_OWNER: '#2ECC71',
  PLAYER:     '#9CA3AF',
};

const CHAMP_STATUS_COLORS: Record<string, string> = {
  Abertos:      '#2ECC71',
  'Em Andamento': '#D6A11E',
  Finalizados:  '#6B7280',
};

// ─── custom tooltip ────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface1 px-4 py-3 shadow-xl text-sm">
      <p className="mb-1 font-semibold text-text">{label}</p>
      <p className="text-gold font-mono font-bold">{payload[0].value}</p>
    </div>
  );
}

// ─── page ──────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const user = useAuthStore((state) => state.user);
  const isAdmin = user?.user_type === 'ADMIN' || user?.user_type === 'SUPERVISOR';

  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminAPI.getStats(),
    enabled: isAdmin,
  });

  const s = stats as any;

  // Dados para o gráfico de campeonatos por status
  const champChartData = s
    ? [
        { name: 'Abertos',       count: s.championships?.open        ?? 0 },
        { name: 'Em Andamento',  count: s.championships?.in_progress ?? 0 },
        { name: 'Finalizados',   count: s.championships?.finished    ?? 0 },
      ]
    : [];

  // Dados para gráfico de tipos de usuários
  const userTypeData = s?.users_by_type
    ? Object.entries(s.users_by_type).map(([type, count]) => ({
        name: USER_TYPE_LABELS[type] ?? type,
        count: count as number,
        color: USER_TYPE_COLORS[type] ?? '#9CA3AF',
      }))
    : [];

  return (
    <div className="space-y-10 pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gold mb-1">
            Painel Administrativo
          </p>
          <h1 className="text-3xl font-bold text-text">
            Visão Geral da Plataforma
          </h1>
          <p className="mt-1 text-muted">
            Olá, <span className="font-semibold text-text">{user?.first_name}</span>. Aqui está o resumo do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 mt-3 md:mt-0">
          <span className="rounded-full border border-green/30 bg-green/10 px-3 py-1 text-xs font-semibold text-green flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-green animate-pulse" />
            Sistema Online
          </span>
        </div>
      </div>

      {/* ── Overview: 5 KPIs principais ────────────────────────────────── */}
      <div>
        <SectionLabel>Visão Geral</SectionLabel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard
            label="Usuários Ativos"
            value={s?.overview?.total_users ?? 0}
            sub="Contas ativas"
            icon={Users}
            accent="gold"
            href="/admin/jogadores"
            loading={isLoading}
          />
          <StatCard
            label="Jogadores"
            value={s?.overview?.total_players ?? 0}
            sub="Com perfil"
            icon={Star}
            accent="blue"
            href="/admin/jogadores"
            loading={isLoading}
          />
          <StatCard
            label="Times"
            value={s?.overview?.total_teams ?? 0}
            sub="Times ativos"
            icon={Shield}
            accent="green"
            href="/admin/times"
            loading={isLoading}
          />
          <StatCard
            label="Campeonatos"
            value={s?.overview?.total_championships ?? 0}
            sub="Total criados"
            icon={Trophy}
            accent="warning"
            href="/admin/campeonatos"
            loading={isLoading}
          />
          <StatCard
            label="Partidas"
            value={s?.overview?.total_matches ?? 0}
            sub="Total registradas"
            icon={Calendar}
            accent="gold"
            href="/admin/partidas"
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── Gráficos ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Gráfico: Campeonatos por Status */}
        <div className="rounded-2xl border border-border bg-surface1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-0.5">Campeonatos</p>
              <h3 className="text-lg font-bold text-text">Status dos Campeonatos</h3>
            </div>
            <Link
              href="/admin/campeonatos"
              className="flex items-center gap-1 text-xs text-gold hover:text-gold2 transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-surface2" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={champChartData} barCategoryGap="35%">
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {champChartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={CHAMP_STATUS_COLORS[entry.name] ?? '#D6A11E'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* mini-cards status */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { label: 'Abertos',      val: s?.championships?.open ?? 0,        color: 'text-green',   bg: 'bg-green/10'   },
              { label: 'Em Andamento', val: s?.championships?.in_progress ?? 0, color: 'text-warning', bg: 'bg-warning/10' },
              { label: 'Finalizados',  val: s?.championships?.finished ?? 0,    color: 'text-muted',   bg: 'bg-white/5'    },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl ${item.bg} px-3 py-2 text-center`}>
                <p className={`font-mono text-xl font-bold ${item.color}`}>{item.val}</p>
                <p className="text-xs text-muted mt-0.5">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico: Usuários por Tipo */}
        <div className="rounded-2xl border border-border bg-surface1 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted mb-0.5">Usuários</p>
              <h3 className="text-lg font-bold text-text">Distribuição por Tipo</h3>
            </div>
            <Link
              href="/admin/jogadores"
              className="flex items-center gap-1 text-xs text-gold hover:text-gold2 transition-colors"
            >
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="h-48 animate-pulse rounded-xl bg-surface2" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={userTypeData} barCategoryGap="35%">
                <XAxis
                  dataKey="name"
                  tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {userTypeData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* legenda */}
          <div className="mt-4 flex flex-wrap gap-3">
            {userTypeData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-xs text-muted">{d.name}</span>
                <span className="font-mono text-xs font-bold text-text">{d.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Partidas ────────────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Partidas</SectionLabel>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Agendadas"
            value={s?.matches?.scheduled ?? 0}
            sub="Aguardando realização"
            icon={Clock}
            accent="blue"
            href="/admin/partidas?status=SCHEDULED"
            loading={isLoading}
          />
          <StatCard
            label="Ao Vivo"
            value={s?.matches?.live ?? 0}
            sub="Acontecendo agora"
            icon={Activity}
            accent="green"
            href="/admin/partidas?status=IN_PROGRESS"
            loading={isLoading}
          />
          <StatCard
            label="Finalizadas"
            value={s?.matches?.finished ?? 0}
            sub="Resultado confirmado"
            icon={CheckCircle}
            accent="gold"
            href="/admin/partidas?status=FINISHED"
            loading={isLoading}
          />
          <StatCard
            label="Contestadas"
            value={s?.matches?.contested ?? 0}
            sub="Requerem revisão"
            icon={AlertTriangle}
            accent="red"
            href="/admin/partidas?status=CONTESTED"
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── Atividade recente ────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Atividade — Últimos 7 dias</SectionLabel>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard
            label="Novos Usuários"
            value={s?.recent_activity?.new_users_week ?? 0}
            sub="Cadastros na semana"
            icon={UserPlus}
            accent="gold"
            loading={isLoading}
          />
          <StatCard
            label="Novos Times"
            value={s?.recent_activity?.new_teams_week ?? 0}
            sub="Times criados na semana"
            icon={Shield}
            accent="green"
            loading={isLoading}
          />
          <StatCard
            label="Partidas Recentes"
            value={s?.recent_activity?.recent_matches ?? 0}
            sub="Partidas na semana"
            icon={Calendar}
            accent="blue"
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── Ações rápidas ───────────────────────────────────────────────── */}
      <div>
        <SectionLabel>Ações Rápidas</SectionLabel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Criar Campeonato',        href: '/championships',                  icon: Trophy,        accent: 'bg-gold/10 text-gold border-gold/20'       },
            { label: 'Ver Contestações',         href: '/admin/partidas?status=CONTESTED', icon: AlertTriangle, accent: 'bg-error/10 text-error border-error/20'     },
            { label: 'Inscrições Pendentes',     href: '/admin/inscricoes?status=PENDING_PAYMENT', icon: TrendingUp, accent: 'bg-warning/10 text-warning border-warning/20' },
            { label: 'Gerenciar Jogadores',      href: '/admin/jogadores',                icon: Users,         accent: 'bg-blue/10 text-info border-info/20'         },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`
                  flex items-center gap-3 rounded-xl border px-4 py-3
                  transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30
                  ${action.accent}
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Partidas contestadas — alerta ────────────────────────────────── */}
      {(s?.matches?.contested ?? 0) > 0 && (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-error/15">
              <AlertTriangle className="h-5 w-5 text-error" />
            </div>
            <div>
              <p className="font-semibold text-text">
                {s.matches.contested} partida{s.matches.contested > 1 ? 's' : ''} contestada{s.matches.contested > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-muted">Requerem revisão e resolução manual.</p>
            </div>
          </div>
          <Link
            href="/admin/partidas?status=CONTESTED"
            className="shrink-0 rounded-xl bg-error/15 border border-error/30 px-4 py-2 text-sm font-semibold text-error hover:bg-error/25 transition-colors"
          >
            Resolver agora
          </Link>
        </div>
      )}
    </div>
  );
}
