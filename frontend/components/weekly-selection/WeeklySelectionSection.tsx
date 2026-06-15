'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download, ShieldAlert, Star, Trophy } from 'lucide-react';

import { championshipsAPI, statisticsAPI } from '@/lib/api';
import { FORMATION_POSITIONS } from '@/lib/formations';
import type { Championship, WeeklySelectionPayload, WeeklySelectionPlayer } from '@/types';
import { Badge, Button, Card, EmptyState, PageHeader, Select, Skeleton } from '@/components/shared/ui';

type PitchSlot = {
  key: string;
  label: string;
  x: number;
  y: number;
  player: WeeklySelectionPlayer | null;
};

const FORMATION = '3-5-2';

function inferGroup(position: string): 'GK' | 'DEF' | 'MID' | 'ATT' {
  const pos = (position || '').toUpperCase();
  if (pos === 'GK') return 'GK';
  if (['CB', 'RB', 'LB', 'RWB', 'LWB', 'DEF', 'SW'].includes(pos)) return 'DEF';
  if (['ST', 'CF', 'RW', 'LW', 'ATT', 'FWD'].includes(pos)) return 'ATT';
  return 'MID';
}

function buildPitchSlots(payload: WeeklySelectionPayload | undefined): PitchSlot[] {
  const slots = FORMATION_POSITIONS[FORMATION];
  const grouped = {
    GK: [...(payload?.lineup.GK || [])],
    DEF: [...(payload?.lineup.DEF || [])],
    MID: [...(payload?.lineup.MID || [])],
    ATT: [...(payload?.lineup.ATT || [])],
  };

  return slots.map((slot, index) => {
    const group = inferGroup(slot.position);
    const player = grouped[group].shift() || null;
    return {
      key: `${slot.position}-${index}`,
      label: slot.position,
      x: slot.x,
      y: slot.y,
      player,
    };
  });
}

function buildSelectionSvg(payload: WeeklySelectionPayload): string {
  const slots = buildPitchSlots(payload);
  const escape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const playerNodes = slots.map((slot) => {
    const x = 90 + slot.x * 8.2;
    const y = 115 + slot.y * 5.3;
    const fill = slot.player?.is_mvp ? '#D6A11E' : '#0B0F16';
    const stroke = slot.player?.is_mvp ? '#F3D36B' : 'rgba(255,255,255,0.12)';
    const playerName = slot.player ? escape(slot.player.player_name) : slot.label;
    const teamName = slot.player ? escape(slot.player.team_name) : '';
    const rating = slot.player ? slot.player.average_rating.toFixed(2) : '';
    return `
      <g transform="translate(${x}, ${y})">
        <circle cx="0" cy="0" r="34" fill="${fill}" stroke="${stroke}" stroke-width="3" />
        <text x="0" y="-4" fill="#FFFFFF" text-anchor="middle" font-size="12" font-family="Inter, Arial" font-weight="700">${playerName}</text>
        <text x="0" y="14" fill="rgba(255,255,255,0.75)" text-anchor="middle" font-size="10" font-family="Inter, Arial">${teamName}</text>
        <text x="0" y="31" fill="#F3D36B" text-anchor="middle" font-size="11" font-family="Inter, Arial" font-weight="700">${rating}</text>
      </g>`;
  }).join('');

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07090D" />
        <stop offset="100%" stop-color="#0D1422" />
      </linearGradient>
    </defs>
    <rect width="1080" height="1350" fill="url(#bg)" />
    <text x="540" y="90" fill="#FFFFFF" text-anchor="middle" font-size="46" font-family="Inter, Arial" font-weight="800">Seleção da Semana</text>
    <text x="540" y="135" fill="#D6A11E" text-anchor="middle" font-size="24" font-family="Inter, Arial" font-weight="700">${escape(payload.championship.name)} • Rodada ${payload.round_number} • ${payload.formation}</text>
    <rect x="80" y="190" width="920" height="760" rx="32" fill="#0B0F16" stroke="rgba(255,255,255,0.08)" />
    <rect x="120" y="230" width="840" height="680" rx="32" fill="#0D5B30" stroke="rgba(255,255,255,0.10)" />
    <rect x="160" y="270" width="760" height="600" rx="28" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="3" />
    <line x1="540" y1="270" x2="540" y2="870" stroke="rgba(255,255,255,0.09)" stroke-width="3" />
    <circle cx="540" cy="570" r="70" fill="none" stroke="rgba(255,255,255,0.09)" stroke-width="3" />
    ${playerNodes}
    <rect x="80" y="990" width="920" height="220" rx="28" fill="#0B0F16" stroke="rgba(214,161,30,0.18)" />
    <text x="120" y="1045" fill="#FFFFFF" font-size="26" font-family="Inter, Arial" font-weight="700">MVP da Rodada</text>
    <text x="120" y="1090" fill="#D6A11E" font-size="36" font-family="Inter, Arial" font-weight="800">${escape(payload.mvp?.player_name || '—')}</text>
    <text x="120" y="1130" fill="rgba(255,255,255,0.75)" font-size="20" font-family="Inter, Arial">${escape(payload.mvp?.team_name || '')} • ${payload.mvp?.position || ''}</text>
    <text x="120" y="1170" fill="#FFFFFF" font-size="18" font-family="Inter, Arial">Nota ${payload.mvp?.average_rating?.toFixed(2) || '—'} • Gols ${payload.mvp?.goals || 0} • Assist. ${payload.mvp?.assists || 0}</text>
    <text x="540" y="1290" fill="rgba(255,255,255,0.55)" text-anchor="middle" font-size="20" font-family="Inter, Arial">Pro Eleven Platform • Onde o talento vira legado</text>
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
    <div className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-surface1 p-4 md:grid-cols-4">
      <Select
        label="Campeonato"
        value={championshipId}
        onChange={(e) => onChampionshipChange(e.target.value)}
        options={[
          { value: '', label: 'Selecione' },
          ...championships.map((championship) => ({ value: String(championship.id), label: championship.name })),
        ]}
      />
      <Select
        label="Rodada"
        value={roundNumber}
        onChange={(e) => onRoundChange(e.target.value)}
        options={[
          { value: '', label: 'Automática' },
          ...rounds.map((round) => ({ value: String(round), label: `Rodada ${round}` })),
        ]}
      />
      <div className="rounded-2xl border border-stroke bg-panel2 px-4 py-3">
        <p className="text-sm font-medium text-muted">Período</p>
        <p className="mt-2 text-base font-semibold text-text">Rodada do campeonato</p>
      </div>
      <div className="rounded-2xl border border-stroke bg-panel2 px-4 py-3">
        <p className="text-sm font-medium text-muted">Formação</p>
        <p className="mt-2 text-base font-semibold text-gold">3-5-2</p>
      </div>
    </div>
  );
}

