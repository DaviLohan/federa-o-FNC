'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, ShieldAlert } from 'lucide-react';

import { championshipsAPI, statisticsAPI } from '@/lib/api';
import type { Championship, WeeklySelectionPayload } from '@/types';
import { Badge, Button, EmptyState, PageHeader, Select, Skeleton } from '@/components/shared/ui';
import { buildPitchSlots } from './weeklyLayout';
import { WeeklyPitch } from './WeeklyPitch';
import { MvpHero } from './MvpHero';
import { WeeklyHighlights } from './WeeklyHighlights';
import { WeeklyPlayerGroups } from './WeeklyPlayerGroups';

// ─── SVG de divulgação ("Baixar Arte") — espelha o layout vertical ──────────

function buildSelectionSvg(payload: WeeklySelectionPayload): string {
  const slots = buildPitchSlots(payload);
  const escape = (value: string) =>
    value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // retângulo do gramado no SVG: x 120..960 (w 840), y 230..910 (h 680)
  const playerNodes = slots
    .map((slot) => {
      const x = 120 + (slot.left / 100) * 840;
      const y = 230 + (slot.top / 100) * 680;
      const fill = slot.player?.is_mvp ? '#D6A11E' : '#0B0F16';
      const stroke = slot.player?.is_mvp ? '#F3D36B' : 'rgba(255,255,255,0.18)';
      const playerName = slot.player ? escape(slot.player.player_name) : slot.label;
      const teamName = slot.player ? escape(slot.player.team_name) : '';
      const rating = slot.player ? slot.player.average_rating.toFixed(1) : '';
      const ratingColor = slot.player?.is_mvp ? '#0B0F16' : '#F3D36B';
      return `
      <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="30" fill="${fill}" stroke="${stroke}" stroke-width="3" />
        <text x="0" y="3" fill="${ratingColor}" text-anchor="middle" font-size="15" font-family="JetBrains Mono, monospace" font-weight="700">${rating}</text>
        <text x="0" y="48" fill="#FFFFFF" text-anchor="middle" font-size="13" font-family="Inter, Arial" font-weight="700">${playerName}</text>
        <text x="0" y="66" fill="rgba(255,255,255,0.65)" text-anchor="middle" font-size="11" font-family="Inter, Arial">${teamName}</text>
      </g>`;
    })
    .join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07090D" />
        <stop offset="100%" stop-color="#0D1422" />
      </linearGradient>
      <linearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0c1f17" />
        <stop offset="100%" stop-color="#0a1410" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)" />
    <text x="540" y="90" fill="#FFFFFF" text-anchor="middle" font-size="46" font-family="Inter, Arial" font-weight="800">Seleção da Semana</text>
    <text x="540" y="135" fill="#D6A11E" text-anchor="middle" font-size="24" font-family="Inter, Arial" font-weight="700">${escape(payload.championship.name)} • Rodada ${payload.round_number} • ${payload.formation}</text>
    <rect x="80" y="190" width="920" height="760" rx="32" fill="#0B0F16" stroke="rgba(214,161,30,0.18)" />
    <rect x="120" y="230" width="840" height="680" rx="28" fill="url(#turf)" stroke="rgba(255,255,255,0.10)" />
    <line x1="120" y1="570" x2="960" y2="570" stroke="rgba(255,255,255,0.09)" stroke-width="3" />
    <circle cx="540" cy="570" r="70" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="3" />
    ${playerNodes}
    <rect x="80" y="990" width="920" height="220" rx="28" fill="#0B0F16" stroke="rgba(214,161,30,0.18)" />
    <text x="120" y="1045" fill="#FFFFFF" font-size="26" font-family="Inter, Arial" font-weight="700">MVP da Rodada</text>
    <text x="120" y="1090" fill="#D6A11E" font-size="36" font-family="Inter, Arial" font-weight="800">${escape(payload.mvp?.player_name || '—')}</text>
    <text x="120" y="1130" fill="rgba(255,255,255,0.75)" font-size="20" font-family="Inter, Arial">${escape(payload.mvp?.team_name || '')} • ${payload.mvp?.position || ''}</text>
    <text x="120" y="1170" fill="#FFFFFF" font-size="18" font-family="Inter, Arial">Nota ${payload.mvp?.average_rating?.toFixed(2) || '—'} • Gols ${payload.mvp?.goals || 0} • Assist. ${payload.mvp?.assists || 0}</text>
    <text x="540" y="1290" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-size="20" font-family="Inter, Arial">FDT ARENA • Onde o talento vira legado</text>
  </svg>`;
}

function downloadSelectionSvg(payload: WeeklySelectionPayload) {
  const svg = buildSelectionSvg(payload);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `selecao-da-semana-${payload.championship.id}-rodada-${payload.round_number}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ─── Filtros ────────────────────────────────────────────────────────────────

