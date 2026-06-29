'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { matchesAPI, statisticsAPI } from '@/lib/api';
import { Card, Badge, Button, Skeleton } from '@/components/shared/ui';
import { LineupDisplay } from '@/components/matches/LineupDisplay';
import { MatchScorecard } from '@/components/matches/MatchScorecard';
import { ReportStatusBar } from '@/components/matches/ReportStatusBar';
import { formatDateTimeLong } from '@/lib/utils/date';
import { EAReportModal } from '@/components/championships/modals';
import { MatchReportModal } from '@/components/championships/modals/MatchReportModal';
import { ContestationModal } from '@/components/championships/modals/ContestationModal';
import { usePermissions } from '@/lib/hooks';
import type { TeamPerformancePlayer } from '@/types';
import { ArrowLeft, SearchX, Handshake, BarChart3 } from 'lucide-react';

type MatchDetailedStats = {
  match_id: number;
  home_team: {
    id: number;
    name: string;
    score: number;
    cards: { yellow: number; red: number };
    has_advanced_data?: boolean;
    advanced_players?: number;
    lineup_players?: number;
    players?: TeamPerformancePlayer[];
  };
  away_team: {
    id: number;
    name: string;
    score: number;
    cards: { yellow: number; red: number };
    has_advanced_data?: boolean;
    advanced_players?: number;
    lineup_players?: number;
    players?: TeamPerformancePlayer[];
  };
  total_goals: number;
  total_cards: number;
};

