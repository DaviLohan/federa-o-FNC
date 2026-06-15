'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, ExternalLink, Trash2, Trophy, Search } from 'lucide-react';
import { championshipsAPI } from '@/lib/api';
import { Championship } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { formatDateShort } from '@/lib/utils/date';
import { Modal } from '@/components/shared/ui/Modal';
import { useToast } from '@/components/shared/ui/Toast';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  SCHEDULED: 'Programado',
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em andamento',
  FINISHED: 'Finalizado',
  CANCELLED: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'info' | 'gold' | 'success' | 'error' | 'warning'> = {
  PENDING: 'info',
  SCHEDULED: 'info',
  OPEN: 'gold',
  IN_PROGRESS: 'warning',
  FINISHED: 'success',
  CANCELLED: 'error',
};

const TYPE_LABELS: Record<string, string> = {
  KNOCKOUT: 'Eliminatório',
  LEAGUE: 'Liga',
  GROUPS_KNOCKOUT: 'Grupos + Mata-mata',
};

export default function AdminCampeonatosPage() {
  const { showToast } = useToast();
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedChampionship, setSelectedChampionship] = useState<Championship | null>(null);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchChampionships = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await championshipsAPI.getAll(params);
      setChampionships(res.results);
      setTotalCount(res.count);
    } catch {
      showToast('Erro ao carregar campeonatos', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchChampionships();
  }, [fetchChampionships]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      // No delete endpoint available — placeholder
      showToast('Funcionalidade não disponível no momento', 'warning');
      setDeleteModalOpen(false);
    } catch {
      showToast('Erro ao excluir campeonato', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const openDrawer = (c: Championship) => {
    setSelectedChampionship(c);
    setDrawerOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns = [
    {
      header: 'Nome',
      accessor: (row: Championship) => (
        <div className="flex items-center gap-3">
          {row.logo ? (
            <img src={row.logo} alt={row.name} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-gold" />
            </div>
          )}
          <span className="font-medium text-text">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessor: (row: Championship) => (
        <Badge variant="info">{TYPE_LABELS[row.championship_type] || row.championship_type}</Badge>
      ),
    },
    {
      header: 'Status',
      accessor: (row: Championship) => (
        <Badge variant={STATUS_VARIANTS[row.status] || 'default'}>
          {STATUS_LABELS[row.status] || row.status}
        </Badge>
      ),
    },
    {
      header: 'Times',
      accessor: (row: Championship) => (
        <span className="text-muted">{row.enrolled_teams_count} / {row.max_teams || '∞'}</span>
      ),
    },
    {
      header: 'Início',
      accessor: (row: Championship) =>
        row.start_date ? formatDateShort(row.start_date) : '—',
    },
    {
      header: 'Ações',
      accessor: (row: Championship) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDrawer(row)}
            className="p-1.5 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
            title="Ver detalhes"
          >
            <Edit className="w-4 h-4" />
          </button>
          <Link
            href={`/championships/${row.id}`}
            className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded-lg transition-colors"
            title="Ver página"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => { setDeletingId(row.id); setDeleteModalOpen(true); }}
            className="p-1.5 text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text">Campeonatos</h1>
          <p className="text-muted mt-1">{totalCount} campeonatos cadastrados</p>
        </div>
        <Link href="/championships">
          <Button variant="primary">
            <Plus className="w-4 h-4 mr-2" />
            Novo Campeonato
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="OPEN">Aberto</option>
          <option value="IN_PROGRESS">Em andamento</option>
          <option value="FINISHED">Finalizado</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={championships}
        isLoading={isLoading}
        onRowClick={openDrawer}
        emptyState={{
          icon: '🏆',
          title: 'Nenhum campeonato encontrado',
          description: 'Crie o primeiro campeonato ou ajuste os filtros.',
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
        title={selectedChampionship ? selectedChampionship.name : 'Novo Campeonato'}
        subtitle={selectedChampionship ? `ID #${selectedChampionship.id}` : 'Preencha os dados abaixo'}
        width="lg"
      >
        {selectedChampionship ? (
          <div className="space-y-6">
            {/* Banner */}
            {selectedChampionship.banner && (
              <img
                src={selectedChampionship.banner}
                alt="Banner"
                className="w-full h-40 object-cover rounded-xl"
              />
            )}

            {/* Badges */}
            <div className="flex gap-2 flex-wrap">
              <Badge variant={STATUS_VARIANTS[selectedChampionship.status] || 'default'}>
                {STATUS_LABELS[selectedChampionship.status] || selectedChampionship.status}
              </Badge>
              <Badge variant="info">{TYPE_LABELS[selectedChampionship.championship_type]}</Badge>
              {selectedChampionship.is_enrollment_open && <Badge variant="gold">Inscrições abertas</Badge>}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Times inscritos', value: `${selectedChampionship.enrolled_teams_count} / ${selectedChampionship.max_teams || '∞'}` },
                { label: 'Mínimo de times', value: selectedChampionship.min_teams },
                { label: 'Taxa de inscrição', value: `R$ ${selectedChampionship.enrollment_fee}` },
                { label: 'Premiação', value: `R$ ${selectedChampionship.prize_pool}` },
                { label: 'Início inscrições', value: formatDateShort(selectedChampionship.enrollment_start) },
                { label: 'Fim inscrições', value: formatDateShort(selectedChampionship.enrollment_end) },
                { label: 'Data de início', value: formatDateShort(selectedChampionship.start_date) },
                { label: 'Agenda de Jogos', value: (() => {
                    const days = selectedChampionship.game_days;
                    const start = selectedChampionship.game_start_time;
                    const end = selectedChampionship.game_end_time;
                    if (!days || days.length === 0 || !start || !end) return '—';
                    const dayMap: Record<string, string> = {
                      MON: 'Seg', TUE: 'Ter', WED: 'Qua',
                      THU: 'Qui', FRI: 'Sex', SAT: 'Sab', SUN: 'Dom'
                    };
                    const dayStr = days.map((d: string) => dayMap[d] || d).join(', ');
                    return `${dayStr} ${start.slice(0, 5)}-${end.slice(0, 5)}`;
                  })() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-4">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {selectedChampionship.description && (
              <div>
                <p className="text-xs text-muted mb-2">Descrição</p>
                <p className="text-text text-sm leading-relaxed bg-surface2 rounded-xl p-4">
                  {selectedChampionship.description}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link href={`/championships/${selectedChampionship.id}`} className="flex-1">
                <Button variant="primary" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Ver Campeonato
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-muted text-center py-8">
            Formulário de criação disponível na página de campeonatos.
          </p>
        )}
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Excluir campeonato"
        description="Esta ação não pode ser desfeita."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancelar</Button>
            <Button variant="ghost" onClick={handleDelete} disabled={isDeleting} className="text-error hover:text-error border border-error/30 hover:bg-error/10">
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </>
        }
      >
        <p className="text-muted">Tem certeza que deseja excluir este campeonato?</p>
      </Modal>
    </div>
  );
}
