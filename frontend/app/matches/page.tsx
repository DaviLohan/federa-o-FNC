'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { matchesAPI, teamsAPI, championshipsAPI } from '@/lib/api';
import {
  Button,
  Card,
  Input,
  Select,
  useToast,
  PageHeader,
  FilterBar,
  Drawer,
  EmptyState,
  Modal,
  Skeleton,
} from '@/components/shared/ui';
import { MatchCard } from '@/components/matches/MatchCard';
import { EAReportModal } from '@/components/championships/modals/EAReportModal';
import type { Match } from '@/types';
import { Swords, Search, Clock3, CheckCircle2, AlertTriangle } from 'lucide-react';
import { usePermissions } from '@/lib/hooks';

export default function MatchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user } = usePermissions();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResultDrawer, setShowResultDrawer] = useState<Match | null>(null);
  const [eaReportMatch, setEaReportMatch] = useState<Match | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [championshipFilter, setChampionshipFilter] = useState<string>('all');

  // ── Queries ──────────────────────────────────────────────────────────────

  const { data: matchesData, isLoading } = useQuery({
    queryKey: ['matches', statusFilter],
    queryFn: () =>
      matchesAPI.getAll(statusFilter !== 'all' ? { status: statusFilter } : {}),
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsAPI.getAll(),
    enabled: showCreateModal,
  });

  const { data: championshipsData } = useQuery({
    queryKey: ['championships'],
    queryFn: () => championshipsAPI.getAll(),
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

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

  const startMutation = useMutation({
    mutationFn: (id: number) => matchesAPI.start(id),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      showToast(data?.message || 'Partida liberada automaticamente no horário agendado.', 'success');
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.error || 'Erro ao iniciar partida',
        'error',
      );
    },
  });

  const finishMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      matchesAPI.submitReport(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setShowResultDrawer(null);
      showToast('Resultado registrado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(
        error.response?.data?.error || 'Erro ao registrar resultado',
        'error',
      );
    },
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const matches = matchesData?.results ?? [];
  const teams = teamsData?.results ?? [];
  const championships = championshipsData?.results ?? [];
  const scheduledCount = matches.filter((match) => match.status === 'SCHEDULED').length;
  const inProgressCount = matches.filter((match) => match.status === 'IN_PROGRESS').length;
  const finishedCount = matches.filter((match) => match.status === 'FINISHED').length;
  const contestedCount = matches.filter((match) => match.status === 'CONTESTED').length;

  const hasActiveFilters =
    !!searchQuery ||
    statusFilter !== 'all' ||
    championshipFilter !== 'all';

  const filteredMatches = matches.filter((match) => {
    const matchesSearch =
      !searchQuery ||
      match.home_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.away_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.championship?.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());

    const matchesChampionship =
      championshipFilter === 'all' ||
      match.championship?.id.toString() === championshipFilter;

    return matchesSearch && matchesChampionship;
  });

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleStart = (match: Match) => {
    if (confirm(`Iniciar a partida ${match.home_team.name} vs ${match.away_team.name}?`)) {
      startMutation.mutate(match.id);
    }
  };

  const handleContest = (match: Match) => {
    // Redireciona para detalhes onde o fluxo de contestação está completo
    router.push(`/matches/${match.id}`);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Partidas"
        subtitle={
          isLoading
            ? 'Carregando calendário competitivo...'
            : `${filteredMatches.length} partida${filteredMatches.length !== 1 ? 's' : ''} encontrada${filteredMatches.length !== 1 ? 's' : ''} no painel central de confrontos`
        }
        icon={<Swords className="w-8 h-8" />}
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Agendar Partida
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Agendadas</p>
              <p className="mt-2 text-3xl font-black font-heading text-text">{scheduledCount}</p>
              <p className="mt-1 text-sm text-muted">Confrontos prontos para lineup e kickoff.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <Clock3 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Em andamento</p>
              <p className="mt-2 text-3xl font-black font-heading text-text">{inProgressCount}</p>
              <p className="mt-1 text-sm text-muted">Partidas correndo ou aguardando fechamento.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <Swords className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Finalizadas</p>
              <p className="mt-2 text-3xl font-black font-heading text-text">{finishedCount}</p>
              <p className="mt-1 text-sm text-muted">Resultados já consolidados no histórico.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
        </Card>

        <Card className="!p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-muted">Contestadas</p>
              <p className="mt-2 text-3xl font-black font-heading text-text">{contestedCount}</p>
              <p className="mt-1 text-sm text-muted">Casos que pedem revisão e atenção extra.</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/20 bg-gold/10 text-gold">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <FilterBar
        onReset={() => {
          setSearchQuery('');
          setStatusFilter('all');
          setChampionshipFilter('all');
        }}
      >
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
            <Input
              label=""
              placeholder="Buscar por time ou campeonato..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="w-full sm:w-48">
          <Select
            label=""
            value={championshipFilter}
            onChange={(e) => setChampionshipFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todos Campeonatos' },
              ...championships.map((c) => ({
                value: c.id.toString(),
                label: c.name,
              })),
            ]}
          />
        </div>

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
              { value: 'CONTESTED', label: 'Contestadas' },
              { value: 'CANCELLED', label: 'Canceladas' },
            ]}
          />
        </div>
      </FilterBar>

      {/* Matches List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-40" />
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Swords className="mx-auto h-14 w-14 text-gold/40" />}
              title={
                hasActiveFilters
                  ? 'Nenhuma partida encontrada'
                  : user?.user_type === 'TEAM_OWNER'
                  ? 'Nenhuma partida do seu time encontrada'
                  : 'Nenhuma partida agendada'
              }
              description={
                hasActiveFilters
                  ? 'Tente ajustar os filtros de busca.'
                  : user?.user_type === 'TEAM_OWNER'
                  ? 'Somente partidas dos seus times aparecem nesta área.'
                  : 'Comece agendando a primeira partida!'
              }
            action={
              !hasActiveFilters ? (
                <Button
                  variant="primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  + Agendar Primeira Partida
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredMatches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onDetails={(m) => router.push(`/matches/${m.id}`)}
              onStart={handleStart}
              onReportEA={(m) => setEaReportMatch(m)}
              onReportManual={(m) => setShowResultDrawer(m)}
              onContest={handleContest}
            />
          ))}
        </div>
      )}

      {/* Create Match Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Agendar Nova Partida"
        description="Preencha os dados da partida"
        size="lg"
      >
        <MatchForm
          teams={teams}
          championships={championships}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* Result Drawer (reporte manual — apenas IN_PROGRESS) */}
      {showResultDrawer && (
        <Drawer
          isOpen={!!showResultDrawer}
          onClose={() => setShowResultDrawer(null)}
          title="Registrar Resultado"
          subtitle={`${showResultDrawer.home_team.name} vs ${showResultDrawer.away_team.name}`}
          width="md"
        >
          <ResultForm
            match={showResultDrawer}
            onSubmit={(data) =>
              finishMutation.mutate({ id: showResultDrawer.id, data })
            }
            isLoading={finishMutation.isPending}
          />
        </Drawer>
      )}

      {/* EA Report Modal */}
      {eaReportMatch && (
        <EAReportModal
          match={eaReportMatch}
          isOpen={!!eaReportMatch}
          onClose={() => setEaReportMatch(null)}
        />
      )}
    </div>
  );
}

