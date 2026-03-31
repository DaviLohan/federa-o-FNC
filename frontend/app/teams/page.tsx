'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyTeam } from '@/hooks/useMyTeam';
import { Button, Card, Input, ImageUpload, useToast, PageHeader, FilterBar, SkeletonGrid, EmptyState, Select } from '@/components/shared/ui';
import { TeamCard } from '@/components/teams/TeamCard';
import type { Team } from '@/types';
import { Users, Search } from 'lucide-react';

function getApiErrorMessage(error: any, fallback: string) {
  const data = error?.response?.data;

  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.error) return data.error;
  if (data.detail) return data.detail;

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }
    if (typeof value === 'string') {
      return value;
    }
  }

  return fallback;
}

export default function TeamsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, setUser } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch teams
  const { data: teamsData, isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll(),
  });

  // Verificar se usuário já tem time (como dono ou membro)
  const { data: myTeam } = useMyTeam();
  const hasTeam = !!myTeam;
  const isOwner = user?.user_type === 'TEAM_OWNER' || (!!user && myTeam?.owner?.id === user.id);

  // Create team mutation
  const createMutation = useMutation({
    mutationFn: ({ data, file }: { data: Partial<Team>; file?: File | null }) => {
      if (file) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        formData.append('logo', file, file.name || 'logo.jpg');
        return teamsAPI.createWithFile(formData);
      }

      return teamsAPI.create(data);
    },
    onSuccess: async (createdTeam) => {
      queryClient.setQueryData(['my-team'], createdTeam);
      queryClient.setQueryData(['team', createdTeam.id], createdTeam);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['teams'] }),
        queryClient.invalidateQueries({ queryKey: ['my-team'] }),
      ]);

      try {
        const refreshedUser = await usersAPI.getMe();
        setUser(refreshedUser);
      } catch {
        // Keep the existing session if profile refresh fails.
      }

      setShowCreateModal(false);
      showToast('Time criado com sucesso!', 'success');

      router.push(`/teams/${createdTeam.id}`);
    },
    onError: (error: any) => {
      showToast(getApiErrorMessage(error, 'Erro ao criar time'), 'error');
    },
  });

  // Update team mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data, file }: { id: number; data: Partial<Team>; file?: File | null }) => {
      if (file) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        });
        formData.append('logo', file, file.name || 'logo.jpg');
        return teamsAPI.updateWithFile(id, formData);
      }
      return teamsAPI.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['my-team'] });
      setEditingTeam(null);
      showToast('Time atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(getApiErrorMessage(error, 'Erro ao atualizar time'), 'error');
    },
  });

  // Delete team mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => teamsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['my-team'] });
      showToast('Time excluído com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(getApiErrorMessage(error, 'Erro ao excluir time'), 'error');
    },
  });

  const teams = teamsData?.results || [];
  
  // Filter teams based on search and status
  const filteredTeams = teams.filter((team) => {
    const matchesSearch = !searchQuery || 
      team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.abbreviation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      team.owner.full_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && team.is_active) ||
      (statusFilter === 'inactive' && !team.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateClick = () => {
    if (hasTeam) {
      showToast(
        isOwner
          ? 'Você já é dono de um time. Exclua o time atual para criar um novo.'
          : 'Você já faz parte de um time. Saia do time atual para criar um novo.',
        'error'
      );
      return;
    }
    if (isOwner) {
      showToast('Você já é dono de um time. Exclua o time atual para criar um novo.', 'error');
      return;
    }
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Times"
        subtitle="Gerencie seus times e jogadores"
        icon={<Users className="w-8 h-8" />}
        actions={
          <Button
            variant="primary"
            onClick={handleCreateClick}
            disabled={hasTeam || isOwner}
            title={hasTeam || isOwner ? 'Você já pertence a um time' : undefined}
          >
            + Criar Time
          </Button>
        }
      />

      {/* Info: usuário já tem time */}
      {(hasTeam || isOwner) && (
        <div className="rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-muted">
          Você já {isOwner ? 'é dono do time' : 'faz parte de um time'}{' '}
          {myTeam ? (
            <a href={`/teams/${myTeam.id}`} className="text-gold underline underline-offset-2">
              {myTeam.name}
            </a>
          ) : null}
          . Para criar um novo time, {isOwner ? 'exclua o time atual' : 'solicite saída do time atual'}.
        </div>
      )}

      {/* Filters */}
      <FilterBar onReset={() => {
        setSearchQuery('');
        setStatusFilter('all');
      }}>
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              label=""
              placeholder="Buscar times..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todos' },
              { value: 'active', label: 'Ativos' },
              { value: 'inactive', label: 'Inativos' },
            ]}
          />
        </div>
      </FilterBar>

      {/* Teams Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : filteredTeams.length === 0 ? (
        <EmptyState
          icon="👥"
          title={searchQuery || statusFilter !== 'all' ? 'Nenhum time encontrado' : 'Nenhum time cadastrado'}
          description={
            searchQuery || statusFilter !== 'all' 
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece criando seu primeiro time!'
          }
          action={
            !searchQuery && statusFilter === 'all' && !hasTeam && !isOwner ? (
              <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                + Criar Primeiro Time
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid-cards">
          {filteredTeams.map((team) => (
            <TeamCard 
              key={team.id} 
              team={team}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingTeam) && (
        <TeamModal
          team={editingTeam}
          onClose={() => {
            setShowCreateModal(false);
            setEditingTeam(null);
          }}
          onSubmit={(data, file) => {
            if (editingTeam) {
              updateMutation.mutate({ id: editingTeam.id, data, file });
            } else {
              createMutation.mutate({ data, file });
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
}

// Team Modal Component
interface TeamModalProps {
  team: Team | null;
  onClose: () => void;
  onSubmit: (data: Partial<Team>, file?: File | null) => void;
  isLoading: boolean;
}

function TeamModal({ team, onClose, onSubmit, isLoading }: TeamModalProps) {
  const [formData, setFormData] = useState({
    name: team?.name || '',
    abbreviation: team?.abbreviation || '',
    description: team?.description || '',
    foundation_date: team?.foundation_date || new Date().toISOString().split('T')[0],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData, logoFile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <Card className="max-w-2xl w-full form-card-premium">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">
              {team ? 'Editar Time' : 'Criar Novo Time'}
            </h2>
            <p className="text-muted mt-1">
              {team ? 'Atualize as informações do time' : 'Preencha os dados do novo time'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Logo Upload */}
          <ImageUpload
            label="Logo do Time"
            value={team?.logo}
            onChange={(file) => setLogoFile(file)}
            previewClassName="w-24 h-24"
            helpText="PNG, JPG ou WEBP até 5MB"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Time"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Thunder FC"
                required
              />
            </div>
            <Input
              label="Abreviação"
              name="abbreviation"
              value={formData.abbreviation}
              onChange={handleChange}
              placeholder="Ex: THU"
              maxLength={5}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-muted mb-2">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
              placeholder="Descreva seu time..."
            />
          </div>

          <Input
            label="Data de Fundação"
            name="foundation_date"
            type="date"
            value={formData.foundation_date}
            onChange={handleChange}
            required
          />

          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isLoading}
            >
              {team ? 'Salvar Alterações' : 'Criar Time'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
