'use client';

import { useState } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { matchProposalsAPI } from '@/lib/api';

interface ProposeDateModalProps {
  match: {
    id: number;
    home_team: { id: number; name: string };
    away_team: { id: number; name: string };
    championship: { id: number; name: string; start_date: string; end_date: string };
  };
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProposeDateModal({ match, isOpen, onClose, onSuccess }: ProposeDateModalProps) {
  const [proposedDate, setProposedDate] = useState('');
  const [proposedTime, setProposedTime] = useState('20:00');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Combinar data e hora
      const dateTime = `${proposedDate}T${proposedTime}:00`;
      
      await matchProposalsAPI.create({
        match_id: match.id,
        proposed_date: dateTime,
      });

      onSuccess();
      onClose();
      setProposedDate('');
      setProposedTime('20:00');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao propor nova data');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calcular datas mínimas e máximas
  const minDate = new Date().toISOString().split('T')[0];
  const maxDate = match.championship.end_date;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface1 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface2 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-gold p-2">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-text">Propor Nova Data</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted transition-colors hover:bg-surface1 hover:text-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Match Info */}
          <div className="mb-6 rounded-lg bg-surface2 p-4">
            <div className="mb-2 text-sm font-medium text-muted">Partida</div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-3">
                <span className="font-semibold text-text">{match.home_team.name}</span>
                <span className="text-gold">vs</span>
                <span className="font-semibold text-text">{match.away_team.name}</span>
              </div>
              <div className="mt-2 text-xs text-muted">{match.championship.name}</div>
            </div>
          </div>

          {/* Date Input */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-text">
              Data da Partida
            </label>
            <input
              type="date"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              min={minDate}
              max={maxDate}
              required
              className="w-full rounded-lg border border-border bg-surface2 px-4 py-2.5 text-text transition-colors focus:border-gold focus:outline-none"
            />
            <p className="mt-1 text-xs text-muted">
              Período do campeonato: {new Date(match.championship.start_date).toLocaleDateString('pt-BR')} até{' '}
              {new Date(match.championship.end_date).toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Time Input */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-text">
              Horário
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
              <input
                type="time"
                value={proposedTime}
                onChange={(e) => setProposedTime(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface2 py-2.5 pl-10 pr-4 text-text transition-colors focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Info Alert */}
          <div className="mb-6 flex gap-3 rounded-lg bg-blue-500/10 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-blue-500" />
            <div className="text-sm text-muted">
              <p className="mb-1 font-medium text-text">Importante:</p>
              <p>
                A outra equipe terá 24 horas para aceitar ou recusar sua proposta de data.
                Caso não haja resposta, a proposta expirará automaticamente.
              </p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-border bg-surface2 px-4 py-2.5 font-medium text-text transition-colors hover:bg-surface1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !proposedDate}
              className="flex-1 rounded-lg bg-gold px-4 py-2.5 font-medium text-white transition-colors hover:bg-gold/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Enviando...' : 'Propor Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
