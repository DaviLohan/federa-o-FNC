'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { championshipsAPI, paymentsAPI, teamsAPI } from '@/lib/api';
import { Modal, Button, useToast } from '@/components/shared/ui';
import { Trophy, Users, DollarSign, AlertCircle, Copy, CheckCircle2, QrCode } from 'lucide-react';
import type { Championship, Payment, Team } from '@/types';

interface EnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  championship: Championship;
}

export function EnrollmentModal({ isOpen, onClose, championship }: EnrollmentModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [checkoutPayment, setCheckoutPayment] = useState<Payment | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMyTeam();
      return;
    }

    setCheckoutPayment(null);
  }, [isOpen]);

  const loadMyTeam = async () => {
    try {
      setIsLoadingTeam(true);
      const team = await teamsAPI.getMyTeam();
      setMyTeam(team);
      setSelectedTeam(team.id);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setMyTeam(null);
      } else {
        showToast('Não foi possível carregar o seu time.', 'error');
      }
    } finally {
      setIsLoadingTeam(false);
    }
  };

  const paymentStatusQuery = useQuery({
    queryKey: ['payment-status', checkoutPayment?.id],
    queryFn: () => paymentsAPI.getStatus(checkoutPayment!.id),
    enabled: isOpen && !!checkoutPayment?.id,
    refetchInterval: (query) => (query.state.data?.status === 'PAID' ? false : 5000),
    staleTime: 3000,
  });

  useEffect(() => {
    if (paymentStatusQuery.data?.status !== 'PAID' || !checkoutPayment) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['championship', championship.id] });
    queryClient.invalidateQueries({ queryKey: ['enrollments', championship.id] });
    showToast('Pagamento confirmado! Seu time já está inscrito.', 'success');
    onClose();
    router.push(`/championships/${championship.id}`);
  }, [paymentStatusQuery.data?.status, checkoutPayment, championship.id, onClose, queryClient, router, showToast]);

  const enrollMutation = useMutation({
    mutationFn: (teamId: number) => championshipsAPI.enroll(championship.id, { team_id: teamId }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['championship', championship.id] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', championship.id] });

      if (!response.requires_payment || !response.payment) {
        showToast('Inscrição confirmada com sucesso!', 'success');
        onClose();
        router.push(`/championships/${championship.id}`);
        return;
      }

      setCheckoutPayment(response.payment);
      showToast('Pix gerado com sucesso. Aguarde a confirmação do pagamento.', 'success');
    },
    onError: (error: any) => {
      const data = error.response?.data;
      const gatewayError = data?.gateway_error;
      const message =
        data?.error ||
        data?.detail ||
        data?.non_field_errors?.[0] ||
        gatewayError?.message ||
        'Erro ao iniciar inscrição';
      showToast(message, 'error');
    },
  });

  const refreshPaymentMutation = useMutation({
    mutationFn: (paymentId: number) => paymentsAPI.refresh(paymentId),
    onSuccess: (payment) => {
      setCheckoutPayment(payment);
      queryClient.invalidateQueries({ queryKey: ['payment-status', payment.id] });
    },
    onError: () => showToast('Não foi possível atualizar o status do pagamento.', 'error'),
  });

  const currentPaymentStatus = paymentStatusQuery.data?.status || checkoutPayment?.status || 'PENDING';
  const pixImageSrc = useMemo(() => {
    if (!checkoutPayment?.pix_qr_code_base64) return null;
    return `data:image/png;base64,${checkoutPayment.pix_qr_code_base64}`;
  }, [checkoutPayment?.pix_qr_code_base64]);

  const handleEnroll = () => {
    if (!selectedTeam) {
      showToast('Selecione um time', 'warning');
      return;
    }
    enrollMutation.mutate(selectedTeam);
  };

  const handleCreateTeam = () => {
    router.push('/teams?create=true');
    onClose();
  };

  const handleCopyPix = async () => {
    if (!checkoutPayment?.pix_qr_code_text) return;
    await navigator.clipboard.writeText(checkoutPayment.pix_qr_code_text);
    showToast('Codigo Pix copiado.', 'success');
  };

  const formatCurrency = (value: string) => {
    const numValue = parseFloat(value);
    if (numValue === 0) return 'Gratuito';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(numValue);
  };

  const enrollmentFee = formatCurrency(championship.enrollment_fee);
  const prizePool = formatCurrency(championship.prize_pool);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={checkoutPayment ? 'Pagamento Pix' : 'Inscrever Time'}>
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-surface2 border border-border">
          <h3 className="font-heading font-bold text-lg text-text mb-4">{championship.name}</h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-gold" />
              </div>
              <div>
                <p className="text-xs text-muted">Premiação</p>
                <p className="text-sm font-semibold text-text">{prizePool}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted">Taxa de Inscrição</p>
                <p className="text-sm font-semibold text-text">{enrollmentFee}</p>
              </div>
            </div>
          </div>
        </div>

        {!checkoutPayment ? (
          <>
            {isLoadingTeam ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
                <p className="text-muted text-sm mt-2">Carregando seu time...</p>
              </div>
            ) : !myTeam ? (
              <div className="text-center py-8 space-y-4">
                <div className="text-5xl">👥</div>
                <div>
                  <h4 className="font-heading font-bold text-lg text-text mb-2">Você ainda não tem um time</h4>
                  <p className="text-muted text-sm mb-4">Crie seu time para poder se inscrever em campeonatos</p>
                </div>
                <Button variant="primary" onClick={handleCreateTeam}>
                  <Users className="w-4 h-4 mr-2" />
                  Criar Meu Time
                </Button>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-text mb-3">Seu Time</label>
                <div className="p-4 rounded-xl bg-surface2 border-2 border-gold">
                  <div className="flex items-center gap-4">
                    {myTeam.logo ? (
                      <img src={myTeam.logo} alt={myTeam.name} className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold to-gold2 flex items-center justify-center text-2xl">
                        ⚽
                      </div>
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-text">{myTeam.name}</h4>
                      <p className="text-xs text-muted">{myTeam.abbreviation} • {myTeam.player_count} jogadores</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
              <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted space-y-2">
                <p>Ao confirmar, o sistema gera um Pix e conclui a inscrição automaticamente quando o pagamento for aprovado.</p>
                {parseFloat(championship.enrollment_fee) > 0 && (
                  <p className="font-semibold text-text">Sem análise manual: o time entra no campeonato assim que o Pix for confirmado.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
              <Button variant="primary" onClick={handleEnroll} disabled={!myTeam || enrollMutation.isPending} className="flex-1">
                {enrollMutation.isPending ? 'Gerando Pix...' : 'Confirmar Inscrição'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-border bg-surface2 p-5 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-widest text-muted">Status do pagamento</p>
                  <p className="text-lg font-semibold text-text">
                    {currentPaymentStatus === 'PAID' && 'Pago'}
                    {currentPaymentStatus === 'PENDING' && 'Aguardando pagamento'}
                    {currentPaymentStatus === 'FAILED' && 'Falhou'}
                    {currentPaymentStatus === 'EXPIRED' && 'Expirado'}
                  </p>
                </div>
                {currentPaymentStatus === 'PAID' ? (
                  <CheckCircle2 className="w-8 h-8 text-success" />
                ) : (
                  <QrCode className="w-8 h-8 text-gold" />
                )}
              </div>

              {checkoutPayment.expires_at && (
                <p className="text-xs text-muted">
                  Expira em {new Date(checkoutPayment.expires_at).toLocaleString('pt-BR')}
                </p>
              )}

              {pixImageSrc && currentPaymentStatus === 'PENDING' && (
                <div className="flex justify-center">
                  <img src={pixImageSrc} alt="QR Code Pix" className="w-56 h-56 rounded-xl bg-white p-3" />
                </div>
              )}

              {checkoutPayment.pix_qr_code_text && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-text">Pix copia e cola</label>
                  <div className="rounded-xl border border-border bg-surface1 p-3 text-xs text-muted break-all">
                    {checkoutPayment.pix_qr_code_text}
                  </div>
                  <Button variant="ghost" onClick={handleCopyPix} className="w-full">
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar código Pix
                  </Button>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={onClose} className="flex-1">Fechar</Button>
              <Button
                variant="primary"
                onClick={() => refreshPaymentMutation.mutate(checkoutPayment.id)}
                disabled={refreshPaymentMutation.isPending || currentPaymentStatus === 'PAID'}
                className="flex-1"
              >
                {refreshPaymentMutation.isPending ? 'Atualizando...' : 'Atualizar status'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
