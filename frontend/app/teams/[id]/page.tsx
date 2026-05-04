'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { teamsAPI, leaveRequestsAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { usePermissions } from '@/lib/hooks';
import { TEAM_MAX_PLAYERS } from '@/lib/team-constants';
import { Button, Card, Badge, Input, useToast, TermsModal } from '@/components/shared/ui';
import { MembersTab } from '@/components/teams/MembersTab';
import { InvitePlayerTab } from '@/components/teams/InvitePlayerTab';
import { TeamMatchesTab } from '@/components/teams/tabs/TeamMatchesTab';
import { TeamPerformanceTab } from '@/components/teams/tabs/TeamPerformanceTab';
import type { TeamMembership, TeamLeaveRequest } from '@/types';
import { Z_INDEX } from '@/lib/ui/z-index';
import {
  ArrowLeft,
  Users,
  Trophy,
  Target,
  Crosshair,
  Shield,
  UserPlus,
  CalendarDays,
  Trash2,
  LogOut,
  Crown,
  FileText,
  BarChart3,
} from 'lucide-react';
import { statisticsAPI } from '@/lib/api';

const TacticalBoard = dynamic(
  () => import('@/components/teams/TacticalBoard').then((mod) => mod.TacticalBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center rounded-2xl border border-border bg-surface1 p-10 text-sm text-muted">
        Carregando campo tatico...
      </div>
    ),
  }
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamOverallStats {
  team_id: number | string;
  matches: { total: number; wins: number; draws: number; losses: number; win_rate: number };
  goals: { scored: number; conceded: number; difference: number; per_match: number; conceded_per_match: number };
  cards: { yellow: number; red: number; total: number };
  clean_sheets: number;
  current_form: ('W' | 'D' | 'L')[];
}

type TabId = 'members' | 'tactical' | 'stats' | 'matches' | 'performance';

// ─── Framer Motion variants ───────────────────────────────────────────────────

