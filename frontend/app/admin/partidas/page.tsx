'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { matchesAPI, contestationsAPI } from '@/lib/api';
import { Match, Contestation } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils/date';
import { useToast } from '@/components/shared/ui/Toast';
import Link from 'next/link';

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

export default function AdminPartidasPage() {
  const { showToast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [contestations, setContestations] = useState<Contestation[]>([]);
  const [loadingContestations, setLoadingContestations] = useState(false);

  const contestedCount = matches.filter((m) => m.status === 'CONTESTED').length;

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
  }, [page, statusFilter]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const openDrawer = async (match: Match) => {
    setSelectedMatch(match);
    setDrawerOpen(true);
    setContestations([]);
    if (match.status === 'CONTESTED') {
      setLoadingContestations(true);
      try {
        const res = await contestationsAPI.getAll({ match: match.id });
        setContestations(res.results);
      } catch {
        // silently fail
      } finally {
        setLoadingContestations(false);
      }
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns = [
    {
      header: 'Partida',
      accessor: (row: Match) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-text font-medium text-sm">{row.home_team?.name}</span>
            <span className="text-muted text-xs">vs</span>
            <span className="text-text font-medium text-sm">{row.away_team?.name}</span>
          </div>
          {row.championship && (
            <p className="text-xs text-muted">{row.championship.name}</p>
          )}
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
          <span className="font-mono font-bold text-text">
            {row.home_score} — {row.away_score}
          </span>
        ) : (
          <span className="text-muted text-sm">—</span>
        ),
    },
    {
      header: 'Tipo',
      accessor: (row: Match) => (
        <span className="text-muted text-sm capitalize">{row.match_type?.toLowerCase().replace('_', ' ')}</span>
      ),
    },
    {
      header: 'Data',
      accessor: (row: Match) =>
        row.scheduled_date ? formatDateShort(row.scheduled_date) : '—',
    },
    {
      header: 'Ações',
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
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Partidas</h1>
          <p className="text-muted mt-1">{totalCount} partidas encontradas</p>
        </div>
      </div>

      {/* Contested alert */}
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
        {statusFilter && (
          <Button variant="ghost" onClick={() => setStatusFilter('')}>
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Table */}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <span className="text-muted text-sm">
            Página {page} de {totalPages} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              Anterior
            </Button>
            <Button variant="ghost" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              Próxima
            </Button>
          </div>
        </div>
      )}

      {/* Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedMatch ? `${selectedMatch.home_team?.name} vs ${selectedMatch.away_team?.name}` : ''}
        subtitle={selectedMatch?.championship?.name}
        width="md"
      >
        {selectedMatch && (
          <div className="space-y-6">
            {/* Status */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={MATCH_STATUS_VARIANTS[selectedMatch.status] || 'default'}>
                {MATCH_STATUS_LABELS[selectedMatch.status]}
              </Badge>
              <Badge variant="info">{selectedMatch.match_type}</Badge>
              {selectedMatch.round_number && (
                <Badge variant="default">Rodada {selectedMatch.round_number}</Badge>
              )}
            </div>

            {/* Score card */}
            {(selectedMatch.status === 'FINISHED' || selectedMatch.status === 'CONTESTED') && (
              <div className="bg-surface2 rounded-2xl p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <p className="text-muted text-xs mb-2">Casa</p>
                    <p className="text-text font-bold">{selectedMatch.home_team?.name}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl sm:text-5xl font-black text-gold">
                      {selectedMatch.home_score} — {selectedMatch.away_score}
                    </p>
                    {selectedMatch.is_draw && (
                      <Badge variant="default" className="mt-2">Empate</Badge>
                    )}
                    {selectedMatch.winner && (
                      <p className="text-success text-xs mt-2">Vencedor: {selectedMatch.winner.name}</p>
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-muted text-xs mb-2">Visitante</p>
                    <p className="text-text font-bold">{selectedMatch.away_team?.name}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Info */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Agendada para', value: selectedMatch.scheduled_date ? formatDateTimeShort(selectedMatch.scheduled_date) : '—' },
                { label: 'Duração', value: selectedMatch.duration_minutes ? `${selectedMatch.duration_minutes} min` : '—' },
                { label: 'Início', value: selectedMatch.started_at ? formatDateTimeShort(selectedMatch.started_at) : '—' },
                { label: 'Fim', value: selectedMatch.finished_at ? formatDateTimeShort(selectedMatch.finished_at) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-medium text-text text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Contestations */}
            {selectedMatch.status === 'CONTESTED' && (
              <div>
                <p className="text-sm font-semibold text-error mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Contestações
                </p>
                {loadingContestations ? (
                  <div className="space-y-2">
                    {[1, 2].map((i) => <div key={i} className="h-16 bg-surface2 rounded-xl animate-pulse" />)}
                  </div>
                ) : contestations.length === 0 ? (
                  <p className="text-muted text-sm">Nenhuma contestação encontrada.</p>
                ) : (
                  <div className="space-y-3">
                    {contestations.map((c) => (
                      <div key={c.id} className="bg-error/5 border border-error/20 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-text text-sm font-medium">{c.team?.name}</span>
                          <Badge variant={CONTESTATION_STATUS_VARIANTS[c.status] || 'default'}>
                            {CONTESTATION_STATUS_LABELS[c.status]}
                          </Badge>
                        </div>
                        <p className="text-muted text-xs mb-1">{c.reason_display || c.reason}</p>
                        <p className="text-text text-sm">{c.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Link */}
            <Link href={`/matches/${selectedMatch.id}`}>
              <Button variant="primary" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver Partida Completa
              </Button>
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
