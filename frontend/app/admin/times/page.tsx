'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, ExternalLink } from 'lucide-react';
import { teamsAPI } from '@/lib/api';
import { Team, TeamMembership } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { formatDateShort } from '@/lib/utils/date';
import { useToast } from '@/components/shared/ui/Toast';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminFilters } from '@/components/admin/AdminFilters';
import Link from 'next/link';

export default function AdminTimesPage() {
  const { showToast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMembership[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  const fetchTeams = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      const res = await teamsAPI.getAll(params);
      setTeams(res.results);
      setTotalCount(res.count);
    } catch {
      showToast('Erro ao carregar times', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const openDrawer = async (team: Team) => {
    setSelectedTeam(team);
    setDrawerOpen(true);
    setMembers([]);
    setLoadingMembers(true);
    try {
      const res = await teamsAPI.getMembers(team.id);
      setMembers(res);
    } catch {
      showToast('Erro ao carregar membros', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const ROLE_VARIANTS: Record<string, 'gold' | 'info' | 'default'> = {
    OWNER: 'gold',
    CAPTAIN: 'info',
    PLAYER: 'default',
  };

  const ROLE_LABELS: Record<string, string> = {
    OWNER: 'Dono',
    CAPTAIN: 'Capitão',
    PLAYER: 'Jogador',
  };

  const columns = [
    {
      header: 'Time',
      accessor: (row: Team) => (
        <div className="flex items-center gap-3">
          {row.logo ? (
            <img src={row.logo} alt={row.name} className="w-9 h-9 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
              <span className="text-gold font-bold text-xs">{row.abbreviation?.slice(0, 2)}</span>
            </div>
          )}
          <div>
            <p className="font-semibold text-text">{row.name}</p>
            <p className="text-xs text-muted">{row.abbreviation}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Dono',
      accessor: (row: Team) => (
        <div>
          <p className="text-text text-sm">{row.owner?.full_name || row.owner?.email}</p>
          <p className="text-xs text-muted">{row.owner?.email}</p>
        </div>
      ),
    },
    {
      header: 'Jogadores',
      accessor: (row: Team) => (
        <div className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-muted" />
          <span className="text-muted">{row.player_count}</span>
        </div>
      ),
      sortable: false,
    },
    {
      header: 'Status',
      accessor: (row: Team) => (
        <Badge variant={row.is_active ? 'success' : 'error'}>
          {row.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Criado em',
      accessor: (row: Team) =>
        row.created_at ? formatDateShort(row.created_at) : '—',
    },
    {
      header: 'Ações',
      isAction: true,
      accessor: (row: Team) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => openDrawer(row)}
            className="p-1.5 text-muted hover:text-gold hover:bg-gold/10 rounded-lg transition-colors"
            title="Ver membros"
          >
            <Users className="w-4 h-4" />
          </button>
          <Link
            href={`/teams/${row.id}`}
            className="p-1.5 text-muted hover:text-info hover:bg-info/10 rounded-lg transition-colors"
            title="Ver página do time"
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
      <AdminPageHeader
        title="Times"
        count={totalCount}
        countLabel="times cadastrados"
      />

      {/* Search */}
      <AdminFilters>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
      </AdminFilters>

      {/* Table */}
      <DataTable
        columns={columns}
        data={teams}
        isLoading={isLoading}
        onRowClick={openDrawer}
        emptyState={{
          icon: '🛡️',
          title: 'Nenhum time encontrado',
          description: 'Ajuste os filtros de busca.',
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
        title={selectedTeam?.name || ''}
        subtitle={selectedTeam ? `${selectedTeam.abbreviation} — ${selectedTeam.player_count} jogadores` : ''}
        width="md"
      >
        {selectedTeam && (
          <div className="space-y-6">
            {/* Team header */}
            <div className="flex items-center gap-4">
              {selectedTeam.logo ? (
                <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-16 h-16 rounded-2xl object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                  <span className="text-gold font-bold text-xl">{selectedTeam.abbreviation?.slice(0, 2)}</span>
                </div>
              )}
              <div>
                <p className="text-text font-bold text-lg">{selectedTeam.name}</p>
                <p className="text-muted text-sm">Dono: {selectedTeam.owner?.full_name || selectedTeam.owner?.email}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={selectedTeam.is_active ? 'success' : 'error'}>
                    {selectedTeam.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {selectedTeam.has_active_championship && <Badge variant="gold">Em campeonato</Badge>}
                </div>
              </div>
            </div>

            {/* Description */}
            {selectedTeam.description && (
              <div className="bg-surface2 rounded-xl p-4">
                <p className="text-xs text-muted mb-1">Descrição</p>
                <p className="text-text text-sm leading-relaxed">{selectedTeam.description}</p>
              </div>
            )}

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Fundação', value: selectedTeam.foundation_date ? formatDateShort(selectedTeam.foundation_date) : '—' },
                { label: 'Criado em', value: selectedTeam.created_at ? formatDateShort(selectedTeam.created_at) : '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-semibold text-text text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Members */}
            <div>
              <p className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-gold" />
                Membros ({members.length})
              </p>
              {loadingMembers ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 bg-surface2 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : members.length === 0 ? (
                <p className="text-muted text-sm text-center py-4">Nenhum membro encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center justify-between bg-surface2 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        {m.player?.avatar ? (
                          <img src={m.player.avatar} alt={m.player.player_name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center">
                            <span className="text-gold text-xs font-bold">
                              {m.player?.player_name?.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="text-text text-sm font-medium">{m.player?.player_name}</p>
                          <p className="text-xs text-muted">{m.player?.gamer_tag}</p>
                        </div>
                      </div>
                      <Badge variant={ROLE_VARIANTS[m.role] || 'default'}>
                        {ROLE_LABELS[m.role] || m.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Link */}
            <Link href={`/teams/${selectedTeam.id}`}>
              <Button variant="primary" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Ver página do time
              </Button>
            </Link>
          </div>
        )}
      </Drawer>
    </div>
  );
}
