'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eaAPI, teamsAPI, usersAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth-store';
import { useMyTeam } from '@/hooks/useMyTeam';
import { Button, Input, ImageUpload, useToast, PageHeader, FilterBar, SkeletonGrid, EmptyState, Select, Modal, Card } from '@/components/shared/ui';
import { TeamCard } from '@/components/teams/TeamCard';
import type { Team, PaginatedResponse, EAClubSearchResult } from '@/types';
import { Search, AlertTriangle, CheckCircle2, Link2, ShieldCheck, Users, UserCheck, CircleOff } from 'lucide-react';

interface TeamSubmitData extends Partial<Team> {
  ea_club_id?: string;
  ea_platform?: 'common-gen5' | 'common-gen4' | 'pc';
}

const PLATFORM_LABELS: Record<'common-gen5' | 'common-gen4' | 'pc', string> = {
  'common-gen5': 'PS5 / Xbox Series / Cross-play',
  'common-gen4': 'PS4 / Xbox One',
  pc: 'PC',
};

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
    mutationFn: ({ data, file }: { data: TeamSubmitData; file?: File | null }) => {
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
      // Insere o time no cache da listagem imediatamente (atualização otimista),
      // sem esperar o refetch — garante aparição instantânea ao voltar para /teams.
      queryClient.setQueryData(
        ['teams'],
        (old: PaginatedResponse<Team> | undefined) => {
          if (!old) return { count: 1, next: null, previous: null, results: [createdTeam] };
          return { ...old, count: old.count + 1, results: [...old.results, createdTeam] };
        },
      );
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
  const activeTeamsCount = teams.filter((team) => team.is_active).length;
  const inactiveTeamsCount = teams.length - activeTeamsCount;
  const membershipStatus = hasTeam
    ? myTeam?.owner?.id === user?.id
      ? 'Você gerencia um time'
      : 'Você faz parte de um time'
    : 'Nenhum vínculo atual';
  
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
        subtitle="Gerencie seu clube, valide vínculos oficiais na EA e organize o elenco com mais segurança."
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Times visíveis</p>
              <p className="mt-2 text-3xl font-black font-heading text-text">{teams.length}</p>
              <p className="mt-1 text-sm text-muted">Clubes listados para o seu perfil atual.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Status do elenco</p>
              <p className="mt-2 text-lg font-bold text-text">{activeTeamsCount} ativos</p>
              <p className="mt-1 text-sm text-muted">{inactiveTeamsCount} inativos no seu histórico recente.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Seu momento</p>
              <p className="mt-2 text-lg font-bold text-text">{membershipStatus}</p>
              <p className="mt-1 text-sm text-muted">
                {hasTeam && myTeam ? myTeam.name : 'Crie ou entre em um time para começar a competir.'}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              {hasTeam ? <Users className="h-5 w-5" /> : <CircleOff className="h-5 w-5" />}
            </div>
          </div>
        </Card>
      </div>

      {/* Info: usuário já tem time — só exibe quando myTeam está resolvido para evitar nome vazio */}
      {hasTeam && myTeam && (
        <div className="rounded-2xl border border-gold/30 bg-gold/5 px-5 py-4 text-sm text-muted shadow-lg shadow-gold/5">
          Você já {myTeam.owner?.id === user?.id ? 'é dono do time' : 'faz parte de um time'}{' '}
          <a href={`/teams/${myTeam.id}`} className="text-gold underline underline-offset-2">
            {myTeam.name}
          </a>
          . Para criar um novo time, {myTeam.owner?.id === user?.id ? 'exclua o time atual' : 'solicite saída do time atual'}.
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
          icon={<Users className="mx-auto h-14 w-14 text-gold/40" />}
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
  onSubmit: (data: TeamSubmitData, file?: File | null) => void;
  isLoading: boolean;
}

function TeamModal({ team, onClose, onSubmit, isLoading }: TeamModalProps) {
  const { showToast } = useToast();
  const isEditing = !!team;
  const [formData, setFormData] = useState({
    name: team?.name || '',
    abbreviation: team?.abbreviation || '',
    description: team?.description || '',
    foundation_date: team?.foundation_date || new Date().toISOString().split('T')[0],
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [platform, setPlatform] = useState<'common-gen5' | 'common-gen4' | 'pc'>(
    team?.ea_club?.platform || 'common-gen5'
  );
  const [searchResults, setSearchResults] = useState<EAClubSearchResult[]>([]);
  const [selectedClub, setSelectedClub] = useState<EAClubSearchResult | null>(
    team?.ea_club
      ? {
          ea_club_id: team.ea_club.ea_club_id,
          name: team.ea_club.name,
        }
      : null
  );
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const getClubIdentifier = (club: EAClubSearchResult | null) =>
    club ? String(club.ea_club_id || club.clubId || '').trim() : '';

  const getClubDisplayName = (club: EAClubSearchResult | null) =>
    club ? String(club.name || club.clubName || '').trim() : '';

  const getPlatformLabel = (value: 'common-gen5' | 'common-gen4' | 'pc') =>
    PLATFORM_LABELS[value] || value;

  const validateClubMutation = useMutation({
    mutationFn: () =>
      eaAPI.searchClubs({
        club_name: formData.name.trim(),
        platform,
      }),
    onSuccess: (response) => {
      const availableResults = response.results || [];
      setSearchResults(availableResults);

      if (availableResults.length === 0) {
        setSelectedClub(null);
        setValidationMessage(
          'Não encontramos um time correspondente na API da EA. Revise o nome informado e tente novamente.'
        );
        return;
      }

      const selectableResults = availableResults.filter((result) => !result.already_linked);
      if (selectableResults.length === 1 && availableResults.length === 1) {
        setSelectedClub(selectableResults[0]);
        setValidationMessage('Time validado com sucesso. Você já pode concluir o cadastro.');
        return;
      }

      setSelectedClub(null);
      setValidationMessage(
        selectableResults.length > 0
          ? availableResults.some((result) => result.has_legacy_link)
            ? 'Encontramos resultados válidos. Alguns possuem vínculo antigo com times inativos e podem ser reutilizados com segurança.'
            : 'Encontramos mais de um resultado. Selecione abaixo o time correto antes de concluir o cadastro.'
          : 'Os resultados encontrados já estão vinculados a outros times. Escolha outro time ou revise os dados informados.'
      );
    },
    onError: (error: any) => {
      setSearchResults([]);
      setSelectedClub(null);
      setValidationMessage(null);
      showToast(getApiErrorMessage(error, 'Erro ao validar time na API'), 'error');
    },
  });

  const resetValidation = () => {
    if (isEditing) return;
    setSearchResults([]);
    setSelectedClub(null);
    setValidationMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isEditing && !selectedClub) {
      showToast('Valide e selecione o time oficial na API antes de criar o cadastro.', 'error');
      return;
    }

    onSubmit(
      {
        ...formData,
        ...(isEditing
          ? {}
          : {
              ea_club_id: getClubIdentifier(selectedClub),
              ea_platform: platform,
            }),
      },
      logoFile
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.target.name === 'name') {
      resetValidation();
    }

    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const footer = (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        className="flex-1"
        disabled={isLoading}
      >
        Cancelar
      </Button>
      <Button
        type="submit"
        form="team-modal-form"
        variant="primary"
        className="flex-1"
        loading={isLoading}
        disabled={!isEditing && !selectedClub}
      >
        {team ? 'Salvar Alterações' : 'Criar Time'}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={team ? 'Editar Time' : 'Criar Novo Time'}
      description={team ? 'Atualize as informações do time' : 'Preencha os dados, valide na API da EA e conclua o cadastro'}
      size="lg"
      stickyFooter={footer}
    >
      <form id="team-modal-form" onSubmit={handleSubmit} className="space-y-5">
        {/* Logo Upload */}
        <ImageUpload
          label="Logo do Time"
          value={team?.logo}
          onChange={(file) => setLogoFile(file)}
          previewClassName="w-20 h-20 sm:w-24 sm:h-24"
          helpText="PNG, JPG ou WEBP até 5MB"
        />

        {/* Nome + Abreviação */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
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

        {!isEditing && (
          <div className="rounded-2xl border border-gold/20 bg-gold/5 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-text">
                  Validação obrigatória na API da EA
                </h3>
                <p className="text-xs text-muted mt-1">
                  O time só pode ser criado depois que o sistema localizar o clube oficial na EA e confirmar o identificador correto.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
              <Select
                label="Plataforma"
                value={platform}
                onChange={(e) => {
                  setPlatform(e.target.value as 'common-gen5' | 'common-gen4' | 'pc');
                  resetValidation();
                }}
                options={[
                  { value: 'common-gen5', label: 'PS5 / Xbox Series / Cross-play' },
                  { value: 'common-gen4', label: 'PS4 / Xbox One' },
                  { value: 'pc', label: 'PC' },
                ]}
              />

              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  if (formData.name.trim().length < 2) {
                    showToast('Informe o nome do time antes de validar na API.', 'error');
                    return;
                  }
                  validateClubMutation.mutate();
                }}
                loading={validateClubMutation.isPending}
                className="sm:min-w-[170px]"
              >
                Validar na API
              </Button>
            </div>

            {validationMessage && (
              <div className={`rounded-xl border px-3 py-2.5 text-sm ${selectedClub
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-warning/30 bg-warning/10 text-warning'
              }`}>
                {validationMessage}
              </div>
            )}

            {selectedClub && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-success/10 border border-success/20 flex items-center justify-center text-success flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text">Time confirmado</p>
                    <p className="text-sm text-text mt-1">{getClubDisplayName(selectedClub)}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface2">
                        ID oficial: {getClubIdentifier(selectedClub)}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface2">
                        Plataforma: {getPlatformLabel(platform)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {searchResults.length > 1 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-text">
                  Selecione o time correto encontrado na API
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {searchResults.map((result) => {
                    const resultId = getClubIdentifier(result);
                    const isSelected = getClubIdentifier(selectedClub) === resultId;
                    const isBlocked = !!result.already_linked;

                    return (
                      <button
                        key={`${resultId}-${getClubDisplayName(result)}`}
                        type="button"
                        disabled={isBlocked}
                        onClick={() => {
                          setSelectedClub(result);
                          setValidationMessage('Time validado com sucesso. Você já pode concluir o cadastro.');
                        }}
                        className={`w-full rounded-2xl border p-4 text-left transition-all ${
                          isBlocked
                            ? 'border-error/30 bg-error/10 opacity-70 cursor-not-allowed'
                            : isSelected
                              ? 'border-gold/50 bg-gold/10 shadow-lg shadow-gold/10'
                              : 'border-border bg-surface2 hover:border-gold/40 hover:bg-surface1'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-text truncate">{getClubDisplayName(result)}</p>
                            <div className="flex flex-wrap gap-2 mt-2 text-xs text-muted">
                              <span className="inline-flex items-center px-2 py-1 rounded-full border border-border bg-surface1">
                                ID: {resultId}
                              </span>
                              {result.overallRank && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full border border-border bg-surface1">
                                  Rank: {result.overallRank}
                                </span>
                              )}
                              {result.members && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full border border-border bg-surface1">
                                  Membros: {result.members}
                                </span>
                              )}
                            </div>
                          </div>

                          {isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-error/30 bg-error/10 text-error">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Em uso
                            </span>
                          ) : isSelected ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-gold/30 bg-gold/10 text-gold">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Selecionado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border border-border bg-surface1 text-muted">
                              <Link2 className="w-3.5 h-3.5" />
                              Selecionar
                            </span>
                          )}
                        </div>

                        {isBlocked && result.existing_team && (
                          <p className="mt-3 text-xs text-error">
                            Já vinculado ao time ativo {result.existing_team.name}.
                          </p>
                        )}

                        {!isBlocked && result.has_legacy_link && result.existing_team && (
                          <p className="mt-3 text-xs text-warning">
                            Vínculo legado encontrado com o time inativo {result.existing_team.name}. O sistema vai reutilizar esse identificador oficial no novo cadastro.
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {isEditing && team.ea_club && (
          <div className="rounded-2xl border border-border bg-surface2 p-4">
            <p className="text-sm font-semibold text-text">Vínculo oficial com a EA</p>
            <div className="flex flex-wrap gap-2 mt-3 text-xs text-muted">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface1">
                {team.ea_club.name}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface1">
                ID: {team.ea_club.ea_club_id}
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full border border-border bg-surface1">
                {team.ea_club.platform_display || team.ea_club.platform}
              </span>
            </div>
          </div>
        )}

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Descrição
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none text-sm"
            placeholder="Descreva seu time..."
          />
        </div>

        {/* Data de Fundação */}
        <Input
          label="Data de Fundação"
          name="foundation_date"
          type="date"
          value={formData.foundation_date}
          onChange={handleChange}
          required
        />
      </form>
    </Modal>
  );
}