function WeeklyPitch({ payload }: { payload: WeeklySelectionPayload }) {
  const slots = buildPitchSlots(payload);

  return (
    <Card className="overflow-hidden border-border bg-surface1 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-text">Campo Tático</h2>
          <p className="text-sm text-muted">Formação oficial da seleção da semana</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">{payload.championship.name}</Badge>
          <Badge variant="default">Rodada {payload.round_number}</Badge>
          <Badge variant="success">3-5-2</Badge>
        </div>
      </div>

      <div className="relative min-h-[720px] rounded-[32px] border border-white/5 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.20),transparent_30%),linear-gradient(180deg,#0B5F2E_0%,#0A4724_100%)] p-6">
        <div className="absolute inset-6 rounded-[28px] border border-white/10" />
        <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-white/10" />
        <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
        <div className="absolute inset-0">
          {slots.map((slot) => (
            <div
              key={slot.key}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
            >
              <div className={`w-32 rounded-2xl border px-3 py-2 text-center shadow-xl backdrop-blur ${slot.player?.is_mvp ? 'border-gold bg-gold/15 shadow-gold/20' : 'border-white/10 bg-[#0B0F16]/82'}`}>
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted">{slot.label}</p>
                <p className="mt-1 text-sm font-semibold text-text line-clamp-2">{slot.player?.player_name || '—'}</p>
                <p className="mt-1 text-[11px] text-muted line-clamp-1">{slot.player?.team_name || 'Aguardando'}</p>
                <div className="mt-2 flex items-center justify-center gap-2 text-[11px] text-muted2">
                  <span className="rounded-full bg-white/5 px-2 py-0.5">Nota {slot.player?.average_rating?.toFixed(2) ?? '—'}</span>
                  {slot.player?.is_mvp && <span className="rounded-full bg-gold px-2 py-0.5 font-semibold text-black">MVP</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function WeeklySelectionPlayerList({ players, mvp }: { players: WeeklySelectionPlayer[]; mvp: WeeklySelectionPlayer | null }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_1fr]">
      <Card className="border-border bg-surface1 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-gold/20 bg-gold/10 p-3 text-gold">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted">MVP da rodada</p>
            <h3 className="text-2xl font-bold text-text">{mvp?.player_name || '—'}</h3>
            <p className="text-sm text-muted2">{mvp?.team_name || ''} • {mvp?.position || ''}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            ['Nota', mvp?.average_rating?.toFixed(2) || '—'],
            ['Gols', String(mvp?.goals || 0)],
            ['Assistências', String(mvp?.assists || 0)],
            ['Partidas', String(mvp?.matches_played || 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-panel2 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted2">{label}</p>
              <p className="mt-2 text-xl font-semibold text-text">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {players.map((player) => (
          <Card key={`${player.team_id}-${player.player_name}`} className={`border-border bg-surface1 p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl ${player.is_mvp ? 'border-gold/30 shadow-gold/10' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-text">{player.player_name}</h4>
                  {player.is_mvp && (
                    <Badge variant="warning" className="!rounded-full">
                      <Star className="mr-1 h-3 w-3" /> MVP
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm text-muted2">{player.team_name}</p>
              </div>
              <Badge variant="default">{player.position}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-panel2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Nota</p>
                <p className="mt-1 font-semibold text-text">{player.average_rating.toFixed(2)}</p>
              </div>
              <div className="rounded-2xl bg-panel2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Gols</p>
                <p className="mt-1 font-semibold text-text">{player.goals}</p>
              </div>
              <div className="rounded-2xl bg-panel2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Assistências</p>
                <p className="mt-1 font-semibold text-text">{player.assists}</p>
              </div>
              <div className="rounded-2xl bg-panel2 px-3 py-2">
                <p className="text-xs uppercase tracking-[0.18em] text-muted2">Partidas</p>
                <p className="mt-1 font-semibold text-text">{player.matches_played}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface WeeklySelectionSectionProps {
  embedded?: boolean;
}

export function WeeklySelectionSection({ embedded = false }: WeeklySelectionSectionProps) {
  const [selectedChampionshipId, setSelectedChampionshipId] = useState('');
  const [selectedRound, setSelectedRound] = useState('');
  const artRef = useRef<HTMLDivElement | null>(null);

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
    queryFn: () => statisticsAPI.getWeeklySelection(Number(selectedChampionshipId), selectedRound ? Number(selectedRound) : undefined),
    enabled: !!selectedChampionshipId,
  });

  const payload = weeklySelectionQuery.data as WeeklySelectionPayload | undefined;
  const availableRounds = payload?.available_rounds ?? [];

  useEffect(() => {
    if (!selectedRound && payload?.round_number) {
      setSelectedRound(String(payload.round_number));
    }
  }, [payload?.round_number, selectedRound]);

  return (
    <div className="space-y-6">
      {!embedded && (
        <PageHeader
          title="Seleção da Semana"
          subtitle="Os melhores jogadores da rodada em uma formação oficial 3-5-2, pronta para divulgação."
          actions={
            <Button
              onClick={() => payload && downloadSelectionSvg(payload)}
              disabled={!payload || payload.players.length === 0}
            >
              <Download className="h-4 w-4" />
              Baixar Arte
            </Button>
          }
        />
      )}

      {embedded && payload && payload.players.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => downloadSelectionSvg(payload)}
            disabled={!payload || payload.players.length === 0}
          >
            <Download className="h-4 w-4" />
            Baixar Arte
          </Button>
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
        <div className="space-y-4">
          <Skeleton className="h-[120px] rounded-3xl" />
          <Skeleton className="h-[780px] rounded-3xl" />
          <Skeleton className="h-[360px] rounded-3xl" />
        </div>
      ) : weeklySelectionQuery.isError ? (
        <EmptyState
          icon={<ShieldAlert className="mx-auto h-12 w-12 text-gold/40" />}
          title="Não foi possível carregar a seleção da semana"
          description="Verifique o campeonato e a rodada escolhida ou tente novamente em instantes."
        />
      ) : !payload || payload.players.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="mx-auto h-12 w-12 text-gold/40" />}
          title="Nenhuma seleção encontrada para essa rodada"
          description="Ainda não há partidas válidas e finalizadas suficientes para gerar a seleção da semana dessa rodada."
        />
      ) : (
        <div ref={artRef} className="space-y-6">
          <WeeklyPitch payload={payload} />
          <WeeklySelectionPlayerList players={payload.players} mvp={payload.mvp} />
        </div>
      )}
    </div>
  );
}
