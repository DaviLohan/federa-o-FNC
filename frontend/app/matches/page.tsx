'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  EmptyState,
  Modal,
  Skeleton,
  TabsPremium,
  TabPremium,
} from '@/components/shared/ui';
import { MatchCard } from '@/components/matches/MatchCard';
import { MatchGroup } from '@/components/matches/MatchGroup';
import { EAReportModal } from '@/components/championships/modals/EAReportModal';
import { MatchReportModal } from '@/components/championships/modals/MatchReportModal';
import type { Match } from '@/types';
import { Swords, Search, Radio, CalendarClock, CheckCircle2, AlertTriangle, List, ClipboardList } from 'lucide-react';
import { usePermissions } from '@/lib/hooks';

type MatchTab = 'reportable' | 'live' | 'scheduled' | 'finished' | 'contested' | 'all';

const STATUS_TABS: { key: MatchTab; label: string; icon: typeof Radio; statuses: string[] | null }[] = [
  { key: 'reportable', label: 'Para Reportar', icon: ClipboardList, statuses: null },
  { key: 'live', label: 'Ao vivo', icon: Radio, statuses: ['IN_PROGRESS'] },
  { key: 'scheduled', label: 'Agendadas', icon: CalendarClock, statuses: ['SCHEDULED', 'PENDING'] },
  { key: 'finished', label: 'Finalizadas', icon: CheckCircle2, statuses: ['FINISHED'] },
  { key: 'contested', label: 'Contestadas', icon: AlertTriangle, statuses: ['CONTESTED'] },
  { key: 'all', label: 'Todas', icon: List, statuses: null },
];

