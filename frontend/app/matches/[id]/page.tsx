'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { matchesAPI } from '@/lib/api';
import { Card, Badge, Button, Skeleton } from '@/components/shared/ui';
import { LineupDisplay } from '@/components/matches/LineupDisplay';
import { MatchScorecard } from '@/components/matches/MatchScorecard';
import { ReportStatusBar } from '@/components/matches/ReportStatusBar';
import { EAReportModal } from '@/components/championships/modals';
import { usePermissions } from '@/lib/hooks';
import { ArrowLeft, SearchX, Handshake, BarChart3 } from 'lucide-react';

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

  const { canReportMatch, canContestMatch } = usePermissions();
  const [eaReportingMatch, setEaReportingMatch] = useState(false);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(date);
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
          onReportManual={() => {}}
          onContest={() => {}}
        />
      </MatchScorecard>

      {/* Match Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card title="Informações">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
              <span className="text-muted">Data Agendada:</span>
              <span className="text-text font-semibold">{formatDate(match.scheduled_date)}</span>
            </div>
            {match.started_at && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Início Real:</span>
                <span className="text-text font-semibold">{formatDate(match.started_at)}</span>
              </div>
            )}
            {match.finished_at && (
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 py-2 border-b border-border">
                <span className="text-muted">Finalizada em:</span>
                <span className="text-text font-semibold">{formatDate(match.finished_at)}</span>
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

      {/* Statistics Placeholder */}
      {match.status === 'FINISHED' && (
        <Card title="Estatísticas da Partida">
          <div className="text-center py-12 space-y-3">
            <BarChart3 className="w-12 h-12 text-muted2 mx-auto" />
            <h3 className="text-lg font-semibold text-text">Estatísticas em breve</h3>
            <p className="text-muted text-sm max-w-md mx-auto">
              As estatísticas detalhadas desta partida serão exibidas aqui após o processamento do relatório EA Sports.
            </p>
          </div>
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
    </div>
  );
}
