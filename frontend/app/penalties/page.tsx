'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { penaltiesAPI, appealsAPI } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import { Card, Skeleton, PageHeader } from '@/components/shared/ui';
import { ShieldAlert, AlertTriangle, Clock, FileText, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

// ─── tipos locais ─────────────────────────────────────────────────────────────

interface Penalty {
  id: number;
  penalty_type: string;
  penalty_type_display: string;
  target_type: string;
  target_type_display: string;
  target_name: string;
  reason: string;
  description: string;
  status: string;
  status_display: string;
  games_suspended: number;
  games_served: number;
  fine_amount: string | null;
  points_deducted: number;
  match: number | null;
  championship: number | null;
  championship_name: string | null;
  created_at: string;
  appeal_submitted_at?: string | null;
  appeal?: Appeal | null;
}

interface Appeal {
  id: number;
  penalty: number;
  penalty_detail?: Penalty;
  reason: string;
  evidence: string | null;
  status: string;
  status_display: string;
  decision: string | null;
  decision_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// ─── helpers visuais ─────────────────────────────────────────────────────────

function penaltyTypeBadge(type: string, label: string) {
  const map: Record<string, string> = {
    WARNING: 'bg-muted/20 text-muted border border-muted/30',
    YELLOW_CARD: 'bg-warning/20 text-warning border border-warning/30',
    RED_CARD: 'bg-error/20 text-error border border-error/30',
    WALKOVER: 'bg-surface2 text-text border border-border',
    NO_SHOW: 'bg-error/10 text-error border border-error/20',
    FINANCIAL: 'bg-gold/10 text-gold border border-gold/20',
    SUSPENSION: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
    OTHER: 'bg-surface2 text-muted border border-border',
  };
  const icons: Record<string, string> = {
    WARNING: '⚪',
    YELLOW_CARD: '🟡',
    RED_CARD: '🔴',
    WALKOVER: '🏁',
    NO_SHOW: '🚫',
    FINANCIAL: '💰',
    SUSPENSION: '⛔',
    OTHER: '📋',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[type] || map.OTHER}`}>
      {icons[type] || '📋'} {label}
    </span>
  );
}

function statusBadge(status: string, label: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-warning/20 text-warning border border-warning/30',
    SERVED: 'bg-green/20 text-green border border-green/30',
    APPEALED: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
    CANCELLED: 'bg-muted/20 text-muted border border-muted/30',
  };
  const icons: Record<string, string> = {
    ACTIVE: '🟡',
    SERVED: '✅',
    APPEALED: '⚙️',
    CANCELLED: '⛔',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-surface2 text-muted'}`}>
      {icons[status] || '•'} {label}
    </span>
  );
}

