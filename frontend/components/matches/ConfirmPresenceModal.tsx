'use client';

import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { matchConfirmationsAPI } from '@/lib/api';

interface ConfirmPresenceModalProps {
  match: {
    id: number;
    scheduled_date: string;
    team_home: { id: number; name: string };
    team_away: { id: number; name: string };
    championship: { id: number; name: string };
  };
  teamId: number;
  confirmationId?: number;
  confirmationStatus?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ConfirmPresenceModal({
  match,
  teamId,
  confirmationId,
  confirmationStatus,
  isOpen,
  onClose,
  onSuccess,
}: ConfirmPresenceModalProps) {
  const [action, setAction] = useState<'confirm' | 'decline' | null>(null);
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      if (confirmationId) {
        // Confirmar presença existente
        await matchConfirmationsAPI.confirm(confirmationId);
      } else {
        // Criar nova confirmação
        const response = await matchConfirmationsAPI.create({
          match_id: match.id,
          team_id: teamId,
        });
        // Confirmar imediatamente
        await matchConfirmationsAPI.confirm((response as any).id);
      }

      onSuccess();
      onClose();
      setAction(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao confirmar presença');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Por favor, informe o motivo da recusa');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      if (confirmationId) {
        await matchConfirmationsAPI.decline(confirmationId, {
          reason: declineReason,
        });
      }

      onSuccess();
      onClose();
      setAction(null);
      setDeclineReason('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao recusar presença');
    } finally {
      setIsSubmitting(false);
    }
  };

  const matchDate = new Date(match.scheduled_date);
  const now = new Date();
  const hoursUntilMatch = (matchDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isUrgent = hoursUntilMatch < 48 && hoursUntilMatch > 0;
  const isOverdue = hoursUntilMatch < 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface1 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface2 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={`rounded-lg p-2 ${isUrgent || isOverdue ? 'bg-red-500' : 'bg-gold'}`}>
              <CheckCircle className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-text">Confirmar Presença</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-surface1 hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Match Info */}
          <div className="mb-6 rounded-lg bg-surface2 p-4">
            <div className="mb-3 text-sm font-medium text-muted">Partida</div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="font-semibold text-text">{match.team_home.name}</span>
                <span className="text-gold">vs</span>
                <span className="font-semibold text-text">{match.team_away.name}</span>
              </div>
              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
                <Clock className="h-4 w-4" />
                <span>
                  {matchDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}{' '}
                  às{' '}
                  {matchDate.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted">{match.championship.name}</div>
            </div>
          </div>

          {/* Urgency Alert */}
          {isUrgent && !isOverdue && (
            <div className="mb-6 flex gap-3 rounded-lg bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="text-sm">
                <p className="mb-1 font-medium text-red-500">Atenção!</p>
                <p className="text-muted">
                  Faltam apenas {Math.floor(hoursUntilMatch)} horas para a partida.
                  Confirme sua presença o quanto antes!
                </p>
              </div>
            </div>
          )}

          {isOverdue && (
            <div className="mb-6 flex gap-3 rounded-lg bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <div className="text-sm">
                <p className="mb-1 font-medium text-red-500">Partida atrasada!</p>
                <p className="text-muted">
                  O prazo para confirmação já passou.
                </p>
              </div>
            </div>
          )}

          {/* Current Status */}
          {confirmationStatus && (
            <div className="mb-6 rounded-lg bg-surface2 p-4">
              <div className="text-sm font-medium text-muted mb-2">Status Atual</div>
              <div className="flex items-center gap-2">
                {confirmationStatus === 'CONFIRMED' && (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="font-medium text-green-500">Presença Confirmada</span>
                  </>
                )}
                {confirmationStatus === 'PENDING' && (
                  <>
                    <Clock className="h-5 w-5 text-yellow-500" />
                    <span className="font-medium text-yellow-500">Aguardando Confirmação</span>
                  </>
                )}
                {confirmationStatus === 'DECLINED' && (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-medium text-red-500">Presença Recusada</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Selection */}
          {!action && (
            <div className="mb-6">
              <p className="mb-4 text-sm text-muted">
                Você confirma que sua equipe estará presente nesta partida?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setAction('confirm')}
                  className="flex-1 rounded-lg border-2 border-green-500 bg-green-500/10 px-4 py-3 font-medium text-green-500 transition-colors hover:bg-green-500 hover:text-white"
                >
                  <CheckCircle className="mx-auto mb-1 h-6 w-6" />
                  Sim, confirmar
                </button>
                <button
                  onClick={() => setAction('decline')}
                  className="flex-1 rounded-lg border-2 border-red-500 bg-red-500/10 px-4 py-3 font-medium text-red-500 transition-colors hover:bg-red-500 hover:text-white"
                >
                  <XCircle className="mx-auto mb-1 h-6 w-6" />
                  Não posso
                </button>
              </div>
            </div>
          )}

          {/* Decline Reason */}
          {action === 'decline' && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-text">
                Motivo da recusa *
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Explique por que sua equipe não poderá comparecer..."
                rows={4}
                required
                className="w-full rounded-lg border border-border bg-surface2 px-4 py-3 text-text transition-colors focus:border-gold focus:outline-none"
              />
              <p className="mt-1 text-xs text-muted">
                É importante informar o motivo para que os organizadores possam tomar as medidas necessárias.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Actions */}
          {action && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAction(null);
                  setDeclineReason('');
                  setError('');
                }}
                className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 font-medium text-text transition-colors hover:bg-surface1"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={action === 'confirm' ? handleConfirm : handleDecline}
                disabled={isSubmitting || (action === 'decline' && !declineReason.trim())}
                className={`flex-1 rounded-lg px-4 py-2.5 font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === 'confirm'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {isSubmitting ? 'Processando...' : action === 'confirm' ? 'Confirmar Presença' : 'Enviar Recusa'}
              </button>
            </div>
          )}

          {!action && (
            <button
              onClick={onClose}
              className="w-full rounded-lg border border-border bg-surface2 px-4 py-2.5 font-medium text-text transition-colors hover:bg-surface1"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
