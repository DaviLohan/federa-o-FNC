'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, CheckCircle, XCircle, AlertTriangle, Users } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { matchesAPI, matchProposalsAPI, matchConfirmationsAPI } from '@/lib/api';
import { MatchCalendar } from '@/components/matches/MatchCalendar';
import { ProposeDateModal } from '@/components/matches/ProposeDateModal';
import { ConfirmPresenceModal } from '@/components/matches/ConfirmPresenceModal';

export default function MatchSchedulePage() {
  const user = useAuthStore((state) => state.user);
  const [matches, setMatches] = useState<any[]>([]);
  const [proposals, setProposals] = useState<any[]>([]);
  const [confirmations, setConfirmations] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [proposeModalOpen, setProposeModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Buscar partidas
      const matchesResponse = await matchesAPI.getAll({ page_size: 100 });
      setMatches((matchesResponse as any).results || []);

      // Buscar propostas
      const proposalsResponse = await matchProposalsAPI.getAll({ page_size: 100 });
      setProposals((proposalsResponse as any).results || []);

      // Buscar confirmações
      const confirmationsResponse = await matchConfirmationsAPI.getAll({ page_size: 100 });
      setConfirmations((confirmationsResponse as any).results || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectMatch = (match: any) => {
    setSelectedMatch(match);
    setSelectedDate(null);
  };

  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
    setSelectedMatch(null);
  };

  const handleProposeDate = (match: any) => {
    setSelectedMatch(match);
    setProposeModalOpen(true);
  };

  const handleConfirmPresence = (match: any) => {
    setSelectedMatch(match);
    setConfirmModalOpen(true);
  };

  const getMatchConfirmation = (matchId: number, teamId: number) => {
    return confirmations.find(
      (c) => c.match === matchId && c.team === teamId
    );
  };

  const getMatchProposals = (matchId: number) => {
    return proposals.filter((p) => p.match === matchId && p.status === 'PENDING');
  };

  const handleAcceptProposal = async (proposalId: number) => {
    try {
      await matchProposalsAPI.respond(proposalId, { action: 'accept' });
      loadData();
    } catch (error) {
      console.error('Erro ao aceitar proposta:', error);
    }
  };

  const handleRejectProposal = async (proposalId: number, reason: string) => {
    try {
      await matchProposalsAPI.respond(proposalId, { 
        action: 'reject',
        rejection_reason: reason 
      });
      loadData();
    } catch (error) {
      console.error('Erro ao rejeitar proposta:', error);
    }
  };

  // Filtrar partidas
  const getMyTeamMatches = () => {
    const userTeamId = user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id;
    if (!userTeamId) return [];

    return matches.filter(
      (match) =>
        match.team_home.id === userTeamId || match.team_away.id === userTeamId
    );
  };

  const myMatches = getMyTeamMatches();

  const filteredMatches = myMatches.filter((match) => {
    if (filter === 'pending') {
      return match.status === 'PENDING' || match.status === 'SCHEDULED';
    }
    if (filter === 'confirmed') {
      const userTeamId = user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id;
      const confirmation = getMatchConfirmation(match.id, userTeamId);
      return confirmation?.status === 'CONFIRMED';
    }
    return true;
  });

  const pendingConfirmations = myMatches.filter((match) => {
    const userTeamId = user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id;
    const confirmation = getMatchConfirmation(match.id, userTeamId);
    return !confirmation || confirmation.status === 'PENDING';
  }).length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-surface2 border-t-gold mx-auto"></div>
          <p className="text-sm text-muted">Carregando agendamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="border-b border-border bg-surface1">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="rounded-xl bg-gradient-to-br from-gold to-gold2 p-3">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-text">Agendamento de Partidas</h1>
                  <p className="text-sm text-muted">
                    Gerencie o calendário e confirme suas partidas
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-gold">{myMatches.length}</div>
                <div className="text-xs text-muted">Total de Partidas</div>
              </div>
              <div className="rounded-lg bg-surface2 px-4 py-2 text-center">
                <div className="text-2xl font-bold text-yellow-500">{pendingConfirmations}</div>
                <div className="text-xs text-muted">Aguardando</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar - 2/3 width */}
          <div className="lg:col-span-2">
            <MatchCalendar
              matches={filteredMatches}
              onSelectMatch={handleSelectMatch}
              onSelectDate={handleSelectDate}
            />
          </div>

          {/* Sidebar - 1/3 width */}
          <div className="space-y-6">
            {/* Filters */}
            <div className="rounded-xl border border-border bg-surface1 p-4">
              <h3 className="mb-3 font-semibold text-text">Filtros</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:bg-surface2 hover:text-text'
                  }`}
                >
                  Todas as Partidas
                </button>
                <button
                  onClick={() => setFilter('pending')}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                    filter === 'pending'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:bg-surface2 hover:text-text'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setFilter('confirmed')}
                  className={`w-full rounded-lg px-4 py-2 text-left text-sm font-medium transition-colors ${
                    filter === 'confirmed'
                      ? 'bg-gold text-white'
                      : 'text-muted hover:bg-surface2 hover:text-text'
                  }`}
                >
                  Confirmadas
                </button>
              </div>
            </div>

            {/* Selected Match/Date Info */}
            {selectedMatch && (
              <div className="rounded-xl border border-border bg-surface1 p-4">
                <h3 className="mb-3 font-semibold text-text">Detalhes da Partida</h3>
                
                <div className="mb-4 rounded-lg bg-surface2 p-3">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <span className="font-semibold text-text">
                      {selectedMatch.team_home.name}
                    </span>
                    <span className="text-gold">vs</span>
                    <span className="font-semibold text-text">
                      {selectedMatch.team_away.name}
                    </span>
                  </div>
                  
                  {selectedMatch.scheduled_date && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted">
                      <Clock className="h-3 w-3" />
                      <span>
                        {new Date(selectedMatch.scheduled_date).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div className="mb-4">
                  {selectedMatch.status === 'PENDING' && (
                    <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 px-3 py-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm font-medium text-yellow-500">
                        Aguardando Agendamento
                      </span>
                    </div>
                  )}
                  {selectedMatch.status === 'SCHEDULED' && (
                    <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-500">
                        Agendada
                      </span>
                    </div>
                  )}
                </div>

                {/* Proposals */}
                {getMatchProposals(selectedMatch.id).length > 0 && (
                  <div className="mb-4 space-y-2">
                    <h4 className="text-sm font-medium text-muted">Propostas Pendentes</h4>
                    {getMatchProposals(selectedMatch.id).map((proposal: any) => (
                      <div key={proposal.id} className="rounded-lg border border-border bg-surface2 p-3">
                        <div className="mb-2 text-xs text-muted">
                          Proposta de: {proposal.proposed_by_team_name}
                        </div>
                        <div className="mb-2 text-sm font-medium text-text">
                          {new Date(proposal.proposed_date).toLocaleString('pt-BR')}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptProposal(proposal.id)}
                            className="flex-1 rounded bg-green-500 px-3 py-1 text-xs font-medium text-white hover:bg-green-600"
                          >
                            Aceitar
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('Motivo da recusa:');
                              if (reason) handleRejectProposal(proposal.id, reason);
                            }}
                            className="flex-1 rounded bg-red-500 px-3 py-1 text-xs font-medium text-white hover:bg-red-600"
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  {selectedMatch.status === 'PENDING' && (
                    <button
                      onClick={() => handleProposeDate(selectedMatch)}
                      className="w-full rounded-lg bg-gold px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gold/90"
                    >
                      Propor Nova Data
                    </button>
                  )}
                  
                  {selectedMatch.status === 'SCHEDULED' && (
                    <button
                      onClick={() => handleConfirmPresence(selectedMatch)}
                      className="w-full rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                    >
                      Confirmar Presença
                    </button>
                  )}
                </div>
              </div>
            )}

            {selectedDate && !selectedMatch && (
              <div className="rounded-xl border border-border bg-surface1 p-4">
                <h3 className="mb-3 font-semibold text-text">Data Selecionada</h3>
                <p className="text-sm text-muted">
                  {selectedDate.toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                
                {/* Matches on this date */}
                <div className="mt-4 space-y-2">
                  {filteredMatches
                    .filter((match) => {
                      if (!match.scheduled_date) return false;
                      const matchDate = new Date(match.scheduled_date);
                      return (
                        matchDate.getDate() === selectedDate.getDate() &&
                        matchDate.getMonth() === selectedDate.getMonth() &&
                        matchDate.getFullYear() === selectedDate.getFullYear()
                      );
                    })
                    .map((match) => (
                      <button
                        key={match.id}
                        onClick={() => handleSelectMatch(match)}
                        className="w-full rounded-lg bg-surface2 p-3 text-left transition-colors hover:bg-gold/10"
                      >
                        <div className="text-sm font-medium text-text">
                          {match.team_home.name} vs {match.team_away.name}
                        </div>
                        <div className="text-xs text-muted">
                          {new Date(match.scheduled_date).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            )}

            {!selectedMatch && !selectedDate && (
              <div className="rounded-xl border border-border bg-surface1 p-8 text-center">
                <Users className="mx-auto mb-3 h-12 w-12 text-muted" />
                <p className="text-sm text-muted">
                  Selecione uma partida ou data no calendário para ver os detalhes
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {selectedMatch && (
        <>
          <ProposeDateModal
            match={selectedMatch}
            isOpen={proposeModalOpen}
            onClose={() => setProposeModalOpen(false)}
            onSuccess={() => {
              loadData();
              setProposeModalOpen(false);
            }}
          />
          
          <ConfirmPresenceModal
            match={selectedMatch}
            teamId={user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id || 0}
            confirmationId={getMatchConfirmation(
              selectedMatch.id,
              user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id || 0
            )?.id}
            confirmationStatus={getMatchConfirmation(
              selectedMatch.id,
              user?.player_profile?.current_team_id || user?.team_owner_profile?.team_id || 0
            )?.status}
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onSuccess={() => {
              loadData();
              setConfirmModalOpen(false);
            }}
          />
        </>
      )}
    </div>
  );
}
