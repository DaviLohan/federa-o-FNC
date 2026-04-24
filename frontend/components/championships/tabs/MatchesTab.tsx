'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/shared/ui';
import { MatchScorecard } from '@/components/matches/MatchScorecard';
import { ReportStatusBar } from '@/components/matches/ReportStatusBar';
import type { Match, Championship } from '@/types';
import { usePermissions } from '@/lib/hooks';
import { MatchReportModal, ContestationModal, EAReportModal } from '../modals';
import { Swords } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatchesTabProps {
  matches: Match[];
  championship: Championship;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MatchesTab({ matches, championship }: MatchesTabProps) {
  const { canReportMatch, canContestMatch, user } = usePermissions();

  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [eaReportingMatch, setEaReportingMatch] = useState<Match | null>(null);
  const [contestingMatch, setContestingMatch] = useState<Match | null>(null);
  const [contestingTeamId, setContestingTeamId] = useState<number | null>(null);

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="mx-auto h-14 w-14 text-gold/40" />}
        title={user?.user_type === 'TEAM_OWNER' ? 'Nenhuma partida do seu time encontrada nesta rodada.' : 'Nenhuma partida agendada'}
        description={user?.user_type === 'TEAM_OWNER' ? 'Somente partidas dos seus times sao exibidas aqui.' : 'As partidas serao exibidas assim que o campeonato comecar.'}
        size="lg"
      />
    );
  }

  // ── Handlers ────────────────────────────────────────────────────────

  const handleContest = (match: Match) => {
    setContestingMatch(match);
    const userTeamId = user?.team_owner_profile
      ? match.home_team.owner.id === user.id
        ? match.home_team.id
        : match.away_team.id
      : undefined;
    setContestingTeamId(userTeamId || match.home_team.id);
  };

  // ── Group by round ──────────────────────────────────────────────────

  const groupedMatches = matches.reduce((acc, match) => {
    const round = match.round_number || 0;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([round, roundMatches]) => (
          <div key={round}>
            {round !== '0' && (
              <h2 className="text-lg font-bold text-text mb-4">Rodada {round}</h2>
            )}

            <div className="space-y-4">
              {[...roundMatches]
                .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
                .map((match) => (
                <MatchScorecard key={match.id} match={match}>
                  <ReportStatusBar
                    match={match}
                    canReport={canReportMatch(match)}
                    canContest={canContestMatch(match)}
                    onReportEA={() => setEaReportingMatch(match)}
                    onReportManual={() => setReportingMatch(match)}
                    onContest={() => handleContest(match)}
                  />
                </MatchScorecard>
              ))}
            </div>
          </div>
        ))}

      {/* Match Report Modal */}
      {reportingMatch && (
        <MatchReportModal
          match={reportingMatch}
          isOpen={true}
          onClose={() => setReportingMatch(null)}
        />
      )}

      {/* Contestation Modal */}
      {contestingMatch && contestingTeamId && (
        <ContestationModal
          match={contestingMatch}
          teamId={contestingTeamId}
          isOpen={true}
          onClose={() => {
            setContestingMatch(null);
            setContestingTeamId(null);
          }}
        />
      )}

      {/* EA Report Modal */}
      {eaReportingMatch && (
        <EAReportModal
          match={eaReportingMatch}
          isOpen={true}
          onClose={() => setEaReportingMatch(null)}
        />
      )}
    </div>
  );
}
