'use client';

import { Card, EmptyState, Badge } from '@/components/shared/ui';
import type { Bracket, Match } from '@/types';

interface BracketTabProps {
  bracket?: Bracket;
  matches?: Match[];
}

export function BracketTab({ bracket, matches = [] }: BracketTabProps) {
  if (!bracket || !bracket.structure) {
    return (
      <EmptyState
        icon="🏆"
        title="Chaveamento ainda não disponível"
        description="O chaveamento será gerado quando o campeonato começar e os times forem definidos."
        size="lg"
      />
    );
  }

  // Parse bracket structure
  const structure = bracket.structure;
  const rounds = structure.rounds || [];

  const roundNames: Record<number, string> = {
    1: 'Oitavas',
    2: 'Quartas',
    3: 'Semi-Final',
    4: 'Final',
  };

  return (
    <div className="space-y-6">
      {/* Simple Bracket Visualization */}
      <div className="overflow-x-auto pb-6">
        <div className="flex gap-8 min-w-max px-4">
          {rounds.map((round, idx) => (
            <div key={round.round_number} className="flex-shrink-0 space-y-4" style={{ width: '280px' }}>
              {/* Round Header */}
              <div className="text-center mb-6">
                <Badge variant="info" className="text-sm font-bold">
                  {roundNames[round.round_number] || round.round_name || `Rodada ${round.round_number}`}
                </Badge>
              </div>

              {/* Matches in this round */}
              <div className="space-y-8">
                {round.matches.map((bracketMatch, matchIdx) => (
                  <Card key={matchIdx} className="p-4 bg-panel2 border-stroke/50 hover:border-brand/30 transition-colors">
                    {/* Team 1 */}
                    <div className={`flex items-center justify-between p-3 rounded-lg mb-1 ${
                      bracketMatch.winner?.id === bracketMatch.team1?.id ? 'bg-success/10 border border-success/30' : 'bg-panel/50'
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {bracketMatch.team1?.logo && (
                          <img
                            src={bracketMatch.team1.logo}
                            alt={bracketMatch.team1.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <span className={`text-sm truncate ${
                          bracketMatch.winner?.id === bracketMatch.team1?.id ? 'font-bold text-success' : 'text-text'
                        }`}>
                          {bracketMatch.team1?.name || 'TBD'}
                        </span>
                      </div>
                      {bracketMatch.score && (
                        <span className={`text-lg font-bold ml-2 flex-shrink-0 ${
                          bracketMatch.winner?.id === bracketMatch.team1?.id ? 'text-success' : 'text-muted2'
                        }`}>
                          {bracketMatch.score.split('-')[0]}
                        </span>
                      )}
                    </div>

                    {/* VS Divider */}
                    <div className="text-center py-1">
                      <span className="text-xs text-muted2 font-bold">VS</span>
                    </div>

                    {/* Team 2 */}
                    <div className={`flex items-center justify-between p-3 rounded-lg ${
                      bracketMatch.winner?.id === bracketMatch.team2?.id ? 'bg-success/10 border border-success/30' : 'bg-panel/50'
                    }`}>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {bracketMatch.team2?.logo && (
                          <img
                            src={bracketMatch.team2.logo}
                            alt={bracketMatch.team2.name}
                            className="w-8 h-8 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <span className={`text-sm truncate ${
                          bracketMatch.winner?.id === bracketMatch.team2?.id ? 'font-bold text-success' : 'text-text'
                        }`}>
                          {bracketMatch.team2?.name || 'TBD'}
                        </span>
                      </div>
                      {bracketMatch.score && (
                        <span className={`text-lg font-bold ml-2 flex-shrink-0 ${
                          bracketMatch.winner?.id === bracketMatch.team2?.id ? 'text-success' : 'text-muted2'
                        }`}>
                          {bracketMatch.score.split('-')[1]}
                        </span>
                      )}
                    </div>

                    {/* Match Status */}
                    {!bracketMatch.winner && (bracketMatch.team1 && bracketMatch.team2) && (
                      <div className="text-center mt-2">
                        <span className="text-xs text-muted2">⏰ Agendado</span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Empty State if no bracket data */}
      {rounds.length === 0 && (
        <Card className="p-12">
          <EmptyState
            icon="🏆"
            title="Chaveamento em construção"
            description="O chaveamento será populado automaticamente quando as partidas eliminatórias forem agendadas."
            size="md"
          />
        </Card>
      )}

      {/* Legend */}
      {rounds.length > 0 && (
        <Card className="p-4 bg-panel2/50">
          <div className="flex items-center justify-center gap-6 text-sm text-muted2">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-success/10 border border-success/30"></div>
              <span>Vencedor</span>
            </div>
            <div className="flex items-center gap-2">
              <span>⏰</span>
              <span>Agendado</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