function MatchPlayerStatsTable({ team }: { team: MatchDetailedStats['home_team'] }) {
  const players = team.players || [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="font-semibold text-text">{team.name}</h4>
          <p className="text-xs text-muted">{team.score} gol(s) | {players.length} jogador(es) no snapshot</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span className={`inline-flex items-center rounded-full border px-3 py-1 ${team.has_advanced_data ? 'border-gold/20 bg-gold/10 text-gold' : 'border-border bg-surface2'}`}>
            {team.advanced_players ?? 0} partidas com dados avançados
          </span>
          <span className="inline-flex items-center rounded-full border border-border bg-surface2 px-3 py-1">
            {team.lineup_players ?? 0} jogadores escalados
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="min-w-full divide-y divide-border bg-surface1 text-sm">
          <thead className="bg-surface2/80 text-xs uppercase tracking-wider text-muted">
            <tr>
              {['Jogador', 'Pos', 'PJ', 'Nota', 'Gols', 'Assistências', 'P. Certos', 'P. Errados', 'P%', 'Desarmamentos', 'Des. Errados', 'D%', 'Defesas'].map((label) => (
                <th key={label} className="px-4 py-3 text-left font-semibold">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {players.map((player) => (
              <tr key={`${player.player_id ?? player.player_name}`} className="hover:bg-surface2/60 transition-colors">
                <td className="px-4 py-3">
                  <div className="min-w-[180px]">
                    {player.player_id ? (
                      <Link
                        href={`/players/${player.player_id}`}
                        className="font-medium text-text transition-colors hover:text-gold"
                      >
                        {player.player_name}
                      </Link>
                    ) : (
                      <p className="font-medium text-text">{player.player_name}</p>
                    )}
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-muted">
                      {player.has_advanced_data ? (
                        <span className="rounded-full border border-gold/20 bg-gold/10 px-2 py-0.5 text-gold">EA</span>
                      ) : (
                        <span className="rounded-full border border-border bg-surface2 px-2 py-0.5">Básico</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-text">{player.position}</td>
                <td className="px-4 py-3 text-text">{player.matches_played}</td>
                <td className="px-4 py-3 text-text">{player.average_rating?.toFixed(2) ?? '—'}</td>
                <td className="px-4 py-3 font-semibold text-text">{player.goals}</td>
                <td className="px-4 py-3 text-text">{player.assists}</td>
                <td className="px-4 py-3 text-text">{player.passes_made}</td>
                <td className="px-4 py-3 text-text">{player.passes_missed}</td>
                <td className="px-4 py-3 text-text">{player.pass_accuracy?.toFixed(1) ?? '—'}{player.pass_accuracy !== null ? '%' : ''}</td>
                <td className="px-4 py-3 text-text">{player.tackles_made}</td>
                <td className="px-4 py-3 text-text">{player.tackles_missed}</td>
                <td className="px-4 py-3 text-text">{player.tackle_accuracy?.toFixed(1) ?? '—'}{player.tackle_accuracy !== null ? '%' : ''}</td>
                <td className="px-4 py-3 text-text">{player.saves}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function MatchDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = parseInt(params.id as string);

  // Fetch match details
  const { data: match, isLoading } = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesAPI.getById(matchId),
    enabled: !!matchId,
  });

  const { user, canReportMatch, canContestMatch } = usePermissions();
  const [eaReportingMatch, setEaReportingMatch] = useState(false);
  const [manualReportingMatch, setManualReportingMatch] = useState(false);
  const [contestingMatch, setContestingMatch] = useState(false);

  const isReported = Boolean(match?.report);

  const { data: matchStats, isLoading: isLoadingMatchStats } = useQuery<MatchDetailedStats>({
    queryKey: ['match-stats', matchId],
    queryFn: () => statisticsAPI.getMatchDetails(matchId) as Promise<MatchDetailedStats>,
    enabled: !!matchId && !!match && match.status === 'FINISHED' && isReported,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-16">
        <SearchX className="w-16 h-16 text-muted2 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-text mb-2">Partida não encontrada</h2>
        <p className="text-muted mb-6">Esta partida não existe ou foi removida.</p>
        <Button variant="primary" onClick={() => router.push('/matches')}>
          Voltar para Partidas
        </Button>
      </div>
    );
  }

  const getMatchTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'FRIENDLY': 'Amistoso',
      'CHAMPIONSHIP': 'Campeonato',
      'PLAYOFF': 'Playoff',
      'FINAL': 'Final',
    };
    return labels[type] || type;
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '-';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-muted hover:text-text"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text">Detalhes da Partida</h1>
          <p className="text-muted text-sm">#{match.id}</p>
        </div>
      </div>

      {/* Context Badges (championship, round, match type) */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="info">
          {getMatchTypeLabel(match.match_type)}
        </Badge>
        {match.championship && (
          <Badge variant="default">
            {match.championship.name}
          </Badge>
        )}
        {match.round_number && (
          <Badge variant="default">
            Rodada {match.round_number}
          </Badge>
        )}
      </div>

      {/* Match Scorecard with Report Actions */}
      <MatchScorecard match={match}>
        <ReportStatusBar
          match={match}
          canReport={canReportMatch(match)}
          canContest={canContestMatch(match)}
          onReportEA={() => setEaReportingMatch(true)}
          onReportManual={() => setManualReportingMatch(true)}
          onContest={() => setContestingMatch(true)}
        />
      </MatchScorecard>

      {/* Match Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card title="Informações">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
              <span className="text-muted">Data Agendada:</span>
              <span className="text-text font-semibold">{formatDateTimeLong(match.scheduled_date)}</span>
            </div>
            {match.started_at && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Início Real:</span>
                <span className="text-text font-semibold">{formatDateTimeLong(match.started_at)}</span>
              </div>
            )}
            {match.finished_at && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Finalizada em:</span>
                <span className="text-text font-semibold">{formatDateTimeLong(match.finished_at)}</span>
              </div>
            )}
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
              <span className="text-muted">Duração:</span>
              <span className="text-text font-semibold">{formatDuration(match.duration_minutes)}</span>
            </div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
              <span className="text-muted">Tipo de Partida:</span>
              <span className="text-text font-semibold">{getMatchTypeLabel(match.match_type)}</span>
            </div>
          </div>
        </Card>

        {/* Championship Info */}
        {match.championship && (
          <Card title="Campeonato">
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Nome:</span>
                <span className="text-text font-semibold">{match.championship.name}</span>
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Tipo:</span>
                <span className="text-text font-semibold">
                  {match.championship.championship_type === 'LEAGUE' ? 'Liga' : 'Eliminatória'}
                </span>
              </div>
              {match.round_number && (
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                  <span className="text-muted">Rodada:</span>
                  <span className="text-text font-semibold">{match.round_number}</span>
                </div>
              )}
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2">
                <span className="text-muted">Prêmio:</span>
                <span className="text-warning font-semibold">
                  R$ {parseFloat(match.championship.prize_pool).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* Friendly Match Info */}
        {match.match_type === 'FRIENDLY' && !match.championship && (
          <Card title="Partida Amistosa">
            <div className="text-center py-8 space-y-3">
              <Handshake className="w-10 h-10 text-muted2 mx-auto" />
              <p className="text-muted">Esta é uma partida amistosa</p>
              <p className="text-muted2 text-sm">
                Partidas amistosas não contam para campeonatos
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Escalação Tática */}
      {match.status !== 'CANCELLED' && (
        <Card title="Escalação Tática">
          <LineupDisplay matchId={match.id} />
        </Card>
      )}

      {/* Match Statistics */}
      {match.status === 'FINISHED' && (
        <Card title="Estatísticas da Partida">
          {!isReported ? (
            <div className="text-center py-12 space-y-3">
              <BarChart3 className="w-12 h-12 text-muted2 mx-auto" />
              <h3 className="text-lg font-semibold text-text">Aguardando reporte</h3>
              <p className="text-muted text-sm max-w-md mx-auto">
                As estatísticas detalhadas serão exibidas após o reporte da partida.
              </p>
            </div>
          ) : isLoadingMatchStats ? (
            <div className="py-6 space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !matchStats ? (
            <div className="text-center py-12 space-y-3">
              <BarChart3 className="w-12 h-12 text-muted2 mx-auto" />
              <h3 className="text-lg font-semibold text-text">Sem estatísticas disponíveis</h3>
              <p className="text-muted text-sm max-w-md mx-auto">
                A partida foi reportada, mas ainda não há eventos detalhados registrados.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              <MatchPlayerStatsTable team={matchStats.home_team} />
              <MatchPlayerStatsTable team={matchStats.away_team} />

              <div className="rounded-xl border border-border p-4">
                <h4 className="font-semibold text-text mb-3">Resumo da Partida</h4>
                <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                  <div className="flex justify-between"><span className="text-muted">Total de gols</span><span className="text-text font-semibold">{matchStats.total_goals}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Total de cartões</span><span className="text-text font-semibold">{matchStats.total_cards}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Jogadores avançados</span><span className="text-text font-semibold">{(matchStats.home_team.advanced_players ?? 0) + (matchStats.away_team.advanced_players ?? 0)}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Escalações registradas</span><span className="text-text font-semibold">{(matchStats.home_team.lineup_players ?? 0) + (matchStats.away_team.lineup_players ?? 0)}</span></div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="ghost"
          onClick={() => router.push('/matches')}
          className="flex-1"
        >
          Voltar para Partidas
        </Button>

        {match.championship && (
          <Button
            variant="secondary"
            onClick={() => router.push(`/championships/${match.championship!.id}`)}
            className="flex-1"
          >
            Ver Campeonato
          </Button>
        )}
      </div>

      {/* EA Report Modal */}
      {match && eaReportingMatch && (
        <EAReportModal
          match={match}
          isOpen={true}
          onClose={() => setEaReportingMatch(false)}
        />
      )}

      {/* Reporte manual (súmula com placar + screenshot) */}
      {match && manualReportingMatch && (
        <MatchReportModal
          match={match}
          isOpen={true}
          onClose={() => setManualReportingMatch(false)}
        />
      )}

      {/* Contestação de resultado */}
      {match && contestingMatch && (
        <ContestationModal
          match={match}
          teamId={
            user && match.away_team.owner.id === user.id ? match.away_team.id : match.home_team.id
          }
          isOpen={true}
          onClose={() => setContestingMatch(false)}
        />
      )}
    </div>
  );
}
