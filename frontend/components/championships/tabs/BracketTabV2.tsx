'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { championshipsAPI } from '@/lib/api';
import { useToast } from '@/components/shared/ui';
import { usePermissions } from '@/lib/hooks';
import { Trophy, Zap } from 'lucide-react';
import type { Championship, Bracket, Match } from '@/types';
import { BracketMatchCard } from './BracketMatchCard';

interface BracketTabV2Props {
  championship: Championship;
  bracket?: Bracket;
  matches?: Match[];
}

export function BracketTabV2({ championship, bracket, matches = [] }: BracketTabV2Props) {
  const { canManageBracket, canGenerateBracket } = usePermissions();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [expandedRound, setExpandedRound] = useState<number | null>(null);

  // Generate bracket mutation
  const generateMutation = useMutation({
    mutationFn: () => championshipsAPI.generateBracket(championship.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['championship', championship.id] });
      showToast('Chaveamento gerado com sucesso!', 'success');
    },
    onError: (error: any) => {
      showToast(error.response?.data?.error || 'Erro ao gerar chaveamento', 'error');
    },
  });

  // Empty state - no bracket yet
  if (!bracket || !bracket.structure) {
    const canGenerate = canGenerateBracket(championship);
    
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border p-12">
        <div className="relative z-10 text-center max-w-lg mx-auto">
          <div className="text-8xl mb-6 animate-pulse-slow">🏆</div>
          <h3 className="text-2xl font-heading font-bold text-text mb-4">
            Chaveamento ainda não gerado
          </h3>
          <p className="text-muted2 text-base leading-relaxed mb-8">
            {championship.current_phase === 'GROUPS'
              ? 'O chaveamento será gerado automaticamente quando todas as partidas da fase de grupos forem finalizadas. Os times classificados avançarão para a fase eliminatória.'
              : 'O chaveamento aparecerá aqui quando estiver disponível. Aguarde a finalização da fase anterior.'}
          </p>
          
          {canGenerate && canManageBracket(championship) && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="group relative inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-gold via-gold to-gold2 text-background font-heading font-bold text-lg shadow-xl shadow-gold/30 hover:shadow-2xl hover:shadow-gold/40 hover:scale-105 active:scale-95 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              <span>{generateMutation.isPending ? 'Gerando...' : 'Gerar Chaveamento'}</span>
            </button>
          )}
        </div>
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gold/10 rounded-full blur-3xl"></div>
      </div>
    );
  }

  const structure = bracket.structure;
  const rounds = structure.rounds || [];

  if (rounds.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface1 to-surface2 border border-border p-12">
        <div className="relative z-10 text-center max-w-md mx-auto">
          <div className="text-7xl mb-6 animate-pulse-slow">🏆</div>
          <h3 className="text-2xl font-heading font-bold text-text mb-3">
            Chaveamento vazio
          </h3>
          <p className="text-muted2 text-base leading-relaxed">
            Nenhuma partida encontrada no chaveamento. Entre em contato com a organização.
          </p>
        </div>
        
        {/* Decorative gradient orb */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-gold/10 rounded-full blur-3xl"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Desktop: Column Layout with Scroll Indicators */}
      <div className="hidden lg:block relative">
        {/* Gradient fade indicators for scroll */}
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-bg1 to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-bg1 to-transparent z-10 pointer-events-none" />
        
        <div className="overflow-x-auto pb-6 scroll-smooth">
          <div className="flex gap-8 min-w-max px-4">
          {rounds.map((round, roundIdx) => (
            <div key={round.round_number} className="flex-shrink-0 space-y-4 animate-reveal" style={{ width: '320px', animationDelay: `${roundIdx * 0.1}s` }}>
              {/* Round Header com gradiente */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-gold/20 via-gold/20 to-gold2/20 border border-gold/30">
                  <Trophy className="w-4 h-4 text-gold" />
                  <span className="text-sm font-heading font-bold gradient-text">
                    {round.round_name || `Rodada ${round.round_number}`}
                  </span>
                </div>
                <p className="text-xs text-muted mt-2 font-mono">{round.matches.length} partida(s)</p>
              </div>

              {/* Matches */}
              <div className="space-y-6 relative">
                {/* Linha vertical conectando as partidas */}
                {round.matches.length > 1 && (
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-gold/30 via-gold/30 to-gold2/30 -z-10" />
                )}
                
                {round.matches.map((bracketMatch, idx) => (
                  <div key={idx} className="relative">
                    <BracketMatchCard
                      match={bracketMatch}
                      onClick={() => {
                        if (bracketMatch.match_id) {
                          // Navigate to match details
                        }
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>

      {/* Mobile: Accordion Layout */}
      <div className="lg:hidden space-y-4">
        {rounds.map((round, idx) => (
          <div
            key={round.round_number}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface1 to-surface2 border border-border hover:border-gold/30 transition-all duration-300"
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            {/* Accordion Header */}
            <button
              onClick={() => setExpandedRound(expandedRound === round.round_number ? null : round.round_number)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-surface2/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-gold/20 via-gold/20 to-gold2/20 border border-gold/30">
                  <Trophy className="w-3.5 h-3.5 text-gold" />
                  <span className="text-sm font-heading font-bold gradient-text">
                    {round.round_name || `Rodada ${round.round_number}`}
                  </span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-surface2 border border-border text-muted2 font-mono">
                  {round.matches.length}
                </span>
              </div>
              <div className={`text-gold transition-transform duration-300 ${expandedRound === round.round_number ? 'rotate-180' : ''}`}>
                ▼
              </div>
            </button>

            {/* Accordion Content */}
            {expandedRound === round.round_number && (
              <div className="px-4 pb-4 space-y-3 bg-surface1/50 border-t border-border">
                <div className="pt-4"></div>
                {round.matches.map((bracketMatch, matchIdx) => (
                  <BracketMatchCard
                    key={matchIdx}
                    match={bracketMatch}
                    compact
                    onClick={() => {
                      if (bracketMatch.match_id) {
                        // Navigate to match details
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legend com design premium */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-surface1 to-surface2 border border-border p-6">
        <div className="relative z-10">
          <h4 className="text-sm font-heading font-bold text-text mb-4 text-center">Legenda</h4>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-lg bg-green/20 border-2 border-green/60 shadow-sm shadow-green/20"></div>
              <span className="text-muted2 font-medium">Vencedor</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-green/20 text-green border-green/30">
                Finalizado
              </div>
              <span className="text-muted2">Partida encerrada</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-gold/20 text-gold border-gold/30">
                Agendado
              </div>
              <span className="text-muted2">Aguardando resultado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="px-2.5 py-1 rounded-full text-xs font-medium border bg-muted2/20 text-muted2 border-muted2/30">
                TBD
              </div>
              <span className="text-muted2">Aguardando classificação</span>
            </div>
          </div>
        </div>
        
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-gold/5 via-transparent to-gold3/5"></div>
      </div>
    </div>
  );
}