function useVariants() {
  const prefersReduced = useReducedMotion();

  const page: Variants = prefersReduced
    ? { hidden: {}, visible: {} }
    : { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };

  const item: Variants = prefersReduced
    ? { hidden: {}, visible: {} }
    : {
        hidden:  { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
      };

  const fadeIn: Variants = prefersReduced
    ? { hidden: {}, visible: {}, exit: {} }
    : {
        hidden:  { opacity: 0 },
        visible: { opacity: 1, transition: { duration: 0.3 } },
        exit:    { opacity: 0, transition: { duration: 0.15 } },
      };

  return { page, item, fadeIn };
}

// ─── Aba: Estatísticas ────────────────────────────────────────────────────────

function StatsTab({ teamStats }: { teamStats: TeamOverallStats | null }) {
  const { item } = useVariants();

  if (!teamStats) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Trophy className="w-12 h-12 text-gold/20" />
        <p className="text-center text-muted text-sm">
          Estatísticas disponíveis após as primeiras partidas.
        </p>
      </div>
    );
  }

  const { matches, goals } = teamStats;
  const winRate = matches.win_rate;

  const statItems = [
    { label: 'Partidas Jogadas', value: matches.total,   icon: CalendarDays, color: 'text-gold' },
    { label: 'Vitórias',        value: matches.wins,     icon: Trophy,       color: 'text-gold' },
    { label: 'Empates',         value: matches.draws,    icon: Shield,       color: 'text-muted' },
    { label: 'Derrotas',        value: matches.losses,   icon: Target,       color: 'text-error' },
    { label: 'Gols Marcados',   value: goals.scored,     icon: Crosshair,    color: 'text-green-400' },
    { label: 'Gols Sofridos',   value: goals.conceded,   icon: Crosshair,    color: 'text-error' },
  ];

  return (
    <div className="space-y-6">
      {/* Taxa de vitória */}
      {matches.total > 0 && (
        <motion.div
          variants={item}
          className="p-6 rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/8 via-gold/4 to-transparent flex items-center gap-6"
        >
          <div className="text-center flex-shrink-0">
            <div className="text-5xl font-black font-mono text-gold leading-none">{winRate.toFixed(0)}%</div>
            <div className="text-xs text-muted mt-1 uppercase tracking-widest font-mono">Taxa de Vitória</div>
          </div>
          <div className="flex-1">
            <div className="h-2 bg-surface2 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${winRate}%` }}
                transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-gold3 via-gold to-gold2 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Grid de stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statItems.map(({ label, value, icon: Icon, color }) => (
          <motion.div
            key={label}
            variants={item}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="group flex flex-col items-center gap-2 p-5 rounded-2xl
                       bg-surface1 border border-border
                       hover:border-gold/30 hover:shadow-lg hover:shadow-gold/10
                       transition-colors duration-300 cursor-default"
          >
            <Icon className={`w-5 h-5 ${color} transition-transform duration-300 group-hover:scale-110`} />
            <div className="text-3xl font-black text-text font-mono leading-none">{value}</div>
            <div className="text-xs text-muted text-center leading-tight">{label}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Aba: Campo Tático ────────────────────────────────────────────────────────

function TacticalTab({ team, members, isOwner }: { team: any; members: TeamMembership[]; isOwner: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted mb-6 leading-relaxed">
        {isOwner
          ? 'Selecione uma partida agendada, escolha a formação e posicione os jogadores no campo. A escalação fica salva e os jogadores são notificados automaticamente.'
          : 'Visualize a escalação definida pelo dono do time. Selecione uma partida para ver o quadro tático.'}
      </p>
      <TacticalBoard team={team} members={members} readOnly={!isOwner} />
    </div>
  );
}

// ─── Sub-abas Membros ─────────────────────────────────────────────────────────

type MemberSubTab = 'list' | 'invite';

function MemberSubTabs({
  teamId, members, isLoading, isOwner, isAtLimit, onInviteSent,
}: {
  teamId: number; members: TeamMembership[]; isLoading: boolean;
  isOwner: boolean; isAtLimit: boolean; onInviteSent: () => void;
}) {
  const [sub, setSub] = useState<MemberSubTab>('list');

  return (
    <div className="space-y-5">
      {/* Pill switcher */}
      <div className="flex gap-1 p-1 bg-surface2 rounded-xl w-fit border border-border">
        {(['list', 'invite'] as MemberSubTab[]).map((id) => {
          if (id === 'invite' && !isOwner) return null;
          const labels = { list: `Elenco (${members.length})`, invite: 'Convidar' };
          const icons  = { list: <Users className="w-3.5 h-3.5" />, invite: <UserPlus className="w-3.5 h-3.5" /> };
          return (
            <button
              key={id}
              onClick={() => setSub(id)}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                sub === id
                  ? 'bg-gold/10 text-gold border border-gold/25 shadow-sm'
                  : 'text-muted hover:text-text'
              }`}
            >
              {icons[id]}
              {labels[id]}
            </button>
          );
        })}
      </div>

      {sub === 'list' && (
        <MembersTab
          teamId={teamId} members={members} isLoading={isLoading}
          onMemberRemoved={onInviteSent} readOnly={false}
        />
      )}
      {sub === 'invite' && isOwner && (
        <InvitePlayerTab
          teamId={teamId} isAtLimit={isAtLimit}
          onInviteSent={() => { onInviteSent(); setSub('list'); }}
        />
      )}
    </div>
  );
}

// ─── Modal: Excluir Time ──────────────────────────────────────────────────────

function DeleteTeamModal({ teamName, onClose, onConfirm, isLoading }: {
  teamName: string; onClose: () => void; onConfirm: () => void; isLoading: boolean;
}) {
  const [confirmName, setConfirmName] = useState('');
  const isMatch = confirmName.trim() === teamName.trim();

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md px-4" style={{ zIndex: Z_INDEX.modal }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={  { opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border border-error/30 bg-surface1
                   shadow-[0_0_60px_rgba(229,57,53,0.15)]"
      >
        {/* Linha vermelha no topo */}
        <div className="h-px bg-gradient-to-r from-transparent via-error/60 to-transparent rounded-t-3xl" />

        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-error/10 border border-error/25 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-error" />
              </div>
              <h2 className="text-xl font-heading font-black uppercase tracking-wide text-error">
                Excluir Time
              </h2>
            </div>
            <button onClick={onClose} className="text-muted hover:text-text text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 transition-colors">
              ×
            </button>
          </div>

          <p className="text-sm text-muted mb-5 leading-relaxed">
            Esta ação é <strong className="text-text">irreversível</strong>. O time será desativado,
            todos os membros serão removidos e os convites pendentes serão cancelados.
          </p>

          <p className="text-sm text-muted mb-3">
            Digite o nome do time para confirmar:{' '}
            <strong className="text-text font-mono">{teamName}</strong>
          </p>

          <Input label="" placeholder={teamName} value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)} className="mb-5" />

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              variant="primary"
              onClick={onConfirm}
              disabled={!isMatch}
              loading={isLoading}
              className="flex-1 !bg-error hover:!bg-error/90 !border-error !shadow-none"
            >
              Excluir Time
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Modal: Solicitar Saída ───────────────────────────────────────────────────

function LeaveRequestModal({ teamName, onClose, onConfirm, isLoading }: {
  teamName: string; onClose: () => void; onConfirm: (reason: string) => void; isLoading: boolean;
}) {
  const [reason, setReason] = useState('');

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md px-4" style={{ zIndex: Z_INDEX.modal }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1,    y: 0 }}
        exit={  { opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full max-w-md rounded-3xl border border-gold/20 bg-surface1
                   shadow-[0_0_40px_rgba(214,161,30,0.1)]"
      >
        <div className="h-px bg-gradient-to-r from-transparent via-gold/50 to-transparent rounded-t-3xl" />
        <div className="p-6">
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/25 flex items-center justify-center">
                <LogOut className="w-5 h-5 text-gold" />
              </div>
              <h2 className="text-xl font-heading font-black uppercase tracking-wide text-text">
                Solicitar Saída
              </h2>
            </div>
            <button onClick={onClose} className="text-muted hover:text-text text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface2 transition-colors">
              ×
            </button>
          </div>

          <p className="text-sm text-muted mb-5 leading-relaxed">
            Sua saída do time <strong className="text-text">{teamName}</strong> ficará
            pendente até aprovação do dono. Você continuará no elenco até lá.
          </p>

          <div className="mb-5">
            <label className="block text-xs font-mono font-bold text-muted uppercase tracking-widest mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Informe o motivo da saída..."
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text
                         placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold/40
                         focus:border-gold/50 transition-all resize-none text-sm"
            />
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button variant="primary" onClick={() => onConfirm(reason)} loading={isLoading} className="flex-1">
              Enviar Solicitação
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function TeamDetailPage() {
  const params        = useParams();
  const router        = useRouter();
  const queryClient   = useQueryClient();
  const { isTeamOwner } = usePermissions();
  const user          = useAuthStore((state) => state.user);
  const { showToast } = useToast();
  const { page, item, fadeIn } = useVariants();

  const teamId = Number(params.id);

  const [activeTab,     setActiveTab]     = useState<TabId>('members');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showLeaveModal,  setShowLeaveModal]  = useState(false);
  const [showTerms,       setShowTerms]       = useState(false);

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: team, isLoading: teamLoading, isError } = useQuery({
    queryKey: ['team', teamId],
    queryFn:  () => teamsAPI.getById(teamId),
    enabled:  !isNaN(teamId),
    staleTime: 30000,
  });

  const { data: teamStatsRaw } = useQuery({
    queryKey: ['team-stats', teamId],
    queryFn:  () => statisticsAPI.getTeamOverallStats(teamId),
    enabled:  !isNaN(teamId),
  });

  const { data: leaveRequestsRaw } = useQuery({
    queryKey: ['leave-requests', teamId],
    queryFn:  () => leaveRequestsAPI.getAll({ team: teamId, status: 'PENDING' }),
    enabled:  !isNaN(teamId),
    staleTime: 15000,
  });

  const leaveRequests: TeamLeaveRequest[] = Array.isArray(leaveRequestsRaw) ? leaveRequestsRaw : [];
  const teamStats  = (teamStatsRaw as TeamOverallStats | undefined) ?? null;
  const members: TeamMembership[] = Array.isArray(team?.members) ? team.members : [];
  const membersLoading = teamLoading;
  const isOwner    = isTeamOwner(team);
  const isAtLimit  = members.length >= TEAM_MAX_PLAYERS;

  const myMembership = members.find(
    (m) => m.player?.user_id === user?.id || m.player?.user_email === user?.email
  );
  const myLeaveRequest = leaveRequests.find(
    (lr) => lr.player?.user_id === user?.id || lr.player?.user_email === user?.email
  );

  // ── Mutations ──────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => teamsAPI.delete(teamId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['my-team'] });
      showToast('Time excluído com sucesso.', 'success');
      router.push('/teams');
    },
    onError: (err: any) => showToast(err.response?.data?.error || 'Erro ao excluir time.', 'error'),
  });

  const leaveRequestMutation = useMutation({
    mutationFn: (reason: string) => leaveRequestsAPI.create({ reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', teamId] });
      setShowLeaveModal(false);
      showToast('Solicitação de saída enviada ao dono do time.', 'success');
    },
    onError: (err: any) => showToast(err.response?.data?.error || 'Erro ao enviar solicitação.', 'error'),
  });

  const cancelLeaveRequestMutation = useMutation({
    mutationFn: (id: number) => leaveRequestsAPI.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', teamId] });
      showToast('Solicitação de saída cancelada.', 'success');
    },
    onError: (err: any) => showToast(err.response?.data?.error || 'Erro ao cancelar solicitação.', 'error'),
  });

  const approveLeaveRequestMutation = useMutation({
    mutationFn: (id: number) => leaveRequestsAPI.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      showToast('Saída aprovada.', 'success');
    },
    onError: (err: any) => showToast(err.response?.data?.error || 'Erro ao aprovar saída.', 'error'),
  });

  const rejectLeaveRequestMutation = useMutation({
    mutationFn: (id: number) => leaveRequestsAPI.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leave-requests', teamId] });
      showToast('Solicitação de saída recusada.', 'success');
    },
    onError: (err: any) => showToast(err.response?.data?.error || 'Erro ao recusar solicitação.', 'error'),
  });

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'members',  label: 'Membros',       icon: <Users      className="w-4 h-4" /> },
    { id: 'tactical', label: 'Campo Tático',  icon: <Crosshair  className="w-4 h-4" /> },
    { id: 'stats',    label: 'Estatísticas',  icon: <Trophy     className="w-4 h-4" /> },
    { id: 'performance', label: 'Desempenho', icon: <BarChart3  className="w-4 h-4" /> },
    { id: 'matches',  label: 'Partidas',      icon: <CalendarDays className="w-4 h-4" /> },
  ];

  // ── Loading ────────────────────────────────────────────────────────────────

  if (teamLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-2 border-gold/20 rounded-2xl" />
          <div className="absolute inset-0 w-16 h-16 border-2 border-t-gold border-r-gold/50 rounded-2xl animate-spin" />
        </div>
        <p className="text-muted text-sm font-mono tracking-widest uppercase animate-pulse">
          Carregando time...
        </p>
      </div>
    );
  }

  if (isError || !team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5">
        <div className="w-20 h-20 rounded-2xl bg-surface1 border border-border flex items-center justify-center text-4xl">
          ⚽
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-heading font-bold text-text">Time não encontrado</h2>
          <p className="text-muted text-sm">Este time não existe ou você não tem permissão.</p>
        </div>
        <Button variant="ghost" onClick={() => router.push('/teams')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Times
        </Button>
      </div>
    );
  }

  const foundedYear = team.foundation_date ? new Date(team.foundation_date).getFullYear() : null;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <motion.div
        variants={page}
        initial="hidden"
        animate="visible"
        className="space-y-5 pb-16"
      >

        {/* ── Botão Voltar ─────────────────────────────────────────────────── */}
        <motion.button
          variants={item}
          onClick={() => router.push('/teams')}
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 text-muted hover:text-gold text-sm transition-colors group font-mono uppercase tracking-widest"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-200" />
          Voltar
        </motion.button>

        {/* ── Banner: Solicitações de saída pendentes ────────────────────── */}
        {isOwner && leaveRequests.length > 0 && (
          <motion.div
            variants={item}
            className="rounded-2xl border-l-4 border-l-gold border border-gold/15
                       bg-gold/5 p-4 space-y-3"
          >
            <p className="text-sm font-semibold text-gold font-mono uppercase tracking-wide">
              Solicitações de saída pendentes ({leaveRequests.length})
            </p>
            {leaveRequests.map((lr) => (
              <div key={lr.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 text-sm">
                <div className="min-w-0">
                  <span className="text-text font-medium">{lr.player.player_name}</span>
                  {lr.reason && <span className="text-muted ml-2">— {lr.reason}</span>}
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="primary" className="!py-1 !px-3 !text-xs"
                    loading={approveLeaveRequestMutation.isPending}
                    onClick={() => approveLeaveRequestMutation.mutate(lr.id)}>
                    Aprovar
                  </Button>
                  <Button variant="ghost" className="!py-1 !px-3 !text-xs"
                    loading={rejectLeaveRequestMutation.isPending}
                    onClick={() => rejectLeaveRequestMutation.mutate(lr.id)}>
                    Recusar
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ── HERO DO TIME ────────────────────────────────────────────────── */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <motion.div variants={item} className="relative rounded-3xl overflow-hidden">

          {/* Gradient border wrapper */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-gold3/80 via-gold/40 to-gold3/30 p-px">
            <div className="absolute inset-0 rounded-3xl bg-surface1" />
          </div>

          {/* Glow radial central */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(214,161,30,0.10),transparent_70%)] pointer-events-none rounded-3xl" />

          {/* Scanline decorativo */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none opacity-[0.03]">
            <div className="absolute inset-x-0 top-0 h-px bg-white animate-scanline" />
          </div>

          {/* Linha dourada superior */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/70 to-transparent z-10" />

          <div className="relative p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">

              {/* Logo com ring glow animado */}
              <div className="relative flex-shrink-0">
                {/* Ring externo pulsante */}
                <div className="absolute inset-0 rounded-2xl animate-pulseGold" />
                {/* Ring interno fixo */}
                <div className="absolute inset-0 rounded-2xl border-2 border-gold/40 shadow-[0_0_20px_rgba(214,161,30,0.25)]" />

                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border border-gold/20
                                flex items-center justify-center overflow-hidden bg-surface2">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-5xl sm:text-6xl select-none">⚽</span>
                  )}
                </div>

                {/* Coroa dourada para o dono */}
                {isOwner && (
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-lg bg-gold/15 border border-gold/40
                                  flex items-center justify-center shadow-[0_0_10px_rgba(214,161,30,0.3)]">
                    <Crown className="w-3.5 h-3.5 text-gold" />
                  </div>
                )}
              </div>

              {/* Info principal */}
              <div className="flex-1 min-w-0">

                {/* Nome + abreviação */}
                <div className="flex flex-wrap items-baseline gap-3 mb-2">
                  <h1 className="font-heading font-black uppercase tracking-wide text-3xl sm:text-4xl
                                 bg-clip-text text-transparent
                                 bg-gradient-to-r from-gold3 via-gold2 to-gold
                                 leading-tight break-words">
                    {team.name}
                  </h1>
                  <span className="font-mono text-xs font-bold text-gold/70 bg-gold/10 px-2.5 py-1
                                   rounded-lg border border-gold/20 uppercase tracking-widest">
                    {team.abbreviation}
                  </span>
                </div>

                {/* Badges de status */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <Badge variant={team.is_active ? 'gold' : 'default'}>
                    {team.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {isOwner && <Badge variant="premium">Dono</Badge>}
                  {foundedYear && (
                    <span className="text-xs text-muted flex items-center gap-1 font-mono">
                      <CalendarDays className="w-3 h-3 text-gold/50" />
                      {foundedYear}
                    </span>
                  )}
                  <span className="text-xs text-muted flex items-center gap-1 font-mono">
                    <Users className="w-3 h-3 text-gold/50" />
                    {members.length}/{TEAM_MAX_PLAYERS}
                  </span>
                </div>

                {/* Descrição */}
                {team.description && (
                  <p className="text-sm text-muted leading-relaxed max-w-xl mb-3">
                    {team.description}
                  </p>
                )}

                {/* Dono */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gold/15 border border-gold/25
                                  flex items-center justify-center text-xs font-bold text-gold font-mono">
                    {team.owner?.full_name?.[0] ?? '?'}
                  </div>
                  <span className="text-xs text-muted">
                    Dono: <span className="text-text/80 font-medium">{team.owner?.full_name ?? '-'}</span>
                  </span>
                </div>
              </div>

              {/* Ações */}
              <div className="flex-shrink-0 w-full sm:w-auto self-start sm:self-center">

                {/* Dono */}
                {isOwner && (
                  <div className="flex flex-col gap-2 w-full sm:min-w-[190px]">
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="primary"
                        onClick={() => setActiveTab('members')}
                        className="flex items-center justify-center gap-2 w-full"
                      >
                        <UserPlus className="w-4 h-4" />
                        Convidar Jogador
                      </Button>
                    </motion.div>

                    <div className="flex items-center gap-2 my-0.5">
                      <div className="flex-1 h-px bg-border/60" />
                      <span className="text-[10px] text-muted uppercase tracking-widest font-mono">ou</span>
                      <div className="flex-1 h-px bg-border/60" />
                    </div>

                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="ghost"
                        onClick={() => setShowDeleteModal(true)}
                        className="flex items-center justify-center gap-2 w-full
                                   !text-error border border-error/25
                                   hover:!bg-error/8 hover:border-error/50
                                   hover:shadow-[0_0_16px_rgba(229,57,53,0.15)]"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Time
                      </Button>
                    </motion.div>
                  </div>
                )}

                {/* Membro (não dono) */}
                {!isOwner && myMembership && (
                  <div className="w-full sm:min-w-[190px]">
                    {myLeaveRequest ? (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="ghost"
                          onClick={() => cancelLeaveRequestMutation.mutate(myLeaveRequest.id)}
                          loading={cancelLeaveRequestMutation.isPending}
                          className="flex items-center justify-center gap-2 w-full
                                     !text-gold border border-gold/25 hover:!bg-gold/8"
                        >
                          <LogOut className="w-4 h-4" />
                          Cancelar Saída
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div whileTap={{ scale: 0.97 }}>
                        <Button
                          variant="ghost"
                          onClick={() => setShowLeaveModal(true)}
                          className="flex items-center justify-center gap-2 w-full
                                     !text-error border border-error/25
                                     hover:!bg-error/8 hover:border-error/50"
                        >
                          <LogOut className="w-4 h-4" />
                          Solicitar Saída
                        </Button>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Mini Stats ───────────────────────────────────────────────────── */}
        <motion.div variants={item} className="grid grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'Jogadores',  value: members.length,               icon: Users,   color: 'text-gold' },
            { label: 'Vitórias',   value: teamStats?.matches.wins ?? '-', icon: Trophy,  color: 'text-gold' },
            { label: 'Gols',       value: teamStats?.goals.scored ?? '-', icon: Target,  color: 'text-gold' },
          ].map(({ label, value, icon: Icon, color }) => (
            <motion.div
              key={label}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              whileTap={{ scale: 0.97 }}
              className="group relative p-4 rounded-2xl overflow-hidden
                         bg-surface1 border border-border
                         hover:border-gold/35 hover:shadow-lg hover:shadow-gold/10
                         transition-colors duration-300 cursor-default"
            >
              {/* Glow de fundo no hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-gold/0 to-gold/0
                              group-hover:from-gold/5 group-hover:to-transparent
                              transition-all duration-300 pointer-events-none" />

              <div className="relative flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0
                                group-hover:bg-gold/15 transition-colors duration-300">
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <div>
                  <div className="text-2xl font-black text-text font-mono leading-none">{value}</div>
                  <div className="text-xs text-muted mt-0.5 whitespace-nowrap">{label}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Card de Abas ─────────────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="relative rounded-3xl overflow-hidden border border-border bg-surface1"
        >
          {/* Linha gold no topo */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />

          {/* Tab bar */}
          <div className="flex border-b border-border overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 px-5 py-4 text-sm font-medium
                            whitespace-nowrap transition-colors duration-200 ${
                  activeTab === tab.id ? 'text-gold' : 'text-muted hover:text-text'
                }`}
              >
                {tab.icon}
                {tab.label}

                {/* Indicador gold deslizante */}
                {activeTab === tab.id && (
                  <motion.span
                    layoutId="tab-indicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5
                               bg-gradient-to-r from-gold/0 via-gold to-gold/0 rounded-t-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          {/* Conteúdo das abas */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                variants={fadeIn}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {/* Membros */}
                {activeTab === 'members' && (
                  <div className="space-y-6">
                    {isOwner ? (
                        <MemberSubTabs
                          teamId={teamId} members={members} isLoading={membersLoading}
                          isOwner={isOwner} isAtLimit={isAtLimit}
                          onInviteSent={() => queryClient.invalidateQueries({ queryKey: ['team', teamId] })}
                        />
                    ) : (
                      <MembersTab
                        teamId={teamId} members={members} isLoading={membersLoading}
                        onMemberRemoved={() => queryClient.invalidateQueries({ queryKey: ['team', teamId] })}
                        readOnly
                      />
                    )}
                  </div>
                )}

                {/* Campo Tático */}
                {activeTab === 'tactical' && (
                  <TacticalTab team={team} members={members} isOwner={isOwner} />
                )}

                {/* Estatísticas */}
                {activeTab === 'stats' && <StatsTab teamStats={teamStats} />}

                {/* Desempenho */}
                {activeTab === 'performance' && <TeamPerformanceTab teamId={teamId} />}

                {/* Partidas */}
                {activeTab === 'matches' && (
                  <TeamMatchesTab teamId={teamId} isOwner={isOwner} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Rodapé da página ─────────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="flex items-center justify-center pt-2"
        >
          <button
            onClick={() => setShowTerms(true)}
            className="flex items-center gap-1.5 text-xs text-muted/60 hover:text-gold/70
                       transition-colors duration-200 group font-mono uppercase tracking-widest"
          >
            <FileText className="w-3 h-3 group-hover:text-gold/60 transition-colors" />
            Termos e Condições
          </button>
        </motion.div>

      </motion.div>

      {/* ── Modais ───────────────────────────────────────────────────────────── */}

      <AnimatePresence>
        {showDeleteModal && team && (
          <DeleteTeamModal
            teamName={team.name}
            onClose={() => setShowDeleteModal(false)}
            onConfirm={() => deleteMutation.mutate()}
            isLoading={deleteMutation.isPending}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showLeaveModal && (
          <LeaveRequestModal
            teamName={team.name}
            onClose={() => setShowLeaveModal(false)}
            onConfirm={(reason) => leaveRequestMutation.mutate(reason)}
            isLoading={leaveRequestMutation.isPending}
          />
        )}
      </AnimatePresence>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </>
  );
}
