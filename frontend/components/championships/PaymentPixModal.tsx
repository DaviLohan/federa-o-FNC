'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { paymentsAPI } from '@/lib/api';
import { Modal, Button, useToast } from '@/components/shared/ui';
import { CheckCircle2, Copy, QrCode } from 'lucide-react';
import { formatDateTimeShort } from '@/lib/utils/date';

interface PaymentPixModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId: number | null;
  championshipId: number;
}

export function PaymentPixModal({ isOpen, onClose, paymentId, championshipId }: PaymentPixModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const paymentQuery = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: () => paymentsAPI.getById(paymentId!),
    enabled: isOpen && !!paymentId,
    staleTime: 3000,
  });

  const paymentStatusQuery = useQuery({
    queryKey: ['payment-status', paymentId],
    queryFn: () => paymentsAPI.getStatus(paymentId!),
    enabled: isOpen && !!paymentId,
    refetchInterval: (query) => (query.state.data?.status === 'PAID' ? false : 5000),
    staleTime: 3000,
  });

  useEffect(() => {
    if (paymentStatusQuery.data?.status !== 'PAID' || !paymentId) {
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['championship', championshipId] });
    queryClient.invalidateQueries({ queryKey: ['enrollments', championshipId] });
    showToast('Pagamento confirmado! Seu time já está inscrito.', 'success');
    onClose();
    router.refresh();
  }, [championshipId, onClose, paymentId, paymentStatusQuery.data?.status, queryClient, router, showToast]);

  const refreshPaymentMutation = useMutation({
    mutationFn: (id: number) => paymentsAPI.refresh(id),
    onSuccess: (payment) => {
      queryClient.setQueryData(['payment', payment.id], payment);
      queryClient.invalidateQueries({ queryKey: ['payment-status', payment.id] });
      queryClient.invalidateQueries({ queryKey: ['championship', championshipId] });
    },
    onError: () => showToast('Não foi possível atualizar o status do pagamento.', 'error'),
  });

  const payment = paymentQuery.data;
  const currentPaymentStatus = paymentStatusQuery.data?.status || payment?.status || 'PENDING';
  const pixImageSrc = useMemo(() => {
    if (!payment?.pix_qr_code_base64) return null;
    return `data:image/png;base64,${payment.pix_qr_code_base64}`;
  }, [payment?.pix_qr_code_base64]);

  const handleCopyPix = async () => {
    if (!payment?.pix_qr_code_text) return;
    await navigator.clipboard.writeText(payment.pix_qr_code_text);
    showToast('Codigo Pix copiado.', 'success');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Pagamento Pix">
      {!payment ? (
        <div className="py-10 text-center text-sm text-muted">Carregando pagamento...</div>
      ) : (
        <div className="space-y-6">
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
                <p className="mt-1 text-sm text-muted">{payment.championship_name}</p>
              </div>
              {currentPaymentStatus === 'PAID' ? (
                <CheckCircle2 className="w-8 h-8 text-success" />
              ) : (
                <QrCode className="w-8 h-8 text-gold" />
              )}
            </div>

            <div className="rounded-2xl border border-gold/15 bg-gold/5 px-4 py-3">
              <p className="text-xs uppercase tracking-widest text-gold/70">Valor da inscricao</p>
              <p className="mt-1 text-2xl font-bold text-gold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(payment.amount))}
              </p>
            </div>

            {payment.expires_at && (
              <p className="text-xs text-muted">
                Expira em {formatDateTimeShort(payment.expires_at)}
              </p>
            )}

            {pixImageSrc && currentPaymentStatus === 'PENDING' && (
              <div className="flex justify-center">
                <img src={pixImageSrc} alt="QR Code Pix" className="w-56 h-56 rounded-xl bg-white p-3" />
              </div>
            )}

            {payment.pix_qr_code_text && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-text">Pix copia e cola</label>
                <div className="rounded-xl border border-border bg-surface1 p-3 text-xs text-muted break-all">
                  {payment.pix_qr_code_text}
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
              onClick={() => paymentId && refreshPaymentMutation.mutate(paymentId)}
              disabled={refreshPaymentMutation.isPending || currentPaymentStatus === 'PAID'}
              className="flex-1"
            >
              {refreshPaymentMutation.isPending ? 'Atualizando...' : 'Validar pagamento'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
