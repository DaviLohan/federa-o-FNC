'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { championshipsAPI, teamsAPI } from '@/lib/api';
import { Modal, Button, useToast } from '@/components/shared/ui';
import { Trophy, Users, DollarSign, AlertCircle } from 'lucide-react';
import type { Championship, Team } from '@/types';

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

  // Load user's team
  useEffect(() => {
    if (isOpen) {
      loadMyTeam();
    }
  }, [isOpen]);

  const loadMyTeam = async () => {
    try {
      setIsLoadingTeam(true);
      const team = await teamsAPI.getMyTeam();
      setMyTeam(team);
      setSelectedTeam(team.id);
    } catch (error: any) {
      console.error('Error loading team:', error);
      if (error.response?.status === 404) {
        showToast('Você precisa criar um time primeiro', 'error');
      }
    } finally {
      setIsLoadingTeam(false);
    }
  };

  // Enrollment mutation
  const enrollMutation = useMutation({
    mutationFn: (teamId: number) =>
      championshipsAPI.enroll(championship.id, { team_id: teamId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship', championship.id] });
      queryClient.invalidateQueries({ queryKey: ['enrollments', championship.id] });
      showToast('Inscrição realizada com sucesso! Aguarde aprovação.', 'success');
      onClose();
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.error ||
        error.response?.data?.detail ||
        'Erro ao realizar inscrição';
      showToast(message, 'error');
    },
  });

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
    <Modal isOpen={isOpen} onClose={onClose} title="Inscrever Time">
      <div className="space-y-6">
        {/* Championship Info */}
        <div className="p-4 rounded-xl bg-surface2 border border-border">
          <h3 className="font-heading font-bold text-lg text-text mb-4">
            {championship.name}
          </h3>
          
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

        {/* Team Selection */}
        {isLoadingTeam ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gold" />
            <p className="text-muted text-sm mt-2">Carregando seu time...</p>
          </div>
        ) : !myTeam ? (
          // No team - show create team message
          <div className="text-center py-8 space-y-4">
            <div className="text-5xl">👥</div>
            <div>
              <h4 className="font-heading font-bold text-lg text-text mb-2">
                Você ainda não tem um time
              </h4>
              <p className="text-muted text-sm mb-4">
                Crie seu time para poder se inscrever em campeonatos
              </p>
            </div>
            <Button variant="primary" onClick={handleCreateTeam}>
              <Users className="w-4 h-4 mr-2" />
              Criar Meu Time
            </Button>
          </div>
        ) : (
          // Has team - show team info
          <div>
            <label className="block text-sm font-semibold text-text mb-3">
              Seu Time
            </label>
            <div className="p-4 rounded-xl bg-surface2 border-2 border-gold">
              <div className="flex items-center gap-4">
                {myTeam.logo ? (
                  <img
                    src={myTeam.logo}
                    alt={myTeam.name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold to-gold2 flex items-center justify-center text-2xl">
                    ⚽
                  </div>
                )}
                <div className="flex-1">
                  <h4 className="font-semibold text-text">{myTeam.name}</h4>
                  <p className="text-xs text-muted">
                    {myTeam.abbreviation} • {myTeam.player_count} jogadores
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-gold/5 border border-gold/20">
          <AlertCircle className="w-5 h-5 text-gold flex-shrink-0 mt-0.5" />
          <div className="text-sm text-muted">
            <p className="mb-2">
              Após a inscrição, sua solicitação será analisada pelos
              organizadores do campeonato.
            </p>
            {parseFloat(championship.enrollment_fee) > 0 && (
              <p className="font-semibold text-text">
                ⚠️ O pagamento será solicitado apenas após a aprovação da
                inscrição.
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleEnroll}
            disabled={!myTeam || enrollMutation.isPending}
            className="flex-1"
          >
            {enrollMutation.isPending ? 'Inscrevendo...' : 'Confirmar Inscrição'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
