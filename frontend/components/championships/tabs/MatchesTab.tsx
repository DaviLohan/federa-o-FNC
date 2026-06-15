'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, Skeleton } from '@/components/shared/ui';
import { championshipsAPI } from '@/lib/api';
import { MatchScorecard } from '@/components/matches/MatchScorecard';
import { ReportStatusBar } from '@/components/matches/ReportStatusBar';
import type { Match, Championship, Group } from '@/types';
import { usePermissions } from '@/lib/hooks';
import { MatchReportModal, ContestationModal, EAReportModal } from '../modals';
import { Swords } from 'lucide-react';

interface MatchesTabProps {
  matches: Match[];
  championship: Championship;
}

type LegFilter = 'all' | 'first_leg' | 'second_leg';

function buildGroupTeamMap(groups: Group[]) {
  const teamToGroup = new Map<number, string>();
  for (const group of groups) {
    for (const standing of group.standings || []) {
      teamToGroup.set(standing.team.id, group.name);
    }
  }
  return teamToGroup;
}

function buildLegMap(matches: Match[]) {
  const pairMap = new Map<string, Match[]>();

  for (const match of [...matches].sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())) {
    const pairKey = [match.home_team.id, match.away_team.id].sort((a, b) => a - b).join(':');
    const existing = pairMap.get(pairKey) || [];
    existing.push(match);
    pairMap.set(pairKey, existing);
  }

  const legMap = new Map<number, 1 | 2>();
  for (const pairMatches of pairMap.values()) {
    pairMatches.forEach((match, index) => {
      legMap.set(match.id, index === 0 ? 1 : 2);
    });
  }
  return legMap;
}

