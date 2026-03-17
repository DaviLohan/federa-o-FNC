'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { championshipsAPI, teamsAPI } from '@/lib/api';
import { Button, Card, Input, Badge, Table, Select, useToast, Skeleton, EmptyState, ImageUpload, PageHeader, FilterBar, SkeletonGrid } from '@/components/shared/ui';
import type { Championship } from '@/types';
import { useAuthStore } from '@/lib/auth-store';
import { ChampionshipCard } from '@/components/championships/ChampionshipCard';
import { Search, Trophy } from 'lucide-react';

export default function ChampionshipsPage() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const user = useAuthStore((state) => state.user);
  
  // Permission checks based on user type
  const canManageChampionships = user?.user_type === 'ADMIN' || user?.user_type === 'SUPERVISOR';
  const isTeamOwner = user?.user_type === 'TEAM_OWNER';
  const isPlayer = user?.user_type === 'PLAYER';
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChampionship, setEditingChampionship] = useState<Championship | null>(null);
  const [enrollingChampionship, setEnrollingChampionship] = useState<Championship | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  // Debounce: só dispara fetch 400ms após o usuário parar de digitar
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch championships
  const { data: championshipsData, isLoading } = useQuery({
    queryKey: ['championships', statusFilter, debouncedSearch],
    queryFn: () => {
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (debouncedSearch) params.search = debouncedSearch;
      return championshipsAPI.getAll(params);
    },
  });

  // Create championship mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Championship> | FormData) => {
      if (data instanceof FormData) {
        return championshipsAPI.createWithFile(data);
      }
      return championshipsAPI.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      setShowCreateModal(false);
      showToast('Campeonato criado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao criar campeonato', 'error');
    },
  });

  // Update championship mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Championship> | FormData }) => {
      if (data instanceof FormData) {
        return championshipsAPI.updateWithFile(id, data);
      }
      return championshipsAPI.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      setEditingChampionship(null);
      showToast('Campeonato atualizado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao atualizar campeonato', 'error');
    },
  });

  // Start championship mutation
  const startMutation = useMutation({
    mutationFn: (id: number) => championshipsAPI.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      showToast('Campeonato iniciado!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao iniciar campeonato', 'error');
    },
  });

  // Finish championship mutation
  const finishMutation = useMutation({
    mutationFn: (id: number) => championshipsAPI.finish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      showToast('Campeonato finalizado!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao finalizar campeonato', 'error');
    },
  });

  // Enroll team mutation
  const enrollMutation = useMutation({
    mutationFn: (data: { championship: number; team: number }) => championshipsAPI.enroll(data.championship, { team_id: data.team }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championships'] });
      setEnrollingChampionship(null);
      showToast('Time inscrito com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao inscrever time', 'error');
    },
  });

  const championships = championshipsData?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Campeonatos"
        subtitle="Gerencie campeonatos e inscrições"
        icon={<Trophy className="w-8 h-8" />}
        actions={
          canManageChampionships && (
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              + Criar Campeonato
            </Button>
          )
        }
      />

      {/* Filters */}
      <FilterBar>
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              label=""
              placeholder="Buscar campeonatos..."
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
              { value: 'DRAFT', label: 'Rascunho' },
              { value: 'OPEN', label: 'Aberto' },
              { value: 'IN_PROGRESS', label: 'Em Andamento' },
              { value: 'FINISHED', label: 'Finalizado' },
            ]}
          />
        </div>
      </FilterBar>

      {/* Championships Grid */}
      {isLoading ? (
        <SkeletonGrid count={6} />
      ) : championships.length === 0 ? (
        <EmptyState
          icon="🏆"
          title="Nenhum campeonato encontrado"
          description={
            canManageChampionships
              ? 'Comece criando seu primeiro campeonato!'
              : isTeamOwner
              ? 'Aguarde campeonatos serem criados pelos administradores para inscrever seus times.'
              : 'Nenhum campeonato disponível no momento.'
          }
          action={
            canManageChampionships ? (
              <Button onClick={() => setShowCreateModal(true)}>
                + Criar Primeiro Campeonato
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid-cards">
          {championships.map((championship) => (
            <ChampionshipCard key={championship.id} championship={championship} />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingChampionship) && (
        <ChampionshipModal
          championship={editingChampionship}
          onClose={() => {
            setShowCreateModal(false);
            setEditingChampionship(null);
          }}
          onSubmit={(data) => {
            if (editingChampionship) {
              updateMutation.mutate({ id: editingChampionship.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Enrollment Modal */}
      {enrollingChampionship && (
        <EnrollmentModal
          championship={enrollingChampionship}
          onClose={() => setEnrollingChampionship(null)}
          onSubmit={(teamId) => {
            enrollMutation.mutate({
              championship: enrollingChampionship.id,
              team: teamId,
            });
          }}
          isLoading={enrollMutation.isPending}
        />
      )}
    </div>
  );
}

// Championship Modal Component
interface ChampionshipModalProps {
  championship: Championship | null;
  onClose: () => void;
  onSubmit: (data: Partial<Championship>) => void;
  isLoading: boolean;
}

function ChampionshipModal({ championship, onClose, onSubmit, isLoading }: ChampionshipModalProps) {
  const [formData, setFormData] = useState({
    name: championship?.name || '',
    description: championship?.description || '',
    championship_type: championship?.championship_type || 'LEAGUE',
    enrollment_start: championship?.enrollment_start?.split('T')[0] || new Date().toISOString().split('T')[0],
    enrollment_end: championship?.enrollment_end?.split('T')[0] || '',
    start_date: championship?.start_date?.split('T')[0] || '',
    enrollment_fee: championship?.enrollment_fee || '0.00',
    prize_pool: championship?.prize_pool || '0.00',
    max_teams: championship?.max_teams?.toString() || '',
    min_teams: championship?.min_teams?.toString() || '2',
    number_of_winners: championship?.number_of_winners?.toString() || '1',
    rules: championship?.rules || '',
    num_groups: championship?.num_groups?.toString() || '4',
    teams_per_group: championship?.teams_per_group?.toString() || '4',
    qualified_per_group: championship?.qualified_per_group?.toString() || '2',
    has_third_place_match: championship?.has_third_place_match || false,
  });

  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If there are files, use FormData
    if (bannerFile || logoFile) {
      const formDataObj = new FormData();
      
      // Add text fields
      formDataObj.append('name', formData.name);
      formDataObj.append('description', formData.description);
      formDataObj.append('championship_type', formData.championship_type);
      formDataObj.append('enrollment_start', formData.enrollment_start);
      formDataObj.append('enrollment_end', formData.enrollment_end);
      formDataObj.append('start_date', formData.start_date);
      formDataObj.append('enrollment_fee', formData.enrollment_fee);
      formDataObj.append('prize_pool', formData.prize_pool);
      formDataObj.append('min_teams', formData.min_teams);
      formDataObj.append('number_of_winners', formData.number_of_winners);
      formDataObj.append('rules', formData.rules);
      
      if (formData.max_teams) {
        formDataObj.append('max_teams', formData.max_teams);
      }
      
      // Add GROUPS_KNOCKOUT specific fields
      if (formData.championship_type === 'GROUPS_KNOCKOUT') {
        formDataObj.append('num_groups', formData.num_groups);
        formDataObj.append('teams_per_group', formData.teams_per_group);
        formDataObj.append('qualified_per_group', formData.qualified_per_group);
        formDataObj.append('has_third_place_match', formData.has_third_place_match.toString());
      }
      
      // Add files
      if (bannerFile) {
        formDataObj.append('banner', bannerFile);
      }
      if (logoFile) {
        formDataObj.append('logo', logoFile);
      }
      
      onSubmit(formDataObj as any);
    } else {
      // No files, use regular JSON
      const submitData: any = {
        ...formData,
        max_teams: formData.max_teams ? parseInt(formData.max_teams) : undefined,
        min_teams: parseInt(formData.min_teams),
        number_of_winners: parseInt(formData.number_of_winners),
      };
      
      // Add GROUPS_KNOCKOUT specific fields
      if (formData.championship_type === 'GROUPS_KNOCKOUT') {
        submitData.num_groups = parseInt(formData.num_groups);
        submitData.teams_per_group = parseInt(formData.teams_per_group);
        submitData.qualified_per_group = parseInt(formData.qualified_per_group);
        submitData.has_third_place_match = formData.has_third_place_match;
      }
      
      onSubmit(submitData);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-8">
      <Card className="max-w-3xl w-full my-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">
              {championship ? 'Editar Campeonato' : 'Criar Novo Campeonato'}
            </h2>
            <p className="text-muted mt-1">
              {championship ? 'Atualize as informações' : 'Preencha os dados do campeonato'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text text-2xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Image Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border">
            <ImageUpload
              label="Banner do Campeonato"
              value={championship?.banner}
              onChange={setBannerFile}
              previewClassName="w-full h-32"
              helpText="Recomendado: 1600x500px (16:5 ratio)"
              maxSize={5}
            />
            
            <ImageUpload
              label="Logo do Campeonato"
              value={championship?.logo}
              onChange={setLogoFile}
              previewClassName="w-32 h-32 mx-auto"
              helpText="Recomendado: 512x512px (1:1 ratio)"
              maxSize={2}
            />
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Input
                label="Nome do Campeonato"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ex: Copa FNC 2026"
                required
              />
            </div>
            
            <Select
              label="Tipo de Campeonato"
              name="championship_type"
              value={formData.championship_type}
              onChange={handleChange}
              options={[
                { value: 'LEAGUE', label: 'Pontos Corridos (Liga)' },
                { value: 'GROUPS_KNOCKOUT', label: 'Grupos + Mata-mata' },
              ]}
              required
            />
            
            {/* Campos condicionais para GROUPS_KNOCKOUT */}
            {formData.championship_type === 'GROUPS_KNOCKOUT' && (
              <div className="md:col-span-2 space-y-4 p-4 bg-surface2/50 rounded-xl border border-gold/30">
                <h4 className="text-sm font-bold text-gold mb-3">⚙️ Configurações de Grupos</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Número de Grupos"
                    name="num_groups"
                    value={formData.num_groups}
                    onChange={(e) => {
                      const groups = parseInt(e.target.value);
                      const teamsPerGroup = parseInt(formData.teams_per_group) || 4;
                      setFormData(prev => ({
                        ...prev,
                        num_groups: e.target.value,
                        max_teams: (groups * teamsPerGroup).toString()
                      }));
                    }}
                    options={[
                      { value: '2', label: '2 Grupos (8 times)' },
                      { value: '4', label: '4 Grupos (16 times)' },
                      { value: '8', label: '8 Grupos (32 times)' },
                    ]}
                    required
                  />
                  
                  <div className="flex items-center gap-3 p-4 bg-surface2 rounded-xl border border-border">
                    <input
                      type="checkbox"
                      id="has_third_place_match"
                      name="has_third_place_match"
                      checked={formData.has_third_place_match}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        has_third_place_match: e.target.checked
                      }))}
                      className="w-4 h-4 rounded border-border bg-surface2 text-gold focus:ring-gold/50"
                    />
                    <label htmlFor="has_third_place_match" className="text-sm text-text cursor-pointer">
                      Incluir disputa de 3º lugar
                    </label>
                  </div>
                </div>
                
                <div className="p-4 bg-gold/10 rounded-xl border border-gold/30">
                  <p className="text-sm text-gold font-medium">
                    📊 Total de times: {parseInt(formData.num_groups || '4') * parseInt(formData.teams_per_group || '4')} times
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {formData.num_groups} grupos × {formData.teams_per_group} times = {parseInt(formData.num_groups || '4') * parseInt(formData.teams_per_group || '4')} times
                  </p>
                  <p className="text-xs text-muted">
                    Classificam-se: Top {formData.qualified_per_group} de cada grupo ({(parseInt(formData.num_groups || '4') * parseInt(formData.qualified_per_group || '2'))} times para eliminatórias)
                  </p>
                </div>
              </div>
            )}
            
            <Input
              label="Número de Vencedores"
              name="number_of_winners"
              type="number"
              value={formData.number_of_winners}
              onChange={handleChange}
              min="1"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Descrição
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
              placeholder="Descrição do campeonato..."
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Início das Inscrições"
              name="enrollment_start"
              type="date"
              value={formData.enrollment_start}
              onChange={handleChange}
              required
            />
            <Input
              label="Fim das Inscrições"
              name="enrollment_end"
              type="date"
              value={formData.enrollment_end}
              onChange={handleChange}
              required
            />
            <Input
              label="Data de Início"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={handleChange}
              required
            />
          </div>

          {/* Teams & Money */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Mínimo de Times"
              name="min_teams"
              type="number"
              value={formData.min_teams}
              onChange={handleChange}
              min="2"
              required
            />
            <Input
              label="Máximo de Times (deixe vazio para ilimitado)"
              name="max_teams"
              type="number"
              value={formData.max_teams}
              onChange={handleChange}
              min="2"
            />
            <Input
              label="Taxa de Inscrição (R$)"
              name="enrollment_fee"
              type="number"
              step="0.01"
              value={formData.enrollment_fee}
              onChange={handleChange}
              required
            />
            <Input
              label="Prêmio Total (R$)"
              name="prize_pool"
              type="number"
              step="0.01"
              value={formData.prize_pool}
              onChange={handleChange}
              required
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Regras
            </label>
            <textarea
              name="rules"
              value={formData.rules}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
              placeholder="Regras do campeonato..."
            />
          </div>

          {/* Buttons */}
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
              {championship ? 'Salvar Alterações' : 'Criar Campeonato'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Enrollment Modal Component
interface EnrollmentModalProps {
  championship: Championship;
  onClose: () => void;
  onSubmit: (teamId: number) => void;
  isLoading: boolean;
}

function EnrollmentModal({ championship, onClose, onSubmit, isLoading }: EnrollmentModalProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  // Fetch user's teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll(),
  });

  const teams = teamsData?.results || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTeamId) {
      onSubmit(parseInt(selectedTeamId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <Card className="max-w-lg w-full">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">Inscrever Time</h2>
            <p className="text-muted mt-1">{championship.name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-text transition-colors"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Championship Info */}
          <div className="bg-surface-dark rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Tipo:</span>
              <span className="text-text font-semibold">
                {championship.championship_type === 'LEAGUE' ? 'Liga' : 'Eliminatória'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Taxa de Inscrição:</span>
              <span className="text-warning font-semibold">
                R$ {parseFloat(championship.enrollment_fee).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Prêmio:</span>
              <span className="text-success font-semibold">
                R$ {parseFloat(championship.prize_pool).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Vagas:</span>
              <span className="text-text">
                {championship.enrolled_teams_count}/{championship.max_teams || '∞'}
              </span>
            </div>
          </div>

          {/* Team Selection */}
          {teamsLoading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-brand"></div>
              <p className="text-muted mt-2 text-sm">Carregando times...</p>
            </div>
          ) : teams.length === 0 ? (
            <div className="bg-surface-dark rounded-lg p-6 text-center">
              <p className="text-muted">Você não possui times cadastrados.</p>
              <p className="text-muted text-sm mt-1">
                Crie um time primeiro para poder se inscrever em campeonatos.
              </p>
            </div>
          ) : (
            <Select
              label="Selecione o Time"
              value={selectedTeamId}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              options={[
                { value: '', label: 'Selecione um time...' },
                ...teams.map((team) => ({
                  value: team.id.toString(),
                  label: `${team.name} (${team.player_count} jogadores)`,
                })),
              ]}
              required
            />
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
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
              variant="primary"
              className="flex-1"
              loading={isLoading}
              disabled={teams.length === 0 || !selectedTeamId}
            >
              Confirmar Inscrição
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
