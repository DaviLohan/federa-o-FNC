'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesAPI, teamsAPI, championshipsAPI } from '@/lib/api';
import { Button, Card, Input, Badge, Table, Select, useToast, PageHeader, FilterBar, Drawer, EmptyState } from '@/components/shared/ui';
import type { Match } from '@/types';
import { Calendar, Search } from 'lucide-react';

export default function MatchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [showResultModal, setShowResultModal] = useState<Match | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [championshipFilter, setChampionshipFilter] = useState<string>('all');

  // Fetch matches
  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', statusFilter],
    queryFn: () => matchesAPI.getAll(statusFilter !== 'all' ? { status: statusFilter } : {}),
  });

  // Fetch teams for dropdown — só busca quando o modal de criação está aberto
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll(),
    enabled: showCreateModal,
  });

  // Fetch championships — usado tanto no filtro de listagem quanto no modal de criação
  const { data: championshipsData } = useQuery({
    queryKey: ['championships'],
    queryFn: () => championshipsAPI.getAll(),
  });

  // Create match mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Match>) => matchesAPI.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setShowCreateModal(false);
      showToast('Partida criada com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao criar partida', 'error');
    },
  });

  // Start match mutation
  const startMutation = useMutation({
    mutationFn: (id: number) => matchesAPI.start(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      showToast('Partida iniciada!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao iniciar partida', 'error');
    },
  });

  // Finish match mutation
  const finishMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => matchesAPI.submitReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setShowResultModal(null);
      showToast('Resultado registrado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao registrar resultado', 'error');
    },
  });

  const matches = matchesData?.results || [];
  const teams = teamsData?.results || [];
  const championships = championshipsData?.results || [];
  
  // Filter matches
  const filteredMatches = matches.filter((match) => {
    const matchesSearch = !searchQuery || 
      match.home_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.away_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.championship?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesChampionship = championshipFilter === 'all' || 
      match.championship?.id.toString() === championshipFilter;
    
    return matchesSearch && matchesChampionship;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'SCHEDULED': 'pending',
      'IN_PROGRESS': 'live',
      'FINISHED': 'finished',
      'CANCELLED': 'error',
      'CONTESTED': 'contested',
    };
    return variants[status] || 'default';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'SCHEDULED': 'Agendada',
      'IN_PROGRESS': 'Em Andamento',
      'FINISHED': 'Finalizada',
      'CANCELLED': 'Cancelada',
      'CONTESTED': 'Contestada',
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader 
        title="Partidas"
        subtitle="Gerencie partidas e resultados"
        icon={<Calendar className="w-8 h-8" />}
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Agendar Partida
          </Button>
        }
      />

      {/* Filters */}
      <FilterBar onReset={() => {
        setSearchQuery('');
        setStatusFilter('all');
        setChampionshipFilter('all');
      }}>
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              label=""
              placeholder="Buscar partidas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Championship Filter */}
        <div className="w-full sm:w-48">
          <Select
            label=""
            value={championshipFilter}
            onChange={(e) => setChampionshipFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todos Campeonatos' },
              ...championships.map(c => ({ value: c.id.toString(), label: c.name }))
            ]}
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48">
          <Select
            label=""
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todos Status' },
              { value: 'SCHEDULED', label: 'Agendadas' },
              { value: 'IN_PROGRESS', label: 'Em Andamento' },
              { value: 'FINISHED', label: 'Finalizadas' },
            ]}
          />
        </div>
      </FilterBar>

      {/* Matches List */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
            <p className="text-muted mt-4">Carregando partidas...</p>
          </div>
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            icon="⚽"
            title={searchQuery || statusFilter !== 'all' || championshipFilter !== 'all' ? 'Nenhuma partida encontrada' : 'Nenhuma partida agendada'}
            description={
              searchQuery || statusFilter !== 'all' || championshipFilter !== 'all'
                ? 'Tente ajustar os filtros de busca.'
                : 'Comece agendando a primeira partida!'
            }
            action={
              !searchQuery && statusFilter === 'all' && championshipFilter === 'all' ? (
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  + Agendar Primeira Partida
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            headers={['Confronto', 'Placar', 'Tipo', 'Status', 'Data', 'Ações']}
            data={filteredMatches}
            renderRow={(match) => (
              <>
                <td className="px-4 py-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                   <span className="font-semibold text-text">{match.home_team.name}</span>
                   <span className="text-muted">vs</span>
                   <span className="font-semibold text-text">{match.away_team.name}</span>
                  </div>
                  {match.championship && (
                    <div className="text-xs text-muted mt-1">
                      {match.championship.name}
                      {match.round_number && ` - Rodada ${match.round_number}`}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  {match.status === 'FINISHED' ? (
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-text text-lg">
                        {match.home_score} - {match.away_score}
                      </span>
                      {match.winner && (
                        <span className="text-xs text-green">
                          ({match.winner.abbreviation})
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="pending">
                    {match.match_type === 'FRIENDLY' ? 'Amistoso' :
                     match.match_type === 'CHAMPIONSHIP' ? 'Campeonato' :
                     match.match_type === 'PLAYOFF' ? 'Playoff' : 'Final'}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={getStatusBadge(match.status)}>
                    {getStatusLabel(match.status)}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="text-muted text-sm">
                    {new Date(match.scheduled_date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                    })}
                    <br />
                    {new Date(match.scheduled_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => router.push(`/matches/${match.id}`)}
                      className="text-xs px-3 py-1"
                    >
                      Ver Detalhes
                    </Button>
                    {match.status === 'SCHEDULED' && (
                      <Button
                        variant="ghost"
                        onClick={() => {
                          if (confirm('Iniciar partida?')) {
                            startMutation.mutate(match.id);
                          }
                        }}
                        className="text-xs px-3 py-1 text-warning hover:bg-warning/10"
                      >
                        Iniciar
                      </Button>
                    )}
                    {match.status === 'IN_PROGRESS' && (
                      <Button
                        variant="ghost"
                        onClick={() => setShowResultModal(match)}
                        className="text-xs px-3 py-1 text-gold hover:bg-gold/10"
                      >
                        Resultado
                      </Button>
                    )}
                  </div>
                </td>
              </>
            )}
          />
        )}
      </Card>

      {/* Create Modal */}
      {showCreateModal && (
        <MatchModal
          teams={teams}
          championships={championships}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Result Drawer */}
      {showResultModal && (
        <Drawer
          isOpen={!!showResultModal}
          onClose={() => setShowResultModal(null)}
          title="Registrar Resultado"
          subtitle={`${showResultModal.home_team.name} vs ${showResultModal.away_team.name}`}
          width="md"
        >
          <ResultForm
            match={showResultModal}
            onSubmit={(data) => finishMutation.mutate({ id: showResultModal.id, data })}
            isLoading={finishMutation.isPending}
          />
        </Drawer>
      )}
    </div>
  );
}

// Match Modal Component
interface MatchModalProps {
  teams: any[];
  championships: any[];
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function MatchModal({ teams, championships, onClose, onSubmit, isLoading }: MatchModalProps) {
  const [formData, setFormData] = useState({
    home_team: '',
    away_team: '',
    championship: '',
    match_type: 'FRIENDLY',
    round_number: '',
    scheduled_date: new Date().toISOString().slice(0, 16),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData = {
      home_team: parseInt(formData.home_team),
      away_team: parseInt(formData.away_team),
      championship: formData.championship ? parseInt(formData.championship) : null,
      match_type: formData.match_type,
      round_number: formData.round_number ? parseInt(formData.round_number) : null,
      scheduled_date: formData.scheduled_date,
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <Card className="max-w-2xl w-full">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-text">Agendar Nova Partida</h2>
            <p className="text-muted mt-1">Preencha os dados da partida</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-text text-2xl transition-colors">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Time Mandante"
              value={formData.home_team}
              onChange={(e) => setFormData({ ...formData, home_team: e.target.value })}
              options={[
                { value: '', label: 'Selecione um time' },
                ...teams.map(t => ({ value: t.id.toString(), label: t.name }))
              ]}
              required
            />
            <Select
              label="Time Visitante"
              value={formData.away_team}
              onChange={(e) => setFormData({ ...formData, away_team: e.target.value })}
              options={[
                { value: '', label: 'Selecione um time' },
                ...teams.map(t => ({ value: t.id.toString(), label: t.name }))
              ]}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Tipo de Partida"
              value={formData.match_type}
              onChange={(e) => setFormData({ ...formData, match_type: e.target.value })}
              options={[
                { value: 'FRIENDLY', label: 'Amistoso' },
                { value: 'CHAMPIONSHIP', label: 'Campeonato' },
                { value: 'PLAYOFF', label: 'Playoff' },
                { value: 'FINAL', label: 'Final' },
              ]}
              required
            />
            <Select
              label="Campeonato (opcional)"
              value={formData.championship}
              onChange={(e) => setFormData({ ...formData, championship: e.target.value })}
              options={[
                { value: '', label: 'Nenhum' },
                ...championships.map(c => ({ value: c.id.toString(), label: c.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Data e Hora"
              type="datetime-local"
              value={formData.scheduled_date}
              onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
              required
            />
            <Input
              label="Número da Rodada (opcional)"
              type="number"
              value={formData.round_number}
              onChange={(e) => setFormData({ ...formData, round_number: e.target.value })}
              min="1"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={isLoading}>
              Agendar Partida
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// Result Form Component (for Drawer)
interface ResultFormProps {
  match: Match;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

function ResultForm({ match, onSubmit, isLoading }: ResultFormProps) {
  const [homeScore, setHomeScore] = useState('0');
  const [awayScore, setAwayScore] = useState('0');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      home_score: parseInt(homeScore),
      away_score: parseInt(awayScore),
    });
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-surface2 rounded-3xl border border-border">
        <div className="flex items-center justify-center space-x-6">
          <div className="text-center flex-1">
            <div className="text-sm text-muted mb-2">Mandante</div>
            <div className="font-bold text-lg text-text">{match.home_team.name}</div>
            <div className="text-xs text-gold font-mono mt-1">{match.home_team.abbreviation}</div>
          </div>
          <div className="text-4xl text-muted">vs</div>
          <div className="text-center flex-1">
            <div className="text-sm text-muted mb-2">Visitante</div>
            <div className="font-bold text-lg text-text">{match.away_team.name}</div>
            <div className="text-xs text-gold font-mono mt-1">{match.away_team.abbreviation}</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Gols ${match.home_team.abbreviation}`}
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            min="0"
            required
          />
          <Input
            label={`Gols ${match.away_team.abbreviation}`}
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            min="0"
            required
          />
        </div>

        <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
          Confirmar Resultado
        </Button>
      </form>
    </div>
  );
}
