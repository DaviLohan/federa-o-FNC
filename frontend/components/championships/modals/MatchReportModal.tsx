'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Input, ImageUpload, useToast } from '@/components/shared/ui';
import { matchesAPI } from '@/lib/api';
import type { Match } from '@/types';
import { AlertCircle, Upload } from 'lucide-react';

interface MatchReportModalProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
}

export function MatchReportModal({ match, isOpen, onClose }: MatchReportModalProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    home_score: match.home_score.toString(),
    away_score: match.away_score.toString(),
    notes: '',
  });

  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Submit report mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return matchesAPI.submitReport(match.id, data);
    },
    onSuccess: () => {
      showToast('Súmula enviada com sucesso!', 'success');
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['championship'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.error || 'Erro ao enviar súmula';
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

    // Validate scores
    const homeScore = parseInt(formData.home_score);
    const awayScore = parseInt(formData.away_score);

    if (isNaN(homeScore) || homeScore < 0) {
      newErrors.home_score = 'Placar inválido';
    }

    if (isNaN(awayScore) || awayScore < 0) {
      newErrors.away_score = 'Placar inválido';
    }

    if (homeScore > 99 || awayScore > 99) {
      newErrors.home_score = 'Placar muito alto (máximo 99)';
    }

    // Validate screenshot
    if (!screenshot) {
      newErrors.screenshot = 'Screenshot do resultado é obrigatório';
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
    formDataObj.append('home_score', formData.home_score);
    formDataObj.append('away_score', formData.away_score);
    
    if (formData.notes) {
      formDataObj.append('notes', formData.notes);
    }

    if (screenshot) {
      formDataObj.append('screenshot', screenshot);
    }

    submitMutation.mutate(formDataObj);
  };

  const resetForm = () => {
    setFormData({
      home_score: '0',
      away_score: '0',
      notes: '',
    });
    setScreenshot(null);
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
      title="Reportar Resultado da Partida"
      description="Preencha o placar e anexe o screenshot do resultado final"
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Match Info */}
        <div className="bg-panel2 rounded-xl p-4">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
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

             {/* VS */}
             <span className="text-xl font-bold text-muted2">×</span>

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
        </div>

        {/* Score Input */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-text">
            Placar Final <span className="text-error">*</span>
          </label>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
            {/* Home Score */}
            <div>
              <Input
                label=""
                type="number"
                name="home_score"
                value={formData.home_score}
                onChange={handleChange}
                placeholder="0"
                min="0"
                max="99"
                required
                className="text-center text-2xl font-bold"
                error={errors.home_score}
              />
               <p className="text-xs text-muted2 text-center mt-2">{match.home_team.abbreviation}</p>
             </div>

             {/* Separator */}
             <div className="flex items-center justify-center pt-3">
               <span className="text-3xl font-bold text-muted2">×</span>
             </div>

             {/* Away Score */}
             <div>
               <Input
                 label=""
                 type="number"
                 name="away_score"
                 value={formData.away_score}
                 onChange={handleChange}
                 placeholder="0"
                 min="0"
                 max="99"
                 required
                 className="text-center text-2xl font-bold"
                 error={errors.away_score}
               />
               <p className="text-xs text-muted2 text-center mt-2">{match.away_team.abbreviation}</p>
            </div>
          </div>
        </div>

        {/* Screenshot Upload */}
        <div>
          <ImageUpload
            label="Screenshot do Resultado *"
            onChange={setScreenshot}
            previewClassName="w-full h-48"
            helpText="Capture a tela do placar final do jogo (PNG, JPG ou WEBP, máx 5MB)"
            maxSize={5}
            buttonText="Escolher Screenshot"
          />
          {errors.screenshot && (
            <p className="text-sm text-error mt-2">{errors.screenshot}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-text mb-2">
            Observações (opcional)
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full px-4 py-3 bg-panel2 border border-stroke rounded-xl text-text placeholder-muted2 focus:outline-none focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all resize-none"
            placeholder="Adicione informações adicionais sobre a partida (opcional)..."
          />
          <p className="text-xs text-muted2 mt-2">
            Ex: jogadores que se destacaram, problemas durante a partida, etc.
          </p>
        </div>

        {/* Warning */}
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-text mb-1">Atenção</h4>
              <p className="text-sm text-muted">
                Certifique-se de que o placar e o screenshot estão corretos. Informações falsas podem
                resultar em penalidades para o time.
              </p>
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
            className="flex-1"
            loading={submitMutation.isPending}
          >
            <Upload className="w-4 h-4 mr-2" />
            Enviar Súmula
          </Button>
        </div>
      </form>
    </Modal>
  );
}
