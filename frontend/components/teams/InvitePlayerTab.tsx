'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { teamsAPI } from '@/lib/api';
import { TEAM_MAX_PLAYERS } from '@/lib/team-constants';
import { Button, Input, useToast } from '@/components/shared/ui';
import { PlayerSearch } from './PlayerSearch';
import type { PlayerSearchResult } from '@/types';

interface InvitePlayerTabProps {
  teamId: number;
  isAtLimit: boolean;
  onInviteSent: () => void;
}

type InviteMethod = 'search' | 'id';

export function InvitePlayerTab({ teamId, isAtLimit, onInviteSent }: InvitePlayerTabProps) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  
  // State
  const [method, setMethod] = useState<InviteMethod>('search');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSearchResult | null>(null);
  const [playerId, setPlayerId] = useState('');
  const [message, setMessage] = useState('');

  // Mutation for sending invitation
  const inviteMutation = useMutation({
    mutationFn: (data: { player_id: number; message?: string }) =>
      teamsAPI.invitePlayer(teamId, data),
    onSuccess: () => {
      showToast('Convite enviado com sucesso!', 'success');
      // Reset form
      setSelectedPlayer(null);
      setPlayerId('');
      setMessage('');
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['team', teamId] });
      // Switch back to members tab
      onInviteSent();
    },
    onError: (error: any) => {
      const data = error.response?.data;
      let errorMsg = 'Erro ao enviar convite';
      if (data) {
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.error) {
          errorMsg = data.error;
        } else if (data.message) {
          errorMsg = data.message;
        } else if (data.non_field_errors?.length) {
          errorMsg = data.non_field_errors[0];
        } else {
          const firstKey = Object.keys(data)[0];
          if (firstKey) {
            const firstVal = data[firstKey];
            errorMsg = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
          }
        }
      }
      showToast(errorMsg, 'error');
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (method === 'search' && !selectedPlayer) {
      showToast('Selecione um jogador da busca', 'error');
      return;
    }

    if (method === 'id' && !playerId.trim()) {
      showToast('Insira o ID do jogador', 'error');
      return;
    }

    // Get player ID
    const targetPlayerId = method === 'search' ? selectedPlayer!.id : parseInt(playerId);

    if (isNaN(targetPlayerId)) {
      showToast('ID do jogador inválido', 'error');
      return;
    }

    // Send invitation
    inviteMutation.mutate({
      player_id: targetPlayerId,
      message: message.trim() || undefined,
    });
  };

  // Handle player selection from search
  const handlePlayerSelect = (player: PlayerSearchResult) => {
    setSelectedPlayer(player);
  };

  // Helper function for position emoji
  const getPositionEmoji = (position: string) => {
    if (position === 'GK') return '🥅';
    if (['CB', 'LB', 'RB', 'LWB', 'RWB'].includes(position)) return '🛡️';
    if (['CDM', 'CM', 'CAM', 'LM', 'RM'].includes(position)) return '⚙️';
    if (['LW', 'RW', 'ST', 'CF'].includes(position)) return '⚽';
    return '👤';
  };

  // Helper function to get country flag emoji
  const getCountryFlag = (countryCode: string) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Warning if at limit */}
      {isAtLimit && (
        <div className="bg-warning/10 border border-warning/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-warning">Limite atingido!</p>
              <p className="text-sm text-muted mt-1">
                Sua equipe já possui {TEAM_MAX_PLAYERS} jogadores (limite máximo). Remova um jogador antes de enviar novos convites.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Method Selection */}
      <div>
        <label className="block text-sm font-medium text-text mb-3">
          Método de Convite
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setMethod('search');
              setPlayerId('');
              setSelectedPlayer(null);
            }}
            disabled={isAtLimit}
            className={`flex-1 px-4 py-3 rounded-xl border transition-all text-left ${
              method === 'search'
                ? 'bg-gold/10 border-gold text-gold shadow-[0_0_12px_rgba(214,161,30,0.15)]'
                : 'bg-surface2 border-border text-muted hover:border-gold/40 hover:text-text'
            } ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-2xl mb-1">🔍</div>
            <div className="font-semibold text-sm">Buscar Jogador</div>
            <div className="text-xs opacity-70 mt-0.5">Por nome ou gamer tag</div>
          </button>

          <button
            type="button"
            onClick={() => {
              setMethod('id');
              setSelectedPlayer(null);
              setPlayerId('');
            }}
            disabled={isAtLimit}
            className={`flex-1 px-4 py-3 rounded-xl border transition-all text-left ${
              method === 'id'
                ? 'bg-gold/10 border-gold text-gold shadow-[0_0_12px_rgba(214,161,30,0.15)]'
                : 'bg-surface2 border-border text-muted hover:border-gold/40 hover:text-text'
            } ${isAtLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="text-2xl mb-1">🔢</div>
            <div className="font-semibold text-sm">ID Direto</div>
            <div className="text-xs opacity-70 mt-0.5">Inserir Player ID</div>
          </button>
        </div>
      </div>

      {/* Search Method */}
      {method === 'search' && (
        <div>
          <PlayerSearch
            onPlayerSelect={handlePlayerSelect}
            disabled={isAtLimit}
          />
          
          {/* Selected Player Preview */}
          {selectedPlayer && (
            <div className="mt-4 bg-gold/5 rounded-xl p-4 border border-gold/30">
              <div className="flex items-center gap-4">
                {selectedPlayer.avatar ? (
                  <img
                    src={selectedPlayer.avatar}
                    alt={selectedPlayer.player_name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-gold/40"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-surface2 border border-border flex items-center justify-center text-2xl">
                    {getPositionEmoji(selectedPlayer.primary_position)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-text">
                    {selectedPlayer.player_name}
                  </div>
                  <div className="text-sm text-muted">
                    @{selectedPlayer.gamer_tag}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted2 flex-wrap">
                    <span>
                      {getPositionEmoji(selectedPlayer.primary_position)}{' '}
                      {selectedPlayer.primary_position}
                    </span>
                    <span className="text-border">•</span>
                    <span>
                      {getCountryFlag(selectedPlayer.country)} {selectedPlayer.country}
                    </span>
                    <span className="text-border">•</span>
                    <span className="font-mono">ID: {selectedPlayer.id}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(null)}
                  className="text-muted hover:text-text transition-colors p-1 rounded-lg hover:bg-surface2 flex-shrink-0"
                  title="Remover seleção"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ID Method */}
      {method === 'id' && (
        <div>
          <Input
            label="Player ID"
            type="number"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            placeholder="Ex: 12345"
            disabled={isAtLimit}
          />
          <p className="text-xs text-muted2 mt-2">
            O jogador pode encontrar seu ID na página de perfil
          </p>
        </div>
      )}

      {/* Message Field */}
      {!isAtLimit && (
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-muted mb-2">
            Mensagem para o jogador
            <span className="text-muted2 font-normal ml-1">(opcional)</span>
          </label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={4}
            placeholder="Ex: Oi! Estamos montando um time competitivo para o próximo campeonato. Seria ótimo ter você no elenco!"
            disabled={isAtLimit}
            className="w-full px-4 py-3 bg-surface2 border border-border rounded-xl text-text placeholder-muted2 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold transition-all resize-none"
          />
          <div className="flex justify-between items-center mt-1.5">
            <p className="text-xs text-muted2">
              Uma mensagem personalizada aumenta as chances do convite ser aceito
            </p>
            <p className={`text-xs font-mono tabular-nums ${message.length > 450 ? 'text-warning' : 'text-muted2'}`}>
              {message.length}/500
            </p>
          </div>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setSelectedPlayer(null);
            setPlayerId('');
            setMessage('');
          }}
          disabled={inviteMutation.isPending || isAtLimit}
        >
          Limpar
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={
            inviteMutation.isPending ||
            isAtLimit ||
            (method === 'search' && !selectedPlayer) ||
            (method === 'id' && !playerId.trim())
          }
        >
          {inviteMutation.isPending ? (
            <>
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enviando...
            </>
          ) : (
            'Enviar Convite'
          )}
        </Button>
      </div>
    </form>
  );
}
