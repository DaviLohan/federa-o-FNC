'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, User } from 'lucide-react';
import { usersAPI } from '@/lib/api';
import { User as UserType } from '@/types';
import { DataTable } from '@/components/shared/ui/DataTable';
import { Badge } from '@/components/shared/ui/Badge';
import { Button } from '@/components/shared/ui/Button';
import { Drawer } from '@/components/shared/ui/Drawer';
import { formatDateShort } from '@/lib/utils/date';
import { useToast } from '@/components/shared/ui/Toast';

const PLATFORM_LABELS: Record<string, string> = {
  PS: 'PlayStation',
  XBOX: 'Xbox',
  PC: 'PC',
};

const USER_TYPE_VARIANTS: Record<string, 'gold' | 'info' | 'warning' | 'error' | 'default'> = {
  ADMIN: 'error',
  SUPERVISOR: 'gold',
  TEAM_OWNER: 'info',
  PLAYER: 'default',
};

const USER_TYPE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  SUPERVISOR: 'Supervisor',
  TEAM_OWNER: 'Dono de Time',
  PLAYER: 'Jogador',
};

export default function AdminJogadoresPage() {
  const { showToast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 20;

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: any = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (userTypeFilter) params.user_type = userTypeFilter;
      const res = await usersAPI.getAll(params);
      setUsers(res.results);
      setTotalCount(res.count);
    } catch {
      showToast('Erro ao carregar usuários', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, userTypeFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [search, userTypeFilter]);

  const openDrawer = (user: UserType) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const columns = [
    {
      header: 'Usuário',
      accessor: (row: UserType) => {
        const avatar = row.player_profile?.avatar || row.team_owner_profile?.avatar;
        const initials = `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}`.toUpperCase();
        return (
          <div className="flex items-center gap-3">
            {avatar ? (
              <img src={avatar} alt={row.full_name} className="w-9 h-9 rounded-full object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center border border-gold/20">
                <span className="text-gold font-bold text-xs">{initials || <User className="w-4 h-4" />}</span>
              </div>
            )}
            <div>
              <p className="font-medium text-text">{row.full_name || `${row.first_name} ${row.last_name}`}</p>
              <p className="text-xs text-muted">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      header: 'Tipo',
      accessor: (row: UserType) => (
        <Badge variant={USER_TYPE_VARIANTS[row.user_type] || 'default'}>
          {USER_TYPE_LABELS[row.user_type] || row.user_type}
        </Badge>
      ),
    },
    {
      header: 'Plataforma',
      accessor: (row: UserType) => (
        <span className="text-muted text-sm">{PLATFORM_LABELS[row.platform] || row.platform}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row: UserType) => (
        <Badge variant={row.is_active ? 'success' : 'error'}>
          {row.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
    },
    {
      header: 'Cadastro',
      accessor: (row: UserType) =>
        row.date_joined ? formatDateShort(row.date_joined) : '—',
    },
    {
      header: 'Nickname',
      accessor: (row: UserType) => (
        <span className="text-muted text-sm">
          {row.player_profile?.gamer_tag || '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Usuários</h1>
          <p className="text-muted mt-1">{totalCount} usuários cadastrados</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-surface2 border border-border rounded-xl text-text placeholder:text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface2 border border-border rounded-xl text-text focus:outline-none focus:border-gold/50 transition-colors"
        >
          <option value="">Todos os tipos</option>
          <option value="PLAYER">Jogador</option>
          <option value="TEAM_OWNER">Dono de Time</option>
          <option value="SUPERVISOR">Supervisor</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        onRowClick={openDrawer}
        emptyState={{
          icon: '👥',
          title: 'Nenhum usuário encontrado',
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
        title={selectedUser ? (selectedUser.full_name || `${selectedUser.first_name} ${selectedUser.last_name}`) : ''}
        subtitle={selectedUser?.email}
        width="md"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Avatar + type */}
            <div className="flex items-center gap-4">
              {(selectedUser.player_profile?.avatar || selectedUser.team_owner_profile?.avatar) ? (
                <img
                  src={selectedUser.player_profile?.avatar || selectedUser.team_owner_profile?.avatar}
                  alt={selectedUser.full_name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gold/10 flex items-center justify-center border border-gold/20">
                  <User className="w-8 h-8 text-gold" />
                </div>
              )}
              <div>
                <p className="text-text font-bold text-lg">{selectedUser.full_name}</p>
                <p className="text-muted text-sm">{selectedUser.email}</p>
                <div className="flex gap-2 mt-1">
                  <Badge variant={USER_TYPE_VARIANTS[selectedUser.user_type] || 'default'}>
                    {USER_TYPE_LABELS[selectedUser.user_type]}
                  </Badge>
                  <Badge variant={selectedUser.is_active ? 'success' : 'error'}>
                    {selectedUser.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Plataforma', value: PLATFORM_LABELS[selectedUser.platform] || selectedUser.platform },
                { label: 'Cadastro', value: formatDateShort(selectedUser.date_joined) },
                { label: 'Último login', value: selectedUser.last_login ? formatDateShort(selectedUser.last_login) : 'Nunca' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-surface2 rounded-xl p-3">
                  <p className="text-xs text-muted mb-1">{label}</p>
                  <p className="font-semibold text-text text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Player Profile */}
            {selectedUser.player_profile && (
              <div>
                <p className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold inline-block" />
                  Perfil de Jogador
                </p>
                <div className="bg-surface2 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Nickname', value: selectedUser.player_profile.player_name },
                      { label: 'Gamer Tag', value: selectedUser.player_profile.gamer_tag },
                      { label: 'Posição', value: selectedUser.player_profile.primary_position_display || selectedUser.player_profile.primary_position },
                      { label: 'Camisa', value: `#${selectedUser.player_profile.shirt_number}` },
                      { label: 'Partidas', value: selectedUser.player_profile.total_games },
                      { label: 'Gols', value: selectedUser.player_profile.total_goals },
                      { label: 'Assistências', value: selectedUser.player_profile.total_assists },
                      { label: 'Taxa de vitória', value: `${(selectedUser.player_profile.win_rate * 100).toFixed(0)}%` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-xs text-muted">{label}</p>
                        <p className="text-text font-medium text-sm">{value ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Team Owner Profile */}
            {selectedUser.team_owner_profile && (
              <div>
                <p className="text-sm font-semibold text-text mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gold inline-block" />
                  Perfil de Dono de Time
                </p>
                <div className="bg-surface2 rounded-xl p-4">
                  <Badge variant={selectedUser.team_owner_profile.is_active ? 'success' : 'error'}>
                    {selectedUser.team_owner_profile.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {selectedUser.team_owner_profile.bio && (
                    <p className="text-muted text-sm mt-3 leading-relaxed">{selectedUser.team_owner_profile.bio}</p>
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
