'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, CheckCircle2, ExternalLink, Gavel, Search } from 'lucide-react';
import { matchesAPI, contestationsAPI } from '@/lib/api';
import { Match, Contestation } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { EmptyState } from '@/components/shared/ui';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils/date';
import { useToast } from '@/components/shared/ui/Toast';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilters } from '@/components/admin/AdminFilters';
import { usePermissions } from '@/lib/hooks';

const MATCH_STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'pending',
  SCHEDULED: 'info',
  IN_PROGRESS: 'live',
  FINISHED: 'finished',
  CANCELLED: 'error',
  CONTESTED: 'contested',
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Ao Vivo',
  FINISHED: 'Finalizada',
  CANCELLED: 'Cancelada',
  CONTESTED: 'Contestada',
};

const CONTESTATION_STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  ACCEPTED: 'success',
  REJECTED: 'error',
};

const CONTESTATION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Em análise',
  ACCEPTED: 'Aceita',
  REJECTED: 'Rejeitada',
};

const DECISION_ACTION_LABELS: Record<string, string> = {
  SUBMITTED: 'Contestação criada',
  UNDER_REVIEW: 'Em análise',
  APPROVE_CURRENT_RESULT: 'Resultado atual aprovado',
  CHANGE_RESULT: 'Resultado alterado',
  CONFIRM_IRREGULAR_RESULT: 'Resultado confirmado com irregularidade',
  CONVERT_TO_WALKOVER: 'Resultado convertido para W.O.',
};