// ─── MatchForm ────────────────────────────────────────────────────────────────

interface MatchFormProps {
  teams: any[];
  championships: any[];
  onSubmit: (data: any) => void;
  isLoading: boolean;
  onCancel: () => void;
}

function MatchForm({
  teams,
  championships,
  onSubmit,
  isLoading,
  onCancel,
}: MatchFormProps) {
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
    onSubmit({
      home_team: parseInt(formData.home_team),
      away_team: parseInt(formData.away_team),
      championship: formData.championship
        ? parseInt(formData.championship)
        : null,
      match_type: formData.match_type,
      round_number: formData.round_number
        ? parseInt(formData.round_number)
        : null,
      scheduled_date: formData.scheduled_date,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Time Mandante"
          value={formData.home_team}
          onChange={(e) =>
            setFormData({ ...formData, home_team: e.target.value })
          }
          options={[
            { value: '', label: 'Selecione um time' },
            ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
          ]}
          required
        />
        <Select
          label="Time Visitante"
          value={formData.away_team}
          onChange={(e) =>
            setFormData({ ...formData, away_team: e.target.value })
          }
          options={[
            { value: '', label: 'Selecione um time' },
            ...teams.map((t) => ({ value: t.id.toString(), label: t.name })),
          ]}
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Tipo de Partida"
          value={formData.match_type}
          onChange={(e) =>
            setFormData({ ...formData, match_type: e.target.value })
          }
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
          onChange={(e) =>
            setFormData({ ...formData, championship: e.target.value })
          }
          options={[
            { value: '', label: 'Nenhum' },
            ...championships.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            })),
          ]}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Data e Hora"
          type="datetime-local"
          value={formData.scheduled_date}
          onChange={(e) =>
            setFormData({ ...formData, scheduled_date: e.target.value })
          }
          required
        />
        <Input
          label="Número da Rodada (opcional)"
          type="number"
          value={formData.round_number}
          onChange={(e) =>
            setFormData({ ...formData, round_number: e.target.value })
          }
          min="1"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
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
          Agendar Partida
        </Button>
      </div>
    </form>
  );
}

// ─── ResultForm ───────────────────────────────────────────────────────────────

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
      {/* Preview das equipes */}
      <div className="p-5 bg-panel2 rounded-2xl border border-stroke">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div className="text-center">
            <p className="text-xs text-muted2 mb-1">Mandante</p>
            <p className="font-bold text-text">{match.home_team.name}</p>
            <p className="text-xs text-gold font-mono mt-0.5">
              {match.home_team.abbreviation}
            </p>
          </div>
          <span className="text-2xl font-bold text-muted2">vs</span>
          <div className="text-center">
            <p className="text-xs text-muted2 mb-1">Visitante</p>
            <p className="font-bold text-text">{match.away_team.name}</p>
            <p className="text-xs text-gold font-mono mt-0.5">
              {match.away_team.abbreviation}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label={`Gols — ${match.home_team.abbreviation}`}
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            min="0"
            required
          />
          <Input
            label={`Gols — ${match.away_team.abbreviation}`}
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            min="0"
            required
          />
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          loading={isLoading}
        >
          Confirmar Resultado
        </Button>
      </form>
    </div>
  );
}
