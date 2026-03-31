'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/shared/ui';
import { CreditCard, CheckCircle2, ShieldAlert, Trophy, Users } from 'lucide-react';
import type { Championship, Enrollment, Team } from '@/types';

interface EnrollmentActionCardProps {
  championship: Championship;
  myTeam: Team | null | undefined;
  myEnrollment?: Enrollment | null;
  userType?: string | null;
  onEnroll: () => void;
  onPay: () => void;
}

export function EnrollmentActionCard({
  championship,
  myTeam,
  myEnrollment,
  userType,
  onEnroll,
  onPay,
}: EnrollmentActionCardProps) {
  const router = useRouter();

  const enrollmentFee = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(championship.enrollment_fee || 0));

  const isOpen = championship.status === 'OPEN' && championship.is_enrollment_open;

  let title = 'Inscreva seu time';
  let description = 'Entre no campeonato e conclua o pagamento da inscrição por Pix.';
  let actionLabel = 'Inscrever meu time';
  let actionIcon = <Trophy className="w-4 h-4 mr-2" />;
  let action = onEnroll;
  let actionDisabled = !isOpen;
  let helperLabel = '';

  const statusLabel = championship.status === 'SCHEDULED' ? 'Status atual: Programado' : 'Aguardando abertura das inscricoes';

  if (!isOpen && !myTeam) {
    title = 'As inscricoes ainda nao estao abertas';
    description = 'Este campeonato ainda nao pode receber inscricoes, mas voce ja pode criar seu time para ficar pronto quando abrir.';
    actionLabel = 'Criar meu time';
    actionIcon = <Users className="w-4 h-4 mr-2" />;
    action = () => router.push('/teams?create=true');
    actionDisabled = false;
    helperLabel = statusLabel;
  } else if (!myTeam) {
    title = userType === 'TEAM_OWNER' ? 'Crie seu time para participar' : 'Voce precisa de um time para se inscrever';
    description = 'Sem um time cadastrado, nao e possivel concluir a inscricao nem gerar o pagamento Pix deste campeonato.';
    actionLabel = 'Criar meu time';
    actionIcon = <Users className="w-4 h-4 mr-2" />;
    action = () => router.push('/teams?create=true');
    actionDisabled = false;
  } else if (myEnrollment?.status === 'PENDING_PAYMENT') {
    title = 'Sua inscrição está aguardando pagamento';
    description = 'Seu time já iniciou a inscrição. Agora basta pagar o Pix para validar a entrada no campeonato.';
    actionLabel = 'Pagar inscrição';
    actionIcon = <CreditCard className="w-4 h-4 mr-2" />;
    action = onPay;
    actionDisabled = !myEnrollment.payment?.id;
    helperLabel = 'Inscricao iniciada, aguardando validacao do Pix';
  } else if (myEnrollment?.status === 'APPROVED') {
    title = 'Seu time já está confirmado';
    description = 'Pagamento validado e inscrição concluída. Seu time já aparece como confirmado neste campeonato.';
    actionLabel = 'Time inscrito';
    actionIcon = <CheckCircle2 className="w-4 h-4 mr-2" />;
    action = () => {};
    actionDisabled = true;
  } else if (!isOpen) {
    title = 'Inscrições indisponíveis no momento';
    description = championship.status === 'SCHEDULED'
      ? 'Este campeonato foi programado e abrira as inscricoes automaticamente na data configurada.'
      : 'As inscricoes ja foram encerradas ou o campeonato ja entrou em outra fase.';
    actionLabel = 'Inscrições indisponíveis';
    actionIcon = <ShieldAlert className="w-4 h-4 mr-2" />;
    helperLabel = statusLabel;
  } else {
    helperLabel = 'Inscricoes abertas para o seu time';
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-gold/20 bg-gradient-to-br from-gold/10 via-surface1 to-surface2 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,161,30,0.12),transparent_40%)]" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-3 max-w-3xl">
          <div className="inline-flex items-center rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gold">
            Inscricao do seu time
          </div>
          <div>
            <h3 className="text-2xl font-heading font-bold text-text">{title}</h3>
            <p className="mt-2 text-sm md:text-base text-muted leading-relaxed">{description}</p>
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {myTeam && (
              <span className="rounded-2xl border border-border/60 bg-surface1/80 px-4 py-2 text-text">
                Time: <strong>{myTeam.name}</strong>
              </span>
            )}
            <span className="rounded-2xl border border-border/60 bg-surface1/80 px-4 py-2 text-text">
              Taxa: <strong>{enrollmentFee}</strong>
            </span>
            {helperLabel && (
              <span className="rounded-2xl border border-border/60 bg-surface1/80 px-4 py-2 text-text">
                {helperLabel}
              </span>
            )}
          </div>
        </div>

        <div className="w-full lg:w-auto lg:min-w-[260px]">
          <Button
            variant={myEnrollment?.status === 'APPROVED' ? 'ghost' : 'primary'}
            className="w-full lg:min-w-[260px]"
            onClick={action}
            disabled={actionDisabled}
          >
            {actionIcon}
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