export default function AdminPartidasPage() {
  const { showToast } = useToast();
  const searchParams = useSearchParams();
  const { canReviewContestations } = usePermissions();

  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [reviewReasons, setReviewReasons] = useState<Record<number, string>>({});
  const [winnerChoices, setWinnerChoices] = useState<Record<number, number>>({});
  const [walkoverChoices, setWalkoverChoices] = useState<Record<number, number>>({});

  const contestedCount = matches.filter((m) => m.status === 'CONTESTED').length;
  const requestedMatchId = searchParams.get('match');

  const fetchMatches = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      const res = await matchesAPI.getAll(params);
      setMatches(res.results);
      setTotalCount(res.count);
    } catch {
      showToast('Erro ao carregar partidas', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, showToast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const loadMatchDetails = useCallback(async (matchId: number) => {
    setLoadingDetails(true);
    try {
      const [matchDetail, contestationsList] = await Promise.all([
        matchesAPI.getById(matchId),
        contestationsAPI.getAll({ match: matchId }),
      ]);

      const detailedContestations = await Promise.all(
        (contestationsList.results || []).map((item) => contestationsAPI.getById(item.id))
      );

      setSelectedMatch(matchDetail);
      setContestations(detailedContestations);
      setReviewReasons({});
      setWinnerChoices(
        Object.fromEntries(
          detailedContestations.map((contestation) => [
            contestation.id,
            contestation.current_winner?.id || matchDetail.home_team.id,
          ])
        )
      );
      setWalkoverChoices(
        Object.fromEntries(
          detailedContestations.map((contestation) => [contestation.id, matchDetail.home_team.id])
        )
      );
      setDrawerOpen(true);
    } catch {
      showToast('Erro ao carregar detalhes da partida contestada', 'error');
    } finally {
      setLoadingDetails(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (!requestedMatchId || matches.length === 0 || drawerOpen) return;
    const matchIdNumber = Number(requestedMatchId);
    if (Number.isNaN(matchIdNumber)) return;
    const existsInPage = matches.some((match) => match.id === matchIdNumber);
    if (existsInPage) {
      loadMatchDetails(matchIdNumber);
    }
  }, [requestedMatchId, matches, drawerOpen, loadMatchDetails]);

  const openDrawer = async (match: Match) => {
    await loadMatchDetails(match.id);
  };

  const refreshSelectedMatch = useCallback(async () => {
    if (!selectedMatch) return;
    await loadMatchDetails(selectedMatch.id);
    await fetchMatches();
  }, [selectedMatch, loadMatchDetails, fetchMatches]);

  const handleMarkUnderReview = async (contestation: Contestation) => {
    setActionLoadingId(contestation.id);
    try {
      await contestationsAPI.review(contestation.id, { reason: reviewReasons[contestation.id]?.trim() || '' });
      showToast('Contestação marcada como em análise.', 'success');
      await refreshSelectedMatch();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao marcar contestação como em análise', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveCurrentResult = async (contestation: Contestation) => {
    const reason = reviewReasons[contestation.id]?.trim();
    if (!reason) {
      showToast('Informe o motivo da aprovação do resultado atual.', 'warning');
      return;
    }

    setActionLoadingId(contestation.id);
    try {
      await contestationsAPI.approveCurrentResult(contestation.id, { reason });
      showToast('Resultado atual aprovado com sucesso.', 'success');
      await refreshSelectedMatch();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao aprovar resultado atual', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChangeResult = async (contestation: Contestation) => {
    const reason = reviewReasons[contestation.id]?.trim();
    if (!reason) {
      showToast('Informe o motivo da alteração do resultado.', 'warning');
      return;
    }

    const winnerTeamId = winnerChoices[contestation.id];
    if (!winnerTeamId) {
      showToast('Selecione o novo vencedor da partida.', 'warning');
      return;
    }

    setActionLoadingId(contestation.id);
    try {
      await contestationsAPI.changeResult(contestation.id, { winner_team_id: winnerTeamId, reason });
      showToast('Resultado alterado com sucesso.', 'success');
      await refreshSelectedMatch();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao alterar resultado da partida', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConvertToWalkover = async (contestation: Contestation) => {
    const reason = reviewReasons[contestation.id]?.trim();
    if (!reason) {
      showToast('Informe o motivo da conversão para W.O.', 'warning');
      return;
    }

    const walkoverTeamId = walkoverChoices[contestation.id];
    if (!walkoverTeamId) {
      showToast('Selecione o time que deve receber o W.O.', 'warning');
      return;
    }

    setActionLoadingId(contestation.id);
    try {
      await contestationsAPI.convertToWalkover(contestation.id, { walkover_team_id: walkoverTeamId, reason });
      showToast('W.O. aplicado com sucesso.', 'success');
      await refreshSelectedMatch();
    } catch (error: any) {
      showToast(error.response?.data?.error || 'Erro ao converter a partida para W.O.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns = useMemo(() => [
    {
      header: 'Partida',
      accessor: (row: Match) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-text font-medium text-sm">{row.home_team?.name}</span>
            <span className="text-muted text-xs">vs</span>
            <span className="text-text font-medium text-sm">{row.away_team?.name}</span>
          </div>
          {row.championship && <p className="text-xs text-muted">{row.championship.name}</p>}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Match) => (
        <Badge variant={MATCH_STATUS_VARIANTS[row.status] || 'default'}>
          {row.status === 'CONTESTED' && <span className="mr-1">⚠</span>}
          {MATCH_STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      header: 'Placar',
      accessor: (row: Match) =>
        row.status === 'FINISHED' || row.status === 'CONTESTED' ? (
          <span className="font-mono font-bold text-text">{row.home_score} — {row.away_score}</span>
        ) : (
          <span className="text-muted text-sm">—</span>
        ),
    },
    {
      header: 'Data',
      accessor: (row: Match) => (row.scheduled_date ? formatDateShort(row.scheduled_date) : '—'),
    },
    {
      header: 'Ações',
      isAction: true,
      accessor: (row: Match) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDrawer(row)}
            className="p-1.5 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
            title="Ver detalhes"
          >
            <Search className="w-4 h-4" />
          </button>
          <Link
            href={`/matches/${row.id}`}
            className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded-lg transition-colors"
            title="Ver partida"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ], []);

  if (!canReviewContestations) {
    return (
      <EmptyState
        icon={<Gavel className="mx-auto h-14 w-14 text-gold/40" />}
        title="Acesso restrito"
        description="Apenas administradores e supervisores podem visualizar e decidir contestações de partidas."
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Partidas Contestadas e Reportadas"
        count={totalCount}
        countLabel="partidas encontradas"
      />

      {contestedCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-error/10 border border-error/30 rounded-2xl p-4">
          <AlertTriangle className="w-5 h-5 text-error flex-shrink-0" />
          <div className="flex-1">
            <p className="text-error font-semibold text-sm">
              {contestedCount} partida{contestedCount > 1 ? 's' : ''} contestada{contestedCount > 1 ? 's' : ''} nesta página requerem atenção
            </p>
          </div>
          <Button variant="ghost" onClick={() => setStatusFilter('CONTESTED')} className="text-error border-error/30 hover:bg-error/10">
            Filtrar contestadas
          </Button>
        </div>
      )}

      <AdminFilters>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
          >
            <option value="">Todos os status</option>
            <option value="PENDING">Pendente</option>
            <option value="SCHEDULED">Agendada</option>
            <option value="IN_PROGRESS">Ao Vivo</option>
            <option value="FINISHED">Finalizada</option>
            <option value="CONTESTED">Contestada</option>
            <option value="CANCELLED">Cancelada</option>
          </select>
          {statusFilter && <Button variant="ghost" onClick={() => setStatusFilter('')}>Limpar filtro</Button>}
        </div>
      </AdminFilters>

      <DataTable
        columns={columns}
        data={matches}
        isLoading={isLoading}
        onRowClick={openDrawer}
        emptyState={{
          icon: '⚽',
          title: 'Nenhuma partida encontrada',
          description: 'Ajuste os filtros.',
        }}
      />

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <span className="text-muted text-sm">Página {page} de {totalPages} ({totalCount} total)</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
          </div>
        </div>
      )}

      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedMatch ? `${selectedMatch.home_team?.name} vs ${selectedMatch.away_team?.name}` : ''}
        subtitle={selectedMatch?.championship?.name || 'Contestação administrativa'}
        width="lg"
      >
        {loadingDetails ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-2xl bg-surface2 animate-pulse" />)}
          </div>
        ) : selectedMatch ? (
          <div className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <Badge variant={MATCH_STATUS_VARIANTS[selectedMatch.status] || 'default'}>{MATCH_STATUS_LABELS[selectedMatch.status]}</Badge>
              <Badge variant="info">{selectedMatch.match_type}</Badge>
              {selectedMatch.round_number && <Badge variant="default">Rodada {selectedMatch.round_number}</Badge>}
            </div>

            <div className="bg-surface2 rounded-2xl p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="text-center flex-1">
                  <p className="text-muted text-xs mb-2">Casa</p>
                  <p className="text-text font-bold">{selectedMatch.home_team?.name}</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl sm:text-5xl font-black text-gold">{selectedMatch.home_score} — {selectedMatch.away_score}</p>
                  {selectedMatch.is_draw && <Badge variant="default" className="mt-2">Empate</Badge>}
                  {selectedMatch.winner && <p className="text-success text-xs mt-2">Vencedor atual: {selectedMatch.winner.name}</p>}
                </div>
                <div className="text-center flex-1">
                  <p className="text-muted text-xs mb-2">Visitante</p>
                  <p className="text-text font-bold">{selectedMatch.away_team?.name}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Agendada para', value: selectedMatch.scheduled_date ? formatDateTimeShort(selectedMatch.scheduled_date) : '—' },
                { label: 'Início', value: selectedMatch.started_at ? formatDateTimeShort(selectedMatch.started_at) : '—' },
                { label: 'Fim', value: selectedMatch.finished_at ? formatDateTimeShort(selectedMatch.finished_at) : '—' },
                { label: 'Duração', value: selectedMatch.duration_minutes ? `${selectedMatch.duration_minutes} min` : '—' },
                { label: 'Irregularidade detectada', value: selectedMatch.irregularity_flag ? 'Sim' : 'Não' },
                { label: 'Resultado confirmado pelo adversário', value: selectedMatch.match_result_confirmed ? 'Sim' : 'Não' },
                { label: 'Confirmado por', value: selectedMatch.confirmed_by_team?.name || '—' },
                { label: 'Override administrativo', value: selectedMatch.admin_override ? 'Sim' : 'Não' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-medium text-text text-sm">{value}</p>
                </div>
              ))}
            </div>

            {selectedMatch.decision_reason && (
              <div className="rounded-xl border border-info/20 bg-info/5 p-4">
                <p className="text-xs text-muted mb-1">Justificativa registrada</p>
                <p className="text-sm text-text whitespace-pre-line">{selectedMatch.decision_reason}</p>
              </div>
            )}

            {!!selectedMatch.goals?.length && (
              <div className="bg-surface2 rounded-2xl p-5">
                <h3 className="font-semibold text-text mb-3">Jogadores / Eventos da Partida</h3>
                <div className="space-y-2 text-sm text-muted">
                  {selectedMatch.goals.map((goal) => (
                    <p key={goal.id}>
                      {goal.minute}' - <strong className="text-text">{goal.scorer?.player_name || 'Jogador'}</strong> ({goal.team?.name})
                      {goal.assist?.assistant && (
                        <span> • Assistência: <strong className="text-text">{goal.assist.assistant.player_name}</strong></span>
                      )}
                    </p>
                  ))}
                  {!!selectedMatch.cards?.length && (
                    <div className="pt-2 border-t border-border/60">
                      {selectedMatch.cards.map((card) => (
                        <p key={card.id}>
                          {card.minute}' - {card.card_type === 'RED' ? 'Cartão vermelho' : 'Cartão amarelo'} para <strong className="text-text">{card.player?.player_name || 'Jogador'}</strong>
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedMatch.report && (
              <div className="bg-surface2 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="font-semibold text-text">Súmula / Report da Partida</h3>
                  <Badge variant="info">{selectedMatch.report.status_display || selectedMatch.report.status}</Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="rounded-xl bg-panel2 p-3">
                    <p className="text-xs text-muted mb-1">Reportado por</p>
                    <p className="font-medium text-text text-sm">{selectedMatch.report.reported_by?.full_name || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-panel2 p-3">
                    <p className="text-xs text-muted mb-1">Criado em</p>
                    <p className="font-medium text-text text-sm">{formatDateTimeShort(selectedMatch.report.created_at)}</p>
                  </div>
                  <div className="rounded-xl bg-panel2 p-3">
                    <p className="text-xs text-muted mb-1">Aprovado por</p>
                    <p className="font-medium text-text text-sm">{selectedMatch.report.approved_by?.full_name || '—'}</p>
                  </div>
                  <div className="rounded-xl bg-panel2 p-3">
                    <p className="text-xs text-muted mb-1">Aprovado em</p>
                    <p className="font-medium text-text text-sm">{selectedMatch.report.approved_at ? formatDateTimeShort(selectedMatch.report.approved_at) : '—'}</p>
                  </div>
                </div>

                <div className="rounded-xl bg-panel2 p-4">
                  <p className="text-xs text-muted mb-1">Observações da súmula</p>
                  <p className="text-sm text-text whitespace-pre-line">{selectedMatch.report.notes || 'Sem observações.'}</p>
                </div>

                {selectedMatch.report.rejection_reason && (
                  <div className="rounded-xl border border-error/20 bg-error/5 p-4">
                    <p className="text-xs text-muted mb-1">Motivo da rejeição da súmula</p>
                    <p className="text-sm text-text whitespace-pre-line">{selectedMatch.report.rejection_reason}</p>
                  </div>
                )}

                {selectedMatch.report.screenshot && (
                  <a
                    href={selectedMatch.report.screenshot}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex text-sm text-brand hover:underline"
                  >
                    Abrir print/evidência da súmula
                  </a>
                )}
              </div>
            )}

            <div className="space-y-4">
              {contestations.length === 0 ? (
                <p className="text-muted text-sm">Nenhuma contestação encontrada para esta partida.</p>
              ) : (
                contestations.map((contestation) => {
                  const isResolved = contestation.status === 'ACCEPTED' || contestation.status === 'REJECTED';
                  const selectedWinner = winnerChoices[contestation.id] || selectedMatch.home_team.id;

                  return (
                    <div key={contestation.id} className="border border-border rounded-2xl p-5 bg-surface2/60 space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm text-muted2">Contestado por</p>
                          <p className="font-semibold text-text">{contestation.contested_by?.full_name} • {contestation.team?.name}</p>
                          <p className="text-xs text-muted mt-1">{formatDateTimeShort(contestation.created_at)}</p>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge variant={CONTESTATION_STATUS_VARIANTS[contestation.status] || 'default'}>
                            {CONTESTATION_STATUS_LABELS[contestation.status] || contestation.status}
                          </Badge>
                          {contestation.decision_type_display && (
                            <Badge variant="info">{contestation.decision_type_display}</Badge>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-text">{contestation.reason_display || contestation.reason}</p>
                        <p className="text-sm text-muted mt-2 whitespace-pre-line">{contestation.description}</p>
                        {contestation.evidence && (
                          <a href={contestation.evidence} target="_blank" rel="noopener noreferrer" className="inline-flex mt-3 text-sm text-brand hover:underline">
                            Ver evidência anexada
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="rounded-xl bg-panel2 p-3">
                          <p className="text-xs text-muted mb-1">Resultado anterior</p>
                          <p className="text-text font-semibold">
                            {contestation.previous_home_score ?? selectedMatch.home_score} x {contestation.previous_away_score ?? selectedMatch.away_score}
                          </p>
                          <p className="text-xs text-muted mt-1">Vencedor: {contestation.previous_winner_team?.name || contestation.current_winner?.name || 'Empate'}</p>
                        </div>
                        <div className="rounded-xl bg-panel2 p-3">
                          <p className="text-xs text-muted mb-1">Resultado decidido</p>
                          <p className="text-text font-semibold">
                            {contestation.decided_home_score ?? selectedMatch.home_score} x {contestation.decided_away_score ?? selectedMatch.away_score}
                          </p>
                          <p className="text-xs text-muted mt-1">Vencedor: {contestation.decided_winner_team?.name || contestation.current_winner?.name || 'Empate'}</p>
                        </div>
                      </div>

                      {isResolved ? (
                        <div className="rounded-xl border border-success/20 bg-success/5 p-4">
                          <p className="text-sm font-semibold text-text">Decisão final registrada</p>
                          <p className="text-sm text-muted mt-2 whitespace-pre-line">{contestation.decision_reason || contestation.response}</p>
                          {contestation.reviewed_by && (
                            <p className="text-xs text-muted mt-2">
                              Decidido por {contestation.reviewed_by.full_name} em {contestation.reviewed_at ? formatDateTimeShort(contestation.reviewed_at) : '—'}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-3 rounded-2xl border border-warning/20 bg-warning/5 p-4">
                          <div>
                            <label className="block text-sm font-semibold text-text mb-2">Motivo da decisão administrativa *</label>
                            <textarea
                              value={reviewReasons[contestation.id] || ''}
                              onChange={(e) => setReviewReasons((prev) => ({ ...prev, [contestation.id]: e.target.value }))}
                              placeholder="Explique por que o resultado está sendo mantido ou alterado..."
                              rows={4}
                              className="w-full rounded-xl bg-surface2 border border-border px-4 py-3 text-text placeholder-muted outline-none focus:border-gold/50"
                            />
                          </div>

                          <div className="rounded-xl bg-surface2 p-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-text">Aprovar o vencedor atual</p>
                                <p className="text-xs text-muted">Mantém o resultado atual da partida e encerra a contestação.</p>
                              </div>
                              <Button
                                variant="primary"
                                className="bg-success hover:bg-success/80"
                                onClick={() => handleApproveCurrentResult(contestation)}
                                disabled={actionLoadingId === contestation.id}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Aprovar Resultado Atual
                              </Button>
                            </div>
                          </div>

                          <div className="rounded-xl bg-surface2 p-4 space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-text">Alterar o resultado da partida</p>
                              <p className="text-xs text-muted">Selecione o novo vencedor. O sistema aplicará um placar administrativo padronizado.</p>
                            </div>
                            <select
                              value={selectedWinner}
                              onChange={(e) => setWinnerChoices((prev) => ({ ...prev, [contestation.id]: Number(e.target.value) }))}
                              className="w-full px-4 py-2.5 bg-panel2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50"
                            >
                              <option value={selectedMatch.home_team.id}>{selectedMatch.home_team.name}</option>
                              <option value={selectedMatch.away_team.id}>{selectedMatch.away_team.name}</option>
                            </select>
                            <Button
                              variant="primary"
                              className="bg-error hover:bg-error/80"
                              onClick={() => handleChangeResult(contestation)}
                              disabled={actionLoadingId === contestation.id}
                            >
                              Alterar Resultado
                            </Button>
                          </div>

                          <div className="rounded-xl bg-surface2 p-4 space-y-3">
                            <div>
                              <p className="text-sm font-semibold text-text">Converter para W.O.</p>
                              <p className="text-xs text-muted">Selecione o time penalizado. O sistema aplicará W.O. apenas por decisão administrativa explícita.</p>
                            </div>
                            <select
                              value={walkoverChoices[contestation.id] || selectedMatch.home_team.id}
                              onChange={(e) => setWalkoverChoices((prev) => ({ ...prev, [contestation.id]: Number(e.target.value) }))}
                              className="w-full px-4 py-2.5 bg-panel2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50"
                            >
                              <option value={selectedMatch.home_team.id}>{selectedMatch.home_team.name} recebe W.O.</option>
                              <option value={selectedMatch.away_team.id}>{selectedMatch.away_team.name} recebe W.O.</option>
                            </select>
                            <Button
                              variant="primary"
                              className="bg-warning hover:bg-warning/90"
                              onClick={() => handleConvertToWalkover(contestation)}
                              disabled={actionLoadingId === contestation.id}
                            >
                              Converter para W.O.
                            </Button>
                          </div>

                          {contestation.status === 'PENDING' && (
                            <Button
                              variant="ghost"
                              onClick={() => handleMarkUnderReview(contestation)}
                              disabled={actionLoadingId === contestation.id}
                            >
                              Marcar como Em Análise
                            </Button>
                          )}
                        </div>
                      )}

                      {!!contestation.audit_logs?.length && (
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-text">Histórico / Auditoria</p>
                          <div className="space-y-2">
                            {contestation.audit_logs.map((log) => (
                              <div key={log.id} className="rounded-xl bg-panel2 p-3 text-sm">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <strong className="text-text">{log.action_display || DECISION_ACTION_LABELS[log.action] || log.action}</strong>
                                  <span className="text-xs text-muted">{formatDateTimeShort(log.created_at)}</span>
                                </div>
                                <p className="text-muted mt-2 whitespace-pre-line">{log.reason}</p>
                                {log.performed_by && <p className="text-xs text-muted mt-2">Responsável: {log.performed_by.full_name}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <Link href={`/matches/${selectedMatch.id}`}>
              <Button variant="primary" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Partida Completa
              </Button>
            </Link>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
}
