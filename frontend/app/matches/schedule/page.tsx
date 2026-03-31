'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Users, X } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { matchesAPI, matchProposalsAPI, matchConfirmationsAPI, teamsAPI } from '@/lib/api';
import { MatchCalendar } from '@/components/matches/MatchCalendar';
import { ProposeDateModal } from '@/components/matches/ProposeDateModal';
import { ConfirmPresenceModal } from '@/components/matches/ConfirmPresenceModal';

// ─── Modal inline de recusa de proposta ──────────────────────────────────────

function RejectProposalModal({
  proposalId,
  onConfirm,
  onClose,
}: {
  proposalId: number;
  onConfirm: (id: number, reason: string) => void;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('O motivo da recusa é obrigatório.');
      return;
    }
    onConfirm(proposalId, reason.trim());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-surface1 border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-error/10">
              <XCircle className="w-5 h-5 text-error" />
            </div>
            <h2 className="font-bold text-text">Recusar Proposta</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1.5">
              Motivo da recusa <span className="text-error">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => { setReason(e.target.value); setError(''); }}
              placeholder="Explique por que está recusando esta proposta de data..."
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

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-border text-muted hover:text-text hover:bg-surface2 transition-colors text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-xl bg-error text-white font-semibold text-sm hover:bg-error/90 transition-colors"
            >
              Confirmar Recusa
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function MatchSchedulePage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [rejectProposalTarget, setRejectProposalTarget] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: myTeamData } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => teamsAPI.getMyTeam(),
    // 404 é esperado para usuários sem time — não propaga erro
    retry: false,
  });
  const myTeamId: number | null = (myTeamData as any)?.id ?? null;

  const { data: matchesData, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches', 'schedule'],
    queryFn: () => matchesAPI.getAll({ page_size: 100 }),
  });

  const { data: proposalsData, isLoading: proposalsLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => matchProposalsAPI.getAll({ page_size: 100 }),
  });

  const { data: confirmationsData, isLoading: confirmationsLoading } = useQuery({
    queryKey: ['confirmations'],
    queryFn: () => matchConfirmationsAPI.getAll({ page_size: 100 }),
  });

  const isLoading = matchesLoading || proposalsLoading || confirmationsLoading;

  const matches: any[] = (matchesData as any)?.results ?? [];
  const proposals: any[] = (proposalsData as any)?.results ?? [];
  const confirmations: any[] = (confirmationsData as any)?.results ?? [];

  // ── Mutations ──────────────────────────────────────────────────────────────

  const invalidateSchedule = () => {
    queryClient.invalidateQueries({ queryKey: ['proposals'] });
    queryClient.invalidateQueries({ queryKey: ['confirmations'] });
    queryClient.invalidateQueries({ queryKey: ['matches', 'schedule'] });
  };

  const acceptProposalMutation = useMutation({
    mutationFn: (proposalId: number) =>
      matchProposalsAPI.respond(proposalId, { action: 'accept' }),
    onSuccess: invalidateSchedule,
  });

  const rejectProposalMutation = useMutation({
    mutationFn: ({ proposalId, reason }: { proposalId: number; reason: string }) =>
      matchProposalsAPI.respond(proposalId, { action: 'reject', rejection_reason: reason }),
    onSuccess: invalidateSchedule,
  });

  // ── Derivações ─────────────────────────────────────────────────────────────

  const getMatchConfirmation = (matchId: number, teamId: number | null) => {
    if (!teamId) return undefined;
    return confirmations.find((c) => c.match === matchId && c.team === teamId);
  };

  const getMatchProposals = (matchId: number) =>
    proposals.filter((p) => p.match === matchId && p.status === 'PENDING');

  const myMatches = myTeamId
    ? matches.filter(
        (match) =>
          match.home_team?.id === myTeamId || match.away_team?.id === myTeamId
      )
    : [];

  const filteredMatches = myMatches.filter((match) => {
    if (filter === 'pending') {
      return match.status === 'PENDING' || match.status === 'SCHEDULED';
    }
    if (filter === 'confirmed') {
      const confirmation = getMatchConfirmation(match.id, myTeamId);
      return confirmation?.status === 'CONFIRMED';
    }
    return true;
  });

  const pendingConfirmations = myMatches.filter((match) => {
    const confirmation = getMatchConfirmation(match.id, myTeamId);
    return !confirmation || confirmation.status === 'PENDING';
  }).length;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectMatch = (match: any) => {
    setSelectedMatch(match);
    setSelectedDate(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedMatch(null);
  };

  const handleProposeDate = (match: any) => {
    setSelectedMatch(match);
    setProposeModalOpen(true);
  };

  const handleConfirmPresence = (match: any) => {
    setSelectedMatch(match);
    setConfirmModalOpen(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-surface2 border-t-gold mx-auto"></div>
          <p className="text-sm text-muted">Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border bg-surface1">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-xl bg-gradient-to-br from-gold to-gold2 p-3">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                   <h1 className="text-2xl sm:text-3xl font-bold text-text">Agendamento de Partidas</h1>
                  <p className="text-sm text-muted">
                    Gerencie o calendário e confirme suas partidas
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-gold">{myMatches.length}</div>
                <div className="text-xs text-muted">Total de Partidas</div>
              </div>
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-yellow-500">{pendingConfirmations}</div>
                <div className="text-xs text-muted">Aguardando</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {!myTeamId && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-warning text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>Você não está associado a nenhum time. Entre em um time para ver suas partidas.</span>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar - 2/3 width */}
          <div className="lg:col-span-2">
            <MatchCalendar
              matches={filteredMatches}
              onSelectMatch={handleSelectMatch}
              onSelectDate={handleSelectDate}
            />
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="rounded-xl border border-border bg-surface1 p-4">
              <h3 className="mb-3 font-semibold text-text">Filtros</h3>
              <div className="space-y-2">
                {(['all', 'pending', 'confirmed'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                      filter === f
                        ? 'bg-gold text-white'
                        : 'text-muted hover:bg-surface2 hover:text-text'
                    }`}
                  >
                    {f === 'all' ? 'Todas as Partidas' : f === 'pending' ? 'Pendentes' : 'Confirmadas'}
                  </button>
                ))}
              </div>
            </div>

            {/* Selected Match Info */}
            {selectedMatch && (
              <div className="rounded-xl border border-border bg-surface1 p-4">
                <h3 className="mb-3 font-semibold text-text">Detalhes da Partida</h3>

                <div className="mb-4 rounded-lg bg-surface2 p-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="font-semibold text-text">
                      {selectedMatch.home_team?.name}
                    </span>
                    <span className="text-gold">vs</span>
                    <span className="font-semibold text-text">
                      {selectedMatch.away_team?.name}
                    </span>
                  </div>

                  {selectedMatch.scheduled_date && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(selectedMatch.scheduled_date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  {selectedMatch.status === 'PENDING' && (
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-500">
                        Aguardando Agendamento
                      </span>
                    </div>
                  )}
                  {selectedMatch.status === 'SCHEDULED' && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">Agendada</span>
                    </div>
                  )}
                </div>

                {/* Proposals */}
                {getMatchProposals(selectedMatch.id).length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h4 className="text-sm font-medium text-muted">Propostas Pendentes</h4>
                    {getMatchProposals(selectedMatch.id).map((proposal: any) => (
                      <div
                        key={proposal.id}
                        className="rounded-lg border border-border bg-surface2 p-3"
                      >
                        <div className="mb-2 text-xs text-muted">
                          Proposta de: {proposal.proposed_by_team_name}
                        </div>
                        <div className="mb-2 text-sm font-medium text-text">
                          {new Date(proposal.proposed_date).toLocaleString('pt-BR')}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => acceptProposalMutation.mutate(proposal.id)}
                            disabled={acceptProposalMutation.isPending}
                            className="flex-1 rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600 transition-colors disabled:opacity-50"
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => setRejectProposalTarget(proposal.id)}
                            disabled={rejectProposalMutation.isPending}
                            className="flex-1 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {selectedMatch.status === 'PENDING' && (
                    <button
                      onClick={() => handleProposeDate(selectedMatch)}
                      className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold/90"
                    >
                      Propor Nova Data
                    </button>
                  )}

                  {selectedMatch.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleConfirmPresence(selectedMatch)}
                      className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                    >
                      Confirmar Presença
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedDate && !selectedMatch && (
              <div className="rounded-xl border border-border bg-surface1 p-4">
                <h3 className="mb-3 font-semibold text-text">Data Selecionada</h3>
                <p className="text-sm text-muted">
                  {selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>

                <div className="mt-4 space-y-2">
                  {filteredMatches
                    .filter((match) => {
                      if (!match.scheduled_date) return false;
                      const matchDate = new Date(match.scheduled_date);
                      return (
                        matchDate.getDate() === selectedDate.getDate() &&
                        matchDate.getMonth() === selectedDate.getMonth() &&
                        matchDate.getFullYear() === selectedDate.getFullYear()
                      );
                    })
                    .map((match) => (
                      <button
                        key={match.id}
                        onClick={() => handleSelectMatch(match)}
                        className="w-full rounded-lg bg-surface2 p-3 text-left transition-colors hover:bg-gold/10"
                      >
                        <div className="text-sm font-medium text-text">
                          {match.home_team?.name} vs {match.away_team?.name}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(match.scheduled_date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {!selectedMatch && !selectedDate && (
              <div className="rounded-xl border border-border bg-surface1 p-8 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-muted" />
                <p className="text-sm text-muted">
                  Selecione uma partida ou data no calendário para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedMatch && (
        <>
          <ProposeDateModal
            match={selectedMatch}
            isOpen={proposeModalOpen}
            onClose={() => setProposeModalOpen(false)}
            onSuccess={() => {
              invalidateSchedule();
              setProposeModalOpen(false);
            }}
          />

          <ConfirmPresenceModal
            match={selectedMatch}
            teamId={myTeamId ?? 0}
            confirmationId={getMatchConfirmation(selectedMatch.id, myTeamId)?.id}
            confirmationStatus={getMatchConfirmation(selectedMatch.id, myTeamId)?.status}
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onSuccess={() => {
              invalidateSchedule();
              setConfirmModalOpen(false);
            }}
          />
        </>
      )}

      {rejectProposalTarget !== null && (
        <RejectProposalModal
          proposalId={rejectProposalTarget}
          onConfirm={(id, reason) => rejectProposalMutation.mutate({ proposalId: id, reason })}
          onClose={() => setRejectProposalTarget(null)}
        />
      )}
    </div>
  );
}
