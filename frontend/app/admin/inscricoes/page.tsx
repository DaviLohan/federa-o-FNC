'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Trophy, ChevronDown } from 'lucide-react';
import { adminAPI, championshipsAPI } from '@/lib/api';
import { Enrollment, Championship } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { formatDateShort, formatDateTimeShort } from '@/lib/utils/date';
import { useToast } from '@/components/shared/ui/Toast';

const ENROLLMENT_STATUS_VARIANTS: Record<string, any> = {
  PENDING_PAYMENT: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  CANCELLED: 'default',
};

const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Aguard. Pagamento',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
};

const PAYMENT_STATUS_VARIANTS: Record<string, any> = {
  PENDING: 'warning',
  PAID: 'success',
  FAILED: 'error',
  EXPIRED: 'default',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Pago',
  FAILED: 'Falhou',
  EXPIRED: 'Expirado',
};

export default function AdminInscricoesPage() {
  const { showToast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [championshipFilter, setChampionshipFilter] = useState('');
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const pendingCount = enrollments.filter((e) => e.status === 'PENDING_PAYMENT').length;

  const fetchEnrollments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (statusFilter) params.status = statusFilter;
      if (paymentFilter) params.payment_status = paymentFilter;
      if (championshipFilter) params.championship = championshipFilter;
      const res = await adminAPI.getEnrollments(params);
      setEnrollments(res.results);
      setTotalCount(res.count);
    } catch {
      showToast('Erro ao carregar inscrições', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, paymentFilter, championshipFilter]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, paymentFilter, championshipFilter]);

  // Load championships for filter
  useEffect(() => {
    championshipsAPI.getAll({ page_size: 100 }).then((res) => {
      setChampionships(res.results);
    }).catch(() => {});
  }, []);

  const handleApprove = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(id);
    try {
      await adminAPI.approveEnrollment(id);
      showToast('Inscrição aprovada com sucesso!', 'success');
      fetchEnrollments();
    } catch {
      showToast('Erro ao aprovar inscrição', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: number, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setActionLoading(id);
    try {
      await adminAPI.rejectEnrollment(id);
      showToast('Inscrição rejeitada.', 'warning');
      fetchEnrollments();
    } catch {
      showToast('Erro ao rejeitar inscrição', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openDrawer = (enrollment: Enrollment) => {
    setSelectedEnrollment(enrollment);
    setDrawerOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns = [
    {
      header: 'Time',
      accessor: (row: Enrollment) => (
        <div className="flex items-center gap-3">
          {row.team?.logo ? (
            <img src={row.team.logo} alt={row.team.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
              <span className="text-gold font-bold text-xs">{row.team?.abbreviation?.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <p className="font-medium text-text text-sm">{row.team?.name}</p>
            <p className="text-xs text-muted">{row.team?.abbreviation}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Campeonato',
      accessor: (row: Enrollment) => (
        <div className="flex items-center gap-2">
          <Trophy className="w-3.5 h-3.5 text-gold flex-shrink-0" />
          <span className="text-text text-sm">{row.championship?.name}</span>
        </div>
      ),
    },
    {
      header: 'Inscrição',
      accessor: (row: Enrollment) => (
        <Badge variant={ENROLLMENT_STATUS_VARIANTS[row.status] || 'default'}>
          {ENROLLMENT_STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      header: 'Pagamento',
      accessor: (row: Enrollment) => (
        <Badge variant={PAYMENT_STATUS_VARIANTS[row.payment_status] || 'default'}>
          {PAYMENT_STATUS_LABELS[row.payment_status] || row.payment_status}
        </Badge>
      ),
    },
    {
      header: 'Data',
      accessor: (row: Enrollment) =>
        row.enrolled_at ? formatDateShort(row.enrolled_at) : '—',
    },
    {
      header: 'Ações',
      accessor: (row: Enrollment) => {
        const isLoading = actionLoading === row.id;
        const canApprove = row.status === 'PENDING_PAYMENT';
        const canReject = row.status === 'PENDING_PAYMENT' || row.status === 'APPROVED';

        return (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canApprove && (
              <button
                onClick={(e) => handleApprove(row.id, e)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-success bg-success/10 hover:bg-success/20 border border-success/20 rounded-lg transition-colors disabled:opacity-50"
                title="Aprovar"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {isLoading ? '...' : 'Aprovar'}
              </button>
            )}
            {canReject && (
              <button
                onClick={(e) => handleReject(row.id, e)}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-error bg-error/10 hover:bg-error/20 border border-error/20 rounded-lg transition-colors disabled:opacity-50"
                title="Rejeitar"
              >
                <XCircle className="w-3.5 h-3.5" />
                {isLoading ? '...' : 'Rejeitar'}
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Inscrições</h1>
          <p className="text-muted mt-1">{totalCount} inscrições encontradas</p>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-warning/10 border border-warning/30 rounded-2xl p-4">
          <ChevronDown className="w-5 h-5 text-warning flex-shrink-0 rotate-180" />
          <div className="flex-1">
            <p className="text-warning font-semibold text-sm">
              {pendingCount} inscrição{pendingCount > 1 ? 'ões' : ''} aguardando revisão nesta página
            </p>
          </div>
          <Button
            variant="ghost"
            onClick={() => setStatusFilter('PENDING_PAYMENT')}
            className="text-warning border-warning/30 hover:bg-warning/10"
          >
            Filtrar pendentes
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={championshipFilter}
          onChange={(e) => setChampionshipFilter(e.target.value)}
          className="flex-1 px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">Todos os campeonatos</option>
          {championships.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">Status inscrição</option>
          <option value="PENDING_PAYMENT">Aguard. Pagamento</option>
          <option value="APPROVED">Aprovada</option>
          <option value="REJECTED">Rejeitada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">Status pagamento</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="FAILED">Falhou</option>
          <option value="EXPIRED">Expirado</option>
        </select>
        {(statusFilter || paymentFilter || championshipFilter) && (
          <Button
            variant="ghost"
            onClick={() => { setStatusFilter(''); setPaymentFilter(''); setChampionshipFilter(''); }}
          >
            Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={enrollments}
        isLoading={isLoading}
        onRowClick={openDrawer}
        emptyState={{
          icon: '📋',
          title: 'Nenhuma inscrição encontrada',
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
        title={selectedEnrollment?.team?.name || ''}
        subtitle={selectedEnrollment?.championship?.name}
        width="md"
        actions={
          selectedEnrollment && (
            <>
              {selectedEnrollment.status === 'PENDING_PAYMENT' && (
                <button
                  onClick={() => handleApprove(selectedEnrollment.id)}
                  disabled={actionLoading === selectedEnrollment.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-success bg-success/10 hover:bg-success/20 border border-success/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprovar
                </button>
              )}
              {(selectedEnrollment.status === 'PENDING_PAYMENT' || selectedEnrollment.status === 'APPROVED') && (
                <button
                  onClick={() => handleReject(selectedEnrollment.id)}
                  disabled={actionLoading === selectedEnrollment.id}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-error bg-error/10 hover:bg-error/20 border border-error/30 rounded-xl transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Rejeitar
                </button>
              )}
            </>
          )
        }
      >
        {selectedEnrollment && (
          <div className="space-y-6">
            {/* Team info */}
            <div className="flex items-center gap-4">
              {selectedEnrollment.team?.logo ? (
                <img src={selectedEnrollment.team.logo} alt={selectedEnrollment.team.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                  <span className="text-gold font-bold text-xl">
                    {selectedEnrollment.team?.abbreviation?.slice(0, 2)}
                  </span>
                </div>
              )}
              <div>
                <p className="text-text font-bold text-lg">{selectedEnrollment.team?.name}</p>
                <p className="text-muted text-sm">Dono: {selectedEnrollment.team?.owner?.full_name || selectedEnrollment.team?.owner?.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={ENROLLMENT_STATUS_VARIANTS[selectedEnrollment.status] || 'default'}>
                    {ENROLLMENT_STATUS_LABELS[selectedEnrollment.status]}
                  </Badge>
                  <Badge variant={PAYMENT_STATUS_VARIANTS[selectedEnrollment.payment_status] || 'default'}>
                    {PAYMENT_STATUS_LABELS[selectedEnrollment.payment_status]}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Championship */}
            <div className="bg-surface2 rounded-xl p-4">
              <p className="text-xs text-muted mb-2">Campeonato</p>
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-gold" />
                <p className="text-text font-semibold">{selectedEnrollment.championship?.name}</p>
              </div>
              {selectedEnrollment.championship?.status && (
                <div className="mt-2">
                  <Badge variant="info">
                    {selectedEnrollment.championship.status}
                  </Badge>
                </div>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Inscrito em', value: selectedEnrollment.enrolled_at ? formatDateTimeShort(selectedEnrollment.enrolled_at) : '—' },
                { label: 'ID da inscrição', value: `#${selectedEnrollment.id}` },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-semibold text-text text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Payment details */}
            {selectedEnrollment.payment && (
              <div>
                <p className="text-sm font-semibold text-text mb-3">Pagamento</p>
                <div className="bg-surface2 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted text-sm">Valor</span>
                    <span className="text-text font-semibold">R$ {selectedEnrollment.payment.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted text-sm">Provedor</span>
                    <span className="text-text text-sm">{selectedEnrollment.payment.provider}</span>
                  </div>
                  {selectedEnrollment.payment.paid_at && (
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Pago em</span>
                      <span className="text-success text-sm">{formatDateTimeShort(selectedEnrollment.payment.paid_at)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}