export default function MatchesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user, canReportMatch } = usePermissions();
  const isRestrictedViewer = user?.user_type === 'TEAM_OWNER' || user?.user_type === 'PLAYER';
  const isSupervisor = user?.user_type === 'ADMIN' || user?.user_type === 'SUPERVISOR' || !!user?.is_supervisor;

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reportingManualMatch, setReportingManualMatch] = useState<Match | null>(null);
  const [eaReportMatch, setEaReportMatch] = useState<Match | null>(null);
  const [tab, setTab] = useState<MatchTab>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [championshipFilter, setChampionshipFilter] = useState<string>('all');

  // ── Queries ──────────────────────────────────────────────────────────────
  // Busca tudo de uma vez; segmentação/filtro/agrupamento são client-side.
  const { data: matchesData, isLoading, isError, refetch } = useQuery({
    queryKey: ['matches', 'all'],
    queryFn: () => matchesAPI.getAll({ page_size: 200, ordering: '-scheduled_date' }),
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const matches: Match[] = matchesData?.results ?? [];
  const teams = teamsData?.results ?? [];
  const championships = championshipsData?.results ?? [];

  // Partidas que o usuário logado pode reportar (gateadas pelo can_report do backend).
  const reportableMatches = useMemo(
    () => matches.filter((m) => canReportMatch(m)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matches, user],
  );

  // Contagens por aba
  const counts = useMemo(() => ({
    reportable: reportableMatches.length,
    live: matches.filter((m) => m.status === 'IN_PROGRESS').length,
    scheduled: matches.filter((m) => m.status === 'SCHEDULED' || m.status === 'PENDING').length,
    finished: matches.filter((m) => m.status === 'FINISHED').length,
    contested: matches.filter((m) => m.status === 'CONTESTED').length,
    all: matches.length,
  }), [matches, reportableMatches.length]);

  // Aba default inteligente: para reportar (não-supervisor) > ao vivo > agendadas > todas.
  const defaultedRef = useRef(false);
  useEffect(() => {
    if (defaultedRef.current || matches.length === 0) return;
    defaultedRef.current = true;
    setTab(
      counts.reportable > 0 && !isSupervisor
        ? 'reportable'
        : counts.live > 0
        ? 'live'
        : counts.scheduled > 0
        ? 'scheduled'
        : 'all',
    );
  }, [matches.length, counts.reportable, counts.live, counts.scheduled, isSupervisor]);

  const hasActiveFilters = !!searchQuery || championshipFilter !== 'all';

  // Aplica aba + busca + filtro de campeonato
  const tabStatuses = STATUS_TABS.find((t) => t.key === tab)?.statuses ?? null;
  const visibleMatches = matches.filter((match) => {
    const inTab = tab === 'reportable' ? canReportMatch(match) : !tabStatuses || tabStatuses.includes(match.status);
    const inSearch =
      !searchQuery ||
      match.home_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.away_team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.championship?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const inChampionship =
      championshipFilter === 'all' || match.championship?.id.toString() === championshipFilter;
    return inTab && inSearch && inChampionship;
  });

  // Agrupa por campeonato (Amistosos por último)
  const groupedMatches = useMemo(() => {
    const ascending = tab === 'live' || tab === 'scheduled';
    const map = new Map<string, { championship: { id: number; name: string; logo?: string } | null; matches: Match[] }>();
    for (const m of visibleMatches) {
      const key = m.championship ? `c${m.championship.id}` : 'friendly';
      if (!map.has(key)) {
        map.set(key, {
          championship: m.championship ? { id: m.championship.id, name: m.championship.name, logo: m.championship.logo } : null,
          matches: [],
        });
      }
      map.get(key)!.matches.push(m);
    }
    const groups = Array.from(map.values());
    groups.forEach((g) =>
      g.matches.sort((a, b) => {
        const diff = new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        return ascending ? diff : -diff;
      }),
    );
    // Campeonatos primeiro (mais recente no topo), Amistosos por último
    groups.sort((a, b) => {
      if (!a.championship) return 1;
      if (!b.championship) return -1;
      const aDate = Math.max(...a.matches.map((m) => new Date(m.scheduled_date).getTime()));
      const bDate = Math.max(...b.matches.map((m) => new Date(m.scheduled_date).getTime()));
      return bDate - aDate;
    });
    return groups;
  }, [visibleMatches, tab]);

  const emptyTitle: Record<MatchTab, string> = {
    reportable: 'Nenhuma partida disponível para report no momento.',
    live: 'Nenhuma partida ao vivo agora',
    scheduled: 'Sem partidas agendadas',
    finished: 'Nenhuma partida finalizada',
    contested: 'Nenhuma contestação',
    all: isRestrictedViewer ? 'Nenhuma partida do seu time encontrada' : 'Nenhuma partida agendada',
  };

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
            : `${visibleMatches.length} partida${visibleMatches.length !== 1 ? 's' : ''} no painel central de confrontos`
        }
        icon={<Swords className="w-8 h-8" />}
        actions={
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            + Agendar Partida
          </Button>
        }
      />

      {/* Abas por status */}
      <TabsPremium value={tab} onChange={(v) => setTab(v as MatchTab)}>
        {STATUS_TABS.map((t) => (
          <TabPremium
            key={t.key}
            value={t.key}
            label={t.label}
            icon={<t.icon className="w-4 h-4" />}
            badge={counts[t.key]}
          />
        ))}
      </TabsPremium>

      {/* Filtros (busca + campeonato) */}
      <FilterBar
        onReset={() => {
          setSearchQuery('');
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

        <div className="w-full sm:w-56">
          <Select
            label=""
            value={championshipFilter}
            onChange={(e) => setChampionshipFilter(e.target.value)}
            options={[
              { value: 'all', label: 'Todos Campeonatos' },
              ...championships.map((c) => ({ value: c.id.toString(), label: c.name })),
            ]}
          />
        </div>
      </FilterBar>

      {/* Lista agrupada por campeonato */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="card" className="h-32" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <EmptyState
            icon={<AlertTriangle className="mx-auto h-14 w-14 text-error/50" />}
            title="Não foi possível carregar as partidas. Tente novamente."
            description="Ocorreu um erro de comunicação com o servidor."
            action={
              <Button variant="primary" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            }
          />
        </Card>
      ) : visibleMatches.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Swords className="mx-auto h-14 w-14 text-gold/40" />}
            title={hasActiveFilters ? 'Nenhuma partida encontrada' : emptyTitle[tab]}
            description={
              hasActiveFilters
                ? 'Tente ajustar a busca ou o campeonato.'
                : tab === 'reportable'
                ? 'Quando uma partida sua entrar em andamento ou for finalizada, ela aparece aqui para report.'
                : isRestrictedViewer
                ? 'Somente partidas relacionadas ao seu time aparecem nesta área.'
                : 'Comece agendando a primeira partida!'
            }
            action={
              !hasActiveFilters && tab !== 'finished' && tab !== 'reportable' ? (
                <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                  + Agendar Partida
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedMatches.map((group) => (
            <MatchGroup
              key={group.championship ? `c${group.championship.id}` : 'friendly'}
              championship={group.championship}
              matches={group.matches}
              onDetails={(m) => router.push(`/matches/${m.id}`)}
              onStart={handleStart}
              onReportEA={(m) => setEaReportMatch(m)}
              onReportManual={(m) => setReportingManualMatch(m)}
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

      {/* Reporte manual (súmula com placar + screenshot) */}
      {reportingManualMatch && (
        <MatchReportModal
          match={reportingManualMatch}
          isOpen={!!reportingManualMatch}
          onClose={() => setReportingManualMatch(null)}
        />
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
