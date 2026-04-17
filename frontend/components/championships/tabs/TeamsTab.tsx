'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, EmptyState, Badge, Button } from '@/components/shared/ui';
import type { Enrollment, Championship } from '@/types';
import { Users, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { usePermissions } from '@/lib/hooks';
import { useAuthStore } from '@/lib/auth-store';
import { teamsAPI } from '@/lib/api';
import { EnrollmentModal } from '../EnrollmentModal';
import { PaymentPixModal } from '../PaymentPixModal';
import { formatDate } from '@/lib/utils/date';

interface TeamsTabProps {
  enrollments: Enrollment[];
  championship: Championship;
}

const statusConfig = {
  PENDING_PAYMENT: { label: 'Aguardando Pix', color: 'bg-warning/20 text-warning', icon: Clock },
  APPROVED: { label: 'Aprovado', color: 'bg-success/20 text-success', icon: CheckCircle },
  REJECTED: { label: 'Rejeitado', color: 'bg-error/20 text-error', icon: XCircle },
  CANCELLED: { label: 'Cancelado', color: 'bg-muted2/20 text-muted', icon: XCircle },
};

export function TeamsTab({ enrollments, championship }: TeamsTabProps) {
  const { canEnrollTeam } = usePermissions();
  const user = useAuthStore((state) => state.user);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [paymentModalId, setPaymentModalId] = useState<number | null>(null);

  const { data: myTeam } = useQuery({
    queryKey: ['my-team'],
    queryFn: () => teamsAPI.getMyTeam(),
    enabled: user?.user_type === 'TEAM_OWNER',
    staleTime: 30000,
  });

  if (enrollments.length === 0) {
    return (
      <>
        <EmptyState
          icon={<Users className="mx-auto h-14 w-14 text-gold/40" />}
          title="Nenhum time inscrito"
          description={
            championship.status === 'OPEN'
              ? 'Seja o primeiro a inscrever seu time neste campeonato!'
              : 'As inscrições ainda não foram abertas ou já foram encerradas.'
          }
          size="lg"
          action={
            championship.status === 'OPEN' && canEnrollTeam() ? (
              <Button onClick={() => setIsEnrollModalOpen(true)}>
                Inscrever Time
              </Button>
            ) : undefined
          }
        />
        
        <EnrollmentModal
          isOpen={isEnrollModalOpen}
          onClose={() => setIsEnrollModalOpen(false)}
          championship={championship}
        />
      </>
    );
  }

  // Separate approved and pending teams
  const approvedTeams = enrollments.filter((e) => e.status === 'APPROVED');
  const pendingTeams = enrollments.filter((e) => e.status === 'PENDING_PAYMENT');
  const otherTeams = enrollments.filter((e) => e.status !== 'APPROVED' && e.status !== 'PENDING_PAYMENT');

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">{approvedTeams.length}</h3>
              <p className="text-sm text-muted">Times Aprovados</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">{pendingTeams.length}</h3>
              <p className="text-sm text-muted">Aguardando Pagamento</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-brand/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-brand" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-text">{enrollments.length}</h3>
              <p className="text-sm text-muted">Total de Inscrições</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Approved Teams */}
      {approvedTeams.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-text mb-4">Times Confirmados</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {approvedTeams.map((enrollment) => {
              const status = statusConfig[enrollment.status];
              const StatusIcon = status.icon;

              return (
                <Card key={enrollment.id} className="p-6 hover:border-brand/30 transition-colors">
                  <div className="flex items-start gap-4">
                    {enrollment.team.logo ? (
                      <img
                        src={enrollment.team.logo}
                        alt={enrollment.team.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-stroke"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-brand to-brand2 flex items-center justify-center text-2xl">
                        🏆
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text truncate mb-1">
                        {enrollment.team.name}
                      </h3>
                      <p className="text-sm text-muted2 mb-2">{enrollment.team.abbreviation}</p>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted2">
                        <Calendar className="w-3 h-3" />
                        <span>Inscrito em {formatDate(enrollment.enrolled_at)}</span>
                      </div>

                      {enrollment.team.player_count > 0 && (
                        <div className="flex items-center gap-2 text-xs text-muted2 mt-1">
                          <Users className="w-3 h-3" />
                          <span>{enrollment.team.player_count} jogadores</span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Teams */}
      {pendingTeams.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-text mb-4">Aguardando Pagamento</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTeams.map((enrollment) => {
              const status = statusConfig[enrollment.status];
              const StatusIcon = status.icon;

              return (
                <Card
                  key={enrollment.id}
                  className="p-6 border-warning/20 bg-warning/5 hover:border-warning/30 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {enrollment.team.logo ? (
                      <img
                        src={enrollment.team.logo}
                        alt={enrollment.team.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-warning/30"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-warning/20 flex items-center justify-center text-2xl">
                        ⏳
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text truncate mb-1">
                        {enrollment.team.name}
                      </h3>
                      <p className="text-sm text-muted2 mb-2">{enrollment.team.abbreviation}</p>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted2">
                        <Calendar className="w-3 h-3" />
                        <span>Inscrito em {formatDate(enrollment.enrolled_at)}</span>
                      </div>

                      {myTeam?.id === enrollment.team.id && enrollment.payment?.id && (
                        <Button
                          variant="primary"
                          className="mt-4 w-full"
                          onClick={() => setPaymentModalId(enrollment.payment?.id || null)}
                        >
                          Pagar inscricao
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Other Teams (Rejected/Cancelled) */}
      {otherTeams.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-text mb-4">Outras Inscrições</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherTeams.map((enrollment) => {
              const status = statusConfig[enrollment.status];
              const StatusIcon = status.icon;

              return (
                <Card key={enrollment.id} className="p-6 opacity-60">
                  <div className="flex items-start gap-4">
                    {enrollment.team.logo ? (
                      <img
                        src={enrollment.team.logo}
                        alt={enrollment.team.name}
                        className="w-16 h-16 rounded-xl object-cover border-2 border-stroke grayscale"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-muted2/20 flex items-center justify-center text-2xl grayscale">
                        ❌
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-text truncate mb-1">
                        {enrollment.team.name}
                      </h3>
                      <p className="text-sm text-muted2 mb-2">{enrollment.team.abbreviation}</p>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted2">
                        <Calendar className="w-3 h-3" />
                        <span>Inscrito em {formatDate(enrollment.enrolled_at)}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <PaymentPixModal
        isOpen={!!paymentModalId}
        onClose={() => setPaymentModalId(null)}
        paymentId={paymentModalId}
        championshipId={championship.id}
      />
    </div>
  );
}