function appealStatusBadge(status: string, label: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-warning/20 text-warning border border-warning/30',
    APPROVED: 'bg-green/20 text-green border border-green/30',
    REJECTED: 'bg-error/20 text-error border border-error/30',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || 'bg-surface2 text-muted'}`}>
      {label}
    </span>
  );
}

function SuspensionBar({ served, total }: { served: number; total: number }) {
  if (total === 0) return <span className="text-muted text-xs">—</span>;
  const pct = Math.min(100, Math.round((served / total) * 100));
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-gold to-gold2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted whitespace-nowrap">{served}/{total}</span>
    </div>
  );
}

// ─── modal de recurso ─────────────────────────────────────────────────────────

function AppealModal({ penalty, onClose }: { penalty: Penalty; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (formData: FormData) => penaltiesAPI.appeal(penalty.id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      onClose();
    },
    onError: () => setError('Erro ao enviar recurso. Tente novamente.'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('O motivo do recurso é obrigatório.'); return; }
    const fd = new FormData();
    fd.append('reason', reason.trim());
    if (file) fd.append('evidence', file);
    mutation.mutate(fd);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface1 border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-warning/10">
              <FileText className="w-5 h-5 text-warning" />
            </div>
            <div>
              <h2 className="font-bold text-text">Enviar Recurso</h2>
              <p className="text-xs text-muted">{penalty.target_name} · {penalty.penalty_type_display}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Motivo do Recurso <span className="text-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="Descreva o motivo pelo qual você está recorrendo desta penalidade..."
              rows={5}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm resize-none focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Evidência <span className="text-muted">(opcional)</span>
            </label>
            <label className="flex items-center gap-3 bg-surface2 border border-border border-dashed rounded-xl px-4 py-3 cursor-pointer hover:border-gold/40 transition-colors">
              <FileText className="w-4 h-4 text-muted flex-shrink-0" />
              <span className="text-sm text-muted truncate">
                {file ? file.name : 'Clique para anexar arquivo (imagem, PDF, etc.)'}
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf,.mp4,.mov"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 text-error text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted hover:text-text hover:bg-surface2 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-gold text-black font-semibold text-sm hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {mutation.isPending ? 'Enviando...' : 'Enviar Recurso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── modal de revisão admin ───────────────────────────────────────────────────

function ReviewModal({ appeal, onClose }: { appeal: Appeal; onClose: () => void }) {
  const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => appealsAPI.review(appeal.id, { decision, decision_reason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['penalties'] });
      queryClient.invalidateQueries({ queryKey: ['appeals'] });
      onClose();
    },
    onError: () => setError('Erro ao registrar decisão. Tente novamente.'),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) { setError('A justificativa da decisão é obrigatória.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface1 border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gold/10">
              <ShieldAlert className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="font-bold text-text">Revisar Recurso</h2>
              <p className="text-xs text-muted">ID #{appeal.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 border-b border-border bg-surface2/50">
          <p className="text-xs text-muted mb-1">Motivo do recurso</p>
          <p className="text-sm text-text">{appeal.reason}</p>
          {appeal.evidence && (
            <a href={appeal.evidence} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-gold hover:underline">
              <FileText className="w-3 h-3" /> Ver evidência
            </a>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setDecision('approved')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                decision === 'approved'
                  ? 'bg-green/20 border-green/40 text-green'
                  : 'border-border text-muted hover:bg-surface2'
              }`}
            >
              <Check className="w-4 h-4" /> Aprovar
            </button>
            <button
              type="button"
              onClick={() => setDecision('rejected')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
                decision === 'rejected'
                  ? 'bg-error/20 border-error/40 text-error'
                  : 'border-border text-muted hover:bg-surface2'
              }`}
            >
              <X className="w-4 h-4" /> Rejeitar
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Justificativa <span className="text-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="Explique a decisão tomada..."
              rows={4}
              className="w-full bg-surface2 border border-border rounded-xl px-4 py-3 text-text placeholder-muted text-sm resize-none focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-error/10 border border-error/30 rounded-xl px-4 py-2.5 text-error text-sm">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted hover:text-text hover:bg-surface2 transition-colors text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={mutation.isPending}
              className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                decision === 'approved'
                  ? 'bg-green text-black hover:bg-green/90'
                  : 'bg-error text-white hover:bg-error/90'
              }`}>
              {mutation.isPending ? 'Salvando...' : (decision === 'approved' ? 'Confirmar Aprovação' : 'Confirmar Rejeição')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── página principal ─────────────────────────────────────────────────────────

export default function PenaltiesPage() {
  const { canManageChampionships } = usePermissions();
  const [appealTarget, setAppealTarget] = useState<Penalty | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Appeal | null>(null);
  const [showAdminSection, setShowAdminSection] = useState(true);

  const { data: penaltiesData, isLoading: penaltiesLoading } = useQuery({
    queryKey: ['penalties'],
    queryFn: () => penaltiesAPI.getAll(),
  });

  const { data: appealsData, isLoading: appealsLoading } = useQuery({
    queryKey: ['appeals'],
    queryFn: () => appealsAPI.getAll(),
    enabled: canManageChampionships,
  });

  const penalties: Penalty[] = (penaltiesData as any)?.results ?? penaltiesData ?? [];
  const appeals: Appeal[] = (appealsData as any)?.results ?? appealsData ?? [];

  const activePenalties = penalties.filter((p) => p.status === 'ACTIVE');
  const totalSuspensions = activePenalties.reduce((acc, p) => acc + Math.max(0, p.games_suspended - p.games_served), 0);
  const pendingAppeals = appeals.filter((a) => a.status === 'PENDING');

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Penalidades"
        subtitle="Gerenciamento de punições, suspensões e recursos"
        icon={<ShieldAlert className="w-8 h-8" />}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-error/10 flex-shrink-0">
              <ShieldAlert className="w-6 h-6 text-error" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-error">{activePenalties.length}</div>
              <div className="text-sm text-muted">Penalidades Ativas</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-warning/10 flex-shrink-0">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-warning">{totalSuspensions}</div>
              <div className="text-sm text-muted">Jogos de Suspensão Restantes</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 flex-shrink-0">
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <div className="text-2xl font-mono font-bold text-blue-400">{pendingAppeals.length}</div>
              <div className="text-sm text-muted">Recursos Pendentes</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Tabela de Penalidades */}
      <Card title="📋 Penalidades">
        {penaltiesLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : penalties.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-3">🛡️</div>
            <p className="text-muted">Nenhuma penalidade registrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {['Tipo', 'Alvo', 'Motivo', 'Status', 'Suspensão', 'Data', 'Ação'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider first:pl-0">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {penalties.map((p) => (
                  <tr key={p.id} className="hover:bg-surface2/50 transition-colors">
                    <td className="px-4 py-3 first:pl-0">
                      {penaltyTypeBadge(p.penalty_type, p.penalty_type_display)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-text">{p.target_name}</div>
                      <div className="text-xs text-muted">{p.target_type_display}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-text truncate" title={p.reason}>{p.reason}</p>
                      {p.championship_name && (
                        <p className="text-xs text-muted">{p.championship_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {statusBadge(p.status, p.status_display)}
                    </td>
                    <td className="px-4 py-3">
                      <SuspensionBar served={p.games_served} total={p.games_suspended} />
                    </td>
                    <td className="px-4 py-3 text-muted whitespace-nowrap">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {p.status === 'ACTIVE' && !p.appeal_submitted_at && (
                        <button
                          onClick={() => setAppealTarget(p)}
                          className="px-3 py-1.5 rounded-lg bg-surface2 border border-border text-xs font-medium text-text hover:border-gold/40 hover:text-gold transition-colors whitespace-nowrap"
                        >
                          Recorrer
                        </button>
                      )}
                      {p.status === 'APPEALED' && (
                        <span className="text-xs text-blue-400">Em análise</span>
                      )}
                      {(p.status === 'SERVED' || p.status === 'CANCELLED') && (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Seção Admin — Recursos Pendentes */}
      {canManageChampionships && (
        <Card>
          <button
            onClick={() => setShowAdminSection((v) => !v)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gold/10">
                <ShieldAlert className="w-5 h-5 text-gold" />
              </div>
              <div>
                <h3 className="font-bold text-text">Painel Admin — Recursos</h3>
                <p className="text-xs text-muted">
                  {pendingAppeals.length} pendente{pendingAppeals.length !== 1 ? 's' : ''} de análise
                </p>
              </div>
            </div>
            {showAdminSection ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
          </button>

          {showAdminSection && (
            <div className="mt-5 border-t border-border pt-5">
              {appealsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : appeals.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-muted">Nenhum recurso para analisar</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {['#', 'Penalidade', 'Motivo do Recurso', 'Evidência', 'Status', 'Data', 'Ações'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {appeals.map((a) => (
                        <tr key={a.id} className="hover:bg-surface2/50 transition-colors">
                          <td className="px-4 py-3 text-muted font-mono text-xs">#{a.id}</td>
                          <td className="px-4 py-3">
                            <div className="text-text text-xs">Penalidade #{a.penalty}</div>
                          </td>
                          <td className="px-4 py-3 max-w-[240px]">
                            <p className="text-text text-xs truncate" title={a.reason}>{a.reason}</p>
                          </td>
                          <td className="px-4 py-3">
                            {a.evidence ? (
                              <a href={a.evidence} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-gold hover:underline flex items-center gap-1">
                                <FileText className="w-3 h-3" /> Ver
                              </a>
                            ) : (
                              <span className="text-xs text-muted">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {appealStatusBadge(a.status, a.status_display || a.status)}
                          </td>
                          <td className="px-4 py-3 text-muted text-xs whitespace-nowrap">
                            {formatDate(a.created_at)}
                          </td>
                          <td className="px-4 py-3">
                            {a.status === 'PENDING' ? (
                              <button
                                onClick={() => setReviewTarget(a)}
                                className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-xs font-medium text-gold hover:bg-gold/20 transition-colors whitespace-nowrap"
                              >
                                Analisar
                              </button>
                            ) : (
                              <span className="text-xs text-muted">
                                {a.decision === 'approved' ? '✅ Aprovado' : a.decision === 'rejected' ? '❌ Rejeitado' : '—'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Modais */}
      {appealTarget && (
        <AppealModal penalty={appealTarget} onClose={() => setAppealTarget(null)} />
      )}
      {reviewTarget && (
        <ReviewModal appeal={reviewTarget} onClose={() => setReviewTarget(null)} />
      )}
    </div>
  );
}