function WeeklySelectionFilters({
  championships,
  championshipId,
  onChampionshipChange,
  rounds,
  roundNumber,
  onRoundChange,
}: {
  championships: Championship[];
  championshipId: string;
  onChampionshipChange: (value: string) => void;
  rounds: number[];
  roundNumber: string;
  onRoundChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-2xl border border-stroke bg-surface1 p-4 sm:grid-cols-2">
      <Select
        label="Campeonato"
        value={championshipId}
        onChange={(e) => onChampionshipChange(e.target.value)}
        options={[
          { value: '', label: 'Selecione' },
          ...championships.map((c) => ({ value: String(c.id), label: c.name })),
        ]}
      />
      <Select
        label="Rodada"
        value={roundNumber}
        onChange={(e) => onRoundChange(e.target.value)}
        options={[
          { value: '', label: 'Automática (última)' },
          ...rounds.map((round) => ({ value: String(round), label: `Rodada ${round}` })),
        ]}
      />
    </div>
  );
}

// ─── Seção ──────────────────────────────────────────────────────────────────

interface WeeklySelectionSectionProps {
  embedded?: boolean;
}

export function WeeklySelectionSection({ embedded = false }: WeeklySelectionSectionProps) {
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('');
  const [selectedRound, setSelectedRound] = useState('');

  const championshipsQuery = useQuery({
    queryKey: ['weekly-selection-championships'],
    queryFn: () => championshipsAPI.getAll({ ordering: '-created_at', page_size: 50 }),
  });

  const championships = useMemo(
    () => championshipsQuery.data?.results ?? [],
    [championshipsQuery.data],
  );

  useEffect(() => {
    if (!selectedChampionshipId && championships.length > 0) {
      const preferred = championships.find((item) => item.status === 'IN_PROGRESS') || championships[0];
      setSelectedChampionshipId(String(preferred.id));
    }
  }, [championships, selectedChampionshipId]);

  const weeklySelectionQuery = useQuery({
    queryKey: ['weekly-selection', selectedChampionshipId, selectedRound],
    queryFn: () =>
      statisticsAPI.getWeeklySelection(
        Number(selectedChampionshipId),
        selectedRound ? Number(selectedRound) : undefined,
      ),
    enabled: !!selectedChampionshipId,
  });

  const payload = weeklySelectionQuery.data as WeeklySelectionPayload | undefined;
  const availableRounds = payload?.available_rounds ?? [];

  useEffect(() => {
    if (!selectedRound && payload?.round_number) {
      setSelectedRound(String(payload.round_number));
    }
  }, [payload?.round_number, selectedRound]);

  const hasPlayers = !!payload && payload.players.length > 0;

  const downloadButton = hasPlayers && (
    <Button onClick={() => payload && downloadSelectionSvg(payload)}>
      <Download className="h-4 w-4" />
      Baixar Arte
    </Button>
  );

  const scoutingSubtitle = payload?.meta
    ? `${payload.meta.matches_analyzed} partidas analisadas · ${payload.meta.players_considered} jogadores avaliados`
    : 'Os melhores jogadores da rodada em uma formação oficial 3-5-2.';

  return (
    <div className="space-y-6">
      {!embedded ? (
        <PageHeader
          title="Seleção da Semana"
          subtitle={scoutingSubtitle}
          actions={downloadButton}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted2">{scoutingSubtitle}</p>
          {downloadButton}
        </div>
      )}

      <WeeklySelectionFilters
        championships={championships}
        championshipId={selectedChampionshipId}
        onChampionshipChange={(value) => {
          setSelectedChampionshipId(value);
          setSelectedRound('');
        }}
        rounds={availableRounds}
        roundNumber={selectedRound}
        onRoundChange={setSelectedRound}
      />

      {championshipsQuery.isLoading || weeklySelectionQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Skeleton className="mx-auto aspect-[3/4] w-full max-w-md rounded-3xl" />
          <div className="space-y-4">
            <Skeleton className="h-44 rounded-3xl" />
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      ) : weeklySelectionQuery.isError ? (
        <EmptyState
          icon={<ShieldAlert className="mx-auto h-12 w-12 text-gold/40" />}
          title="Não foi possível carregar a seleção da semana"
          description="Verifique o campeonato e a rodada escolhida ou tente novamente em instantes."
        />
      ) : !hasPlayers ? (
        <EmptyState
          icon={<BarChart3 className="mx-auto h-12 w-12 text-gold/40" />}
          title="Nenhuma seleção encontrada para essa rodada"
          description="Ainda não há partidas válidas e finalizadas suficientes para gerar a seleção da semana dessa rodada."
        />
      ) : (
        <div className="space-y-6">
          {/* Topo: campo + (MVP + destaques) lado a lado */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <WeeklyPitch payload={payload!} />
            <div className="space-y-4">
              <MvpHero mvp={payload!.mvp} />
              <WeeklyHighlights payload={payload!} />
            </div>
          </div>

          {/* Elenco completo em largura total, agrupado por posição */}
          <WeeklyPlayerGroups lineup={payload!.lineup} />
        </div>
      )}
    </div>
  );
}
