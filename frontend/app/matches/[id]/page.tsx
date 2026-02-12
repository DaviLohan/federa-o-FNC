'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { matchesAPI } from '@/lib/api';
import { Card, Badge, Button, Skeleton } from '@/components/shared/ui';

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
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-semibold text-text mb-2">Partida não encontrada</h2>
        <p className="text-muted mb-6">Esta partida não existe ou foi removida.</p>
        <Button variant="primary" onClick={() => router.push('/matches')}>
          Voltar para Partidas
        </Button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'SCHEDULED': 'default',
      'IN_PROGRESS': 'info',
      'FINISHED': 'success',
      'CANCELLED': 'error',
      'CONTESTED': 'warning',
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
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Button>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text">Detalhes da Partida</h1>
          <p className="text-muted">#{match.id}</p>
        </div>
      </div>

      {/* Match Header Card */}
      <Card>
        <div className="space-y-6">
          {/* Status and Type Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={getStatusBadge(match.status)}>
              {getStatusLabel(match.status)}
            </Badge>
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

          {/* Teams and Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* Home Team */}
            <div className="text-center md:text-right space-y-2">
              <div className="flex items-center justify-center md:justify-end gap-3">
                {match.home_team.logo && (
                  <img
                    src={match.home_team.logo}
                    alt={match.home_team.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div>
                  <h2 className="text-2xl font-bold text-text">{match.home_team.name}</h2>
                  <p className="text-muted text-sm">{match.home_team.abbreviation}</p>
                </div>
              </div>
              {match.winner?.id === match.home_team.id && (
                <Badge variant="success" className="inline-flex">
                  🏆 Vencedor
                </Badge>
              )}
            </div>

            {/* Score */}
            <div className="text-center">
              {match.status === 'FINISHED' ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-4">
                    <span className="text-6xl font-bold text-text">{match.home_score}</span>
                    <span className="text-3xl text-muted">×</span>
                    <span className="text-6xl font-bold text-text">{match.away_score}</span>
                  </div>
                  {match.is_draw && (
                    <Badge variant="warning" className="text-xs">
                      Empate
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="text-3xl text-muted">VS</div>
              )}
            </div>

            {/* Away Team */}
            <div className="text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <div className="md:order-2">
                  <h2 className="text-2xl font-bold text-text">{match.away_team.name}</h2>
                  <p className="text-muted text-sm">{match.away_team.abbreviation}</p>
                </div>
                {match.away_team.logo && (
                  <img
                    src={match.away_team.logo}
                    alt={match.away_team.name}
                    className="w-16 h-16 rounded-full object-cover md:order-1"
                  />
                )}
              </div>
              {match.winner?.id === match.away_team.id && (
                <Badge variant="success" className="inline-flex">
                  🏆 Vencedor
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Match Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <Card title="Informações">
          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted">Data Agendada:</span>
              <span className="text-text font-semibold">{formatDate(match.scheduled_date)}</span>
            </div>
            {match.started_at && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Início Real:</span>
                <span className="text-text font-semibold">{formatDate(match.started_at)}</span>
              </div>
            )}
            {match.finished_at && (
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Finalizada em:</span>
                <span className="text-text font-semibold">{formatDate(match.finished_at)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted">Duração:</span>
              <span className="text-text font-semibold">{formatDuration(match.duration_minutes)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted">Tipo de Partida:</span>
              <span className="text-text font-semibold">{getMatchTypeLabel(match.match_type)}</span>
            </div>
          </div>
        </Card>

        {/* Championship Info */}
        {match.championship && (
          <Card title="Campeonato">
            <div className="space-y-4">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Nome:</span>
                <span className="text-text font-semibold">{match.championship.name}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted">Tipo:</span>
                <span className="text-text font-semibold">
                  {match.championship.championship_type === 'LEAGUE' ? 'Liga' : 'Eliminatória'}
                </span>
              </div>
              {match.round_number && (
                <div className="flex justify-between py-2 border-b border-border">
                  <span className="text-muted">Rodada:</span>
                  <span className="text-text font-semibold">{match.round_number}</span>
                </div>
              )}
              <div className="flex justify-between py-2">
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
            <div className="text-center py-8 space-y-2">
              <div className="text-4xl">🤝</div>
              <p className="text-muted">Esta é uma partida amistosa</p>
              <p className="text-muted2 text-sm">
                Partidas amistosas não contam para campeonatos
              </p>
            </div>
          </Card>
        )}
      </div>

      {/* Statistics Placeholder */}
      {match.status === 'FINISHED' && (
        <Card title="Estatísticas da Partida">
          <div className="text-center py-12 space-y-3">
            <div className="text-5xl">📊</div>
            <h3 className="text-lg font-semibold text-text">Estatísticas em breve</h3>
            <p className="text-muted text-sm">
              Artilheiros, assistências e eventos da partida serão exibidos aqui
            </p>
          </div>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push('/matches')}
            className="flex-1"
          >
            Voltar para Partidas
          </Button>
          {match.championship && (
            <Button
              variant="primary"
              onClick={() => router.push(`/championships`)}
              className="flex-1"
            >
              Ver Campeonato
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
