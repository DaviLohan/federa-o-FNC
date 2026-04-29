'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Badge, Skeleton, Button } from '@/components/shared/ui';
import { contestationsAPI } from '@/lib/api';
import { usePermissions } from '@/lib/hooks';
import { AlertCircle, CheckCircle, Clock, ExternalLink, XCircle, ClipboardList } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';

interface ReportsTabProps {
  championshipId: number;
}

const statusConfig = {
  PENDING: { label: 'Pendente', color: 'bg-warning/20 text-warning', icon: Clock },
  UNDER_REVIEW: { label: 'Em Análise', color: 'bg-brand/20 text-brand', icon: AlertCircle },
  ACCEPTED: { label: 'Aceita', color: 'bg-success/20 text-success', icon: CheckCircle },
  REJECTED: { label: 'Rejeitada', color: 'bg-error/20 text-error', icon: XCircle },
};

const reasonLabels = {
  WRONG_SCORE: 'Placar Incorreto',
  MISSING_PLAYER: 'Jogador Ausente na Súmula',
  FAKE_SCREENSHOT: 'Screenshot Falso',
  OPPONENT_QUIT: 'Adversário Saiu da Partida',
  CONNECTION_ISSUE: 'Problema de Conexão',
  OTHER: 'Outro',
};

export function ReportsTab({ championshipId }: ReportsTabProps) {
  const { canManageChampionships } = usePermissions();

  // Fetch contestations for this championship
  const { data: contestationsData, isLoading } = useQuery({
    queryKey: ['contestations', championshipId],
    queryFn: () => contestationsAPI.getAll({ championship: championshipId }),
  });

  const contestations = contestationsData?.results || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (contestations.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="mx-auto h-14 w-14 text-gold/40" />}
        title="Nenhuma contestação registrada"
        description="As contestações de partidas aparecerão aqui quando forem criadas pelos times."
        size="lg"
      />
    );
  }

  // Group by status
  const pendingContestations = contestations.filter((c) => c.status === 'PENDING');
  const reviewingContestations = contestations.filter((c) => c.status === 'UNDER_REVIEW');
  const resolvedContestations = contestations.filter(
    (c) => c.status === 'ACCEPTED' || c.status === 'REJECTED'
  );

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">{pendingContestations.length}</h3>
              <p className="text-sm text-muted">Pendentes</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">{reviewingContestations.length}</h3>
              <p className="text-sm text-muted">Em Análise</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">
                {contestations.filter((c) => c.status === 'ACCEPTED').length}
              </h3>
              <p className="text-sm text-muted">Aceitas</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-error/10 flex items-center justify-center">
              <XCircle className="w-6 h-6 text-error" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">
                {contestations.filter((c) => c.status === 'REJECTED').length}
              </h3>
              <p className="text-sm text-muted">Rejeitadas</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending & Under Review */}
      {(pendingContestations.length > 0 || reviewingContestations.length > 0) && (
        <div>
          <h2 className="text-xl font-bold text-text mb-4">Aguardando Ação</h2>
          <div className="space-y-4">
            {[...pendingContestations, ...reviewingContestations].map((contestation) => {
              const status = statusConfig[contestation.status];
              const StatusIcon = status.icon;

              return (
                <Card
                  key={contestation.id}
                  className="p-6 border-warning/20 bg-warning/5 hover:border-warning/30 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Match Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                         <h3 className="font-bold text-text mb-1">
                             {contestation.match.home_team.name} {contestation.match.home_score} ×{' '}
                             {contestation.match.away_score} {contestation.match.away_team.name}
                           </h3>
                           <p className="text-sm text-muted2">
                             Partida realizada em{' '}
                             {formatDateTime(contestation.match.scheduled_date)}
                           </p>
                         </div>
                         <Badge className={status.color}>
                           <StatusIcon className="w-3 h-3 mr-1" />
                           {status.label}
                         </Badge>
                       </div>

                       <div className="bg-panel2 rounded-xl p-4 mb-4">
                         <div className="flex items-start gap-3 mb-3">
                          <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-text mb-1">
                              {reasonLabels[contestation.reason as keyof typeof reasonLabels]}
                            </p>
                            <p className="text-sm text-muted">{contestation.description}</p>
                          </div>
                        </div>

                        {contestation.evidence && (
                          <div className="mt-3 pt-3 border-t border-stroke">
                            <a
                              href={contestation.evidence}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand hover:underline"
                            >
                              Ver evidência anexada →
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted2">
                        <span>
                          Contestado por: <strong className="text-text">{contestation.contested_by.full_name}</strong>
                        </span>
                        <span>•</span>
                        <span>Time: <strong className="text-text">{contestation.team.name}</strong></span>
                        <span>•</span>
                        <span>{formatDateTime(contestation.created_at)}</span>
                      </div>
                    </div>

                    {/* Actions for Admins */}
                    {canManageChampionships && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        <Link href={`/admin/partidas?status=CONTESTED&match=${contestation.match.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Abrir no Painel Administrativo
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Resolved */}
      {resolvedContestations.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-text mb-4">Resolvidas</h2>
          <div className="space-y-4">
            {resolvedContestations.map((contestation) => {
              const status = statusConfig[contestation.status];
              const StatusIcon = status.icon;

              return (
                <Card key={contestation.id} className="p-6 opacity-80">
                  <div className="flex flex-col lg:flex-row gap-6">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                         <h3 className="font-bold text-text mb-1">
                             {contestation.match.home_team.name} {contestation.match.home_score} ×{' '}
                             {contestation.match.away_score} {contestation.match.away_team.name}
                           </h3>
                           <p className="text-sm text-muted2">
                             Partida realizada em{' '}
                             {formatDateTime(contestation.match.scheduled_date)}
                           </p>
                         </div>
                         <Badge className={status.color}>
                           <StatusIcon className="w-3 h-3 mr-1" />
                           {status.label}
                         </Badge>
                       </div>

                       <div className="bg-panel2 rounded-xl p-4 mb-4">
                         <p className="text-sm font-semibold text-text mb-1">
                          {reasonLabels[contestation.reason as keyof typeof reasonLabels]}
                        </p>
                        <p className="text-sm text-muted mb-3">{contestation.description}</p>

                        {contestation.response && (
                          <div className="mt-3 pt-3 border-t border-stroke">
                            <p className="text-xs text-muted2 mb-1">Resposta do administrador:</p>
                            <p className="text-sm text-text">{contestation.response}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted2">
                        <span>
                          Contestado por: <strong>{contestation.contested_by.full_name}</strong>
                        </span>
                        {contestation.reviewed_by && (
                          <>
                            <span>•</span>
                            <span>
                              Revisado por: <strong>{contestation.reviewed_by.full_name}</strong>
                            </span>
                          </>
                        )}
                        {contestation.reviewed_at && (
                          <>
                            <span>•</span>
                            <span>{formatDateTime(contestation.reviewed_at)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
