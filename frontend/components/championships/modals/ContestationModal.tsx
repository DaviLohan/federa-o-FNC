'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Select, ImageUpload, useToast } from '@/components/shared/ui';
import { contestationsAPI } from '@/lib/api';
import type { Match } from '@/types';
import { AlertTriangle, Send } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/date';

interface ContestationModalProps {
  match: Match;
  teamId: number; // ID do time que está contestando
  isOpen: boolean;
  onClose: () => void;
}

const contestationReasons = [
  { value: '', label: 'Selecione um motivo...' },
  { value: 'WRONG_SCORE', label: 'Placar Incorreto' },
  { value: 'MISSING_PLAYER', label: 'Jogador Ausente na Súmula' },
  { value: 'FAKE_SCREENSHOT', label: 'Screenshot Falso' },
  { value: 'OPPONENT_QUIT', label: 'Adversário Saiu da Partida' },
  { value: 'CONNECTION_ISSUE', label: 'Problema de Conexão' },
  { value: 'OTHER', label: 'Outro Motivo' },
];

export function ContestationModal({ match, teamId, isOpen, onClose }: ContestationModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
  });

  const [evidence, setEvidence] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submit contestation mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return contestationsAPI.create(data);
    },
    onSuccess: () => {
      showToast('Contestação enviada com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
      queryClient.invalidateQueries({ queryKey: ['contestations'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erro ao enviar contestação';
      showToast(errorMessage, 'error');
      
      // Handle field-specific errors
      if (error.response?.data) {
        const fieldErrors: Record<string, string> = {};
        Object.keys(error.response.data).forEach((key) => {
          if (key !== 'error') {
            fieldErrors[key] = Array.isArray(error.response.data[key])
              ? error.response.data[key][0]
              : error.response.data[key];
          }
        });
        setErrors(fieldErrors);
      }
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.reason) {
      newErrors.reason = 'Selecione um motivo';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Descreva a contestação';
    } else if (formData.description.trim().length < 20) {
      newErrors.description = 'A descrição deve ter pelo menos 20 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Preencha todos os campos corretamente', 'error');
      return;
    }

    // Create FormData
    const formDataObj = new FormData();
    formDataObj.append('match_id', match.id.toString());
    formDataObj.append('team_id', teamId.toString());
    formDataObj.append('reason', formData.reason);
    formDataObj.append('description', formData.description);

    if (evidence) {
      formDataObj.append('evidence', evidence);
    }

    submitMutation.mutate(formDataObj);
  };

  const resetForm = () => {
    setFormData({
      reason: '',
      description: '',
    });
    setEvidence(null);
    setErrors({});
  };

  const handleClose = () => {
    if (!submitMutation.isPending) {
      resetForm();
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Contestar Resultado da Partida"
      description="Informe o motivo da contestação e forneça evidências"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Info */}
        <div className="bg-panel2 rounded-xl p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center mb-3">
             {/* Home Team */}
             <div className="flex items-center justify-end gap-3">
               <div className="text-right">
                 <h3 className="font-bold text-text truncate">{match.home_team.name}</h3>
                 <p className="text-sm text-muted2">{match.home_team.abbreviation}</p>
               </div>
               {match.home_team.logo && (
                 <img
                   src={match.home_team.logo}
                   alt={match.home_team.name}
                   className="w-12 h-12 rounded-lg object-cover"
                 />
               )}
             </div>

             {/* Score */}
             <div className="flex items-center gap-2">
               <span className="text-2xl font-bold text-text">{match.home_score}</span>
               <span className="text-xl font-bold text-muted2">×</span>
               <span className="text-2xl font-bold text-text">{match.away_score}</span>
             </div>

             {/* Away Team */}
             <div className="flex items-center justify-start gap-3">
               {match.away_team.logo && (
                 <img
                   src={match.away_team.logo}
                   alt={match.away_team.name}
                   className="w-12 h-12 rounded-lg object-cover"
                 />
               )}
               <div className="text-left">
                 <h3 className="font-bold text-text truncate">{match.away_team.name}</h3>
                 <p className="text-sm text-muted2">{match.away_team.abbreviation}</p>
               </div>
             </div>
          </div>

          <div className="pt-3 border-t border-stroke">
            <p className="text-xs text-muted2 text-center">
              Partida realizada em{' '}
              {formatDateTime(match.scheduled_date)}
            </p>
          </div>
        </div>

        {/* Reason */}
        <div>
          <Select
            label="Motivo da Contestação *"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
            options={contestationReasons}
            required
            error={errors.reason}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Descrição Detalhada <span className="text-error">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={5}
            required
            className={`w-full px-4 py-3 bg-panel2 border ${
              errors.description ? 'border-error' : 'border-stroke'
            } rounded-xl text-text placeholder-muted2 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none`}
            placeholder="Descreva em detalhes o motivo da contestação. Quanto mais informações, melhor será a análise..."
          />
          {errors.description && (
            <p className="text-sm text-error mt-2">{errors.description}</p>
          )}
          <p className="text-xs text-muted2 mt-2">
            Mínimo de 20 caracteres. Seja claro e objetivo.
          </p>
        </div>

        {/* Evidence Upload */}
        <div>
          <ImageUpload
            label="Evidência (opcional)"
            onChange={setEvidence}
            previewClassName="w-full h-48"
            helpText="Anexe uma captura de tela ou foto que comprove sua contestação (PNG, JPG ou WEBP, máx 5MB)"
            maxSize={5}
            buttonText="Escolher Evidência"
          />
          <p className="text-xs text-muted2 mt-2">
            Embora opcional, fornecer evidências aumenta as chances de sua contestação ser aceita.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-error/10 border border-error/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="w-5 h-5 text-error shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text mb-1">Importante</h4>
              <ul className="text-sm text-muted space-y-1 list-disc list-inside">
                <li>Contestações falsas ou sem fundamento podem resultar em penalidades</li>
                <li>A análise será feita por um administrador em até 48 horas</li>
                <li>Você será notificado quando houver uma decisão</li>
                <li>Durante a análise, o resultado da partida permanece inalterado</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            className="flex-1"
            disabled={submitMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1 bg-warning hover:bg-warning/90"
            loading={submitMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            Enviar Contestação
          </Button>
        </div>
      </form>
    </Modal>
  );
}