export function MatchesTab({ matches, championship }: MatchesTabProps) {
  const { canReportMatch, canContestMatch, user } = usePermissions();
  const isRestrictedViewer = user?.user_type === 'TEAM_OWNER' || user?.user_type === 'PLAYER';

  const [reportingMatch, setReportingMatch] = useState<Match | null>(null);
  const [eaReportingMatch, setEaReportingMatch] = useState<Match | null>(null);
  const [contestingMatch, setContestingMatch] = useState<Match | null>(null);
  const [contestingTeamId, setContestingTeamId] = useState<number | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [selectedLeg, setSelectedLeg] = useState<LegFilter>('all');

  const isGroupsKnockout = championship.championship_type === 'GROUPS_KNOCKOUT';
  const isRoundTrip = championship.group_stage_format === 'ROUND_TRIP';

  const { data: groups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['championship-groups-for-matches', championship.id],
    queryFn: () => championshipsAPI.getGroups(championship.id),
    enabled: isGroupsKnockout,
    staleTime: 30_000,
  });

  const handleContest = (match: Match) => {
    setContestingMatch(match);
    const userTeamId = user?.team_owner_profile
      ? match.home_team.owner.id === user.id
        ? match.home_team.id
        : match.away_team.id
      : undefined;
    setContestingTeamId(userTeamId || match.home_team.id);
  };

  const activeMatches = useMemo(
    () => matches.filter((match) => match.status !== 'CANCELLED'),
    [matches],
  );

  const groupedData = useMemo(() => {
    const teamToGroup = buildGroupTeamMap(groups);
    const legMap = buildLegMap(activeMatches);

    const visibleMatches = activeMatches.filter((match) => {
      if (!isGroupsKnockout) return true;

      const groupName = teamToGroup.get(match.home_team.id) || teamToGroup.get(match.away_team.id) || 'Sem grupo';
      if (selectedGroup !== 'all' && groupName !== selectedGroup) return false;

      if (isRoundTrip && selectedLeg !== 'all') {
        const leg = legMap.get(match.id) || 1;
        if (selectedLeg === 'first_leg' && leg !== 1) return false;
        if (selectedLeg === 'second_leg' && leg !== 2) return false;
      }

      return true;
    });

    if (!isGroupsKnockout) {
      return {
        simple: visibleMatches.reduce((acc, match) => {
          const round = match.round_number || 0;
          if (!acc[round]) acc[round] = [];
          acc[round].push(match);
          return acc;
        }, {} as Record<number, Match[]>),
        grouped: null as null | Array<{ groupName: string; rounds: Array<{ round: number; legs: Array<{ label: string; matches: Match[] }> }> }>,
      };
    }

    const roundsByGroup = new Map<string, Map<number, Match[]>>();
    for (const match of visibleMatches) {
      const groupName = teamToGroup.get(match.home_team.id) || teamToGroup.get(match.away_team.id) || 'Sem grupo';
      const round = match.round_number || 0;
      const groupRounds = roundsByGroup.get(groupName) || new Map<number, Match[]>();
      const roundMatches = groupRounds.get(round) || [];
      roundMatches.push(match);
      groupRounds.set(round, roundMatches);
      roundsByGroup.set(groupName, groupRounds);
    }

    const grouped = Array.from(roundsByGroup.entries())
      .sort(([a], [b]) => a.localeCompare(b, 'pt-BR'))
      .map(([groupName, roundsMap]) => ({
        groupName,
        rounds: Array.from(roundsMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, roundMatches]) => {
            const sortedRoundMatches = [...roundMatches].sort(
              (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime(),
            );

            if (!isRoundTrip) {
              return {
                round,
                legs: [{ label: 'Partidas', matches: sortedRoundMatches }],
              };
            }

            const firstLeg = sortedRoundMatches.filter((match) => (legMap.get(match.id) || 1) === 1);
            const secondLeg = sortedRoundMatches.filter((match) => (legMap.get(match.id) || 1) === 2);
            const legs = [] as Array<{ label: string; matches: Match[] }>;
            if (firstLeg.length > 0) legs.push({ label: 'Ida', matches: firstLeg });
            if (secondLeg.length > 0) legs.push({ label: 'Volta', matches: secondLeg });
            if (legs.length === 0) legs.push({ label: 'Partidas', matches: sortedRoundMatches });

            return { round, legs };
          }),
      }));

    return { simple: {} as Record<number, Match[]>, grouped };
  }, [activeMatches, groups, isGroupsKnockout, isRoundTrip, selectedGroup, selectedLeg]);

  const groupFilters = useMemo(() => ['all', ...groups.map((group) => group.name)], [groups]);

  if (activeMatches.length === 0) {
    return (
      <EmptyState
        icon={<Swords className="mx-auto h-14 w-14 text-gold/40" />}
        title={isRestrictedViewer ? 'Nenhuma partida do seu time encontrada nesta rodada.' : 'Nenhuma partida agendada'}
        description={isRestrictedViewer ? 'Somente partidas relacionadas ao seu time são exibidas aqui.' : 'As partidas serão exibidas assim que o campeonato começar.'}
        size="lg"
      />
    );
  }

  return (
    <div className="space-y-6">
      {isGroupsKnockout && (
        <div className="space-y-4 rounded-2xl border border-border bg-surface1 p-4">
          {isLoadingGroups ? (
            <Skeleton className="h-12 rounded-xl" />
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {groupFilters.map((group) => (
                  <button
                    key={group}
                    onClick={() => setSelectedGroup(group)}
                    className={`rounded-xl border px-4 py-2 text-sm transition-colors ${selectedGroup === group ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface2 text-muted hover:text-text'}`}
                  >
                    {group === 'all' ? 'Todos os grupos' : group}
                  </button>
                ))}
              </div>

              {isRoundTrip && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'Ida + Volta' },
                    { id: 'first_leg', label: 'Só Ida' },
                    { id: 'second_leg', label: 'Só Volta' },
                  ].map((leg) => (
                    <button
                      key={leg.id}
                      onClick={() => setSelectedLeg(leg.id as LegFilter)}
                      className={`rounded-xl border px-4 py-2 text-sm transition-colors ${selectedLeg === leg.id ? 'border-gold/40 bg-gold/10 text-gold' : 'border-border bg-surface2 text-muted hover:text-text'}`}
                    >
                      {leg.label}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!isGroupsKnockout &&
        Object.entries(groupedData.simple)
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([round, roundMatches]) => (
            <div key={round}>
              {round !== '0' && <h2 className="mb-4 text-lg font-bold text-text">Rodada {round}</h2>}
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

      {isGroupsKnockout && groupedData.grouped?.map((group) => (
        <div key={group.groupName} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold to-gold2 font-mono font-bold text-background">
              {group.groupName.split(' ')[1] || group.groupName.at(-1)}
            </div>
            <h2 className="text-xl font-bold text-text">{group.groupName}</h2>
          </div>

          {group.rounds.map((round) => (
            <div key={`${group.groupName}-${round.round}`} className="space-y-3 rounded-2xl border border-border bg-surface1 p-4">
              {round.round !== 0 && <h3 className="text-base font-semibold text-text">Rodada {round.round}</h3>}

              {round.legs.map((leg) => (
                <div key={`${group.groupName}-${round.round}-${leg.label}`} className="space-y-3">
                  {isRoundTrip && <p className="text-xs font-mono uppercase tracking-widest text-gold">{leg.label}</p>}

                  {leg.matches.map((match) => (
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
              ))}
            </div>
          ))}
        </div>
      ))}

      {reportingMatch && (
        <MatchReportModal match={reportingMatch} isOpen={true} onClose={() => setReportingMatch(null)} />
      )}

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

      {eaReportingMatch && (
        <EAReportModal match={eaReportingMatch} isOpen={true} onClose={() => setEaReportingMatch(null)} />
      )}
    </div>
  );
}
