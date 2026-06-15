'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { championshipsAPI } from '@/lib/api';
import { useToast } from '@/components/shared/ui';
import { usePermissions } from '@/lib/hooks';
import { Trophy, Zap } from 'lucide-react';
import type { Bracket, Championship, Match } from '@/types';
import { BracketMatchCard, type BracketTieView } from './BracketMatchCard';
import { EAReportModal } from '../modals';

interface BracketTabV2Props {
  championship: Championship;
  bracket?: Bracket;
  matches?: Match[];
}

function pairKey(match: Match) {
  return [match.home_team.id, match.away_team.id].sort((a, b) => a - b).join(':');
}

function hasOpenContestation(match?: Match) {
  if (!match?.contestations?.length) return false;
  return match.contestations.some((c) => c.status === 'PENDING' || c.status === 'UNDER_REVIEW');
}

function hasReport(match?: Match) {
  if (!match) return false;
  return !!match.report || !!match.has_report;
}

function hasOfficialResult(match?: Match) {
  if (!match) return false;
  if (match.status !== 'FINISHED') return false;
  if (match.report_status === 'APPROVED') return true;
  return hasReport(match);
}

function formatWhen(match?: Match) {
  if (!match) return 'Aguardando partida';
  const dt = new Date(match.scheduled_date);
  const now = new Date();
  const sameDay = dt.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = dt.toDateString() === tomorrow.toDateString();
  const hh = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return `Hoje às ${hh}`;
  if (isTomorrow) return `Amanhã às ${hh}`;
  return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function canOpenReportForMatch(match?: Match) {
  if (!match) return false;
  if (match.status !== 'IN_PROGRESS' && match.status !== 'FINISHED' && match.status !== 'CONTESTED') return false;
  if (hasReport(match)) return false;
  return true;
}

function getTieStatus(tie: { firstLeg?: Match; secondLeg?: Match; winnerId?: number; canReport: boolean }) {
  const legs = [tie.firstLeg, tie.secondLeg].filter(Boolean) as Match[];
  if (!legs.length) return { label: 'A definir', tone: 'neutral' as const };
  if (legs.some((m) => m.status === 'CONTESTED' || hasOpenContestation(m))) return { label: 'Contestação aberta', tone: 'danger' as const };
  if (legs.some((m) => m.status === 'IN_PROGRESS')) return { label: 'Em andamento', tone: 'info' as const };
  if (legs.some((m) => m.report_status === 'SUBMITTED' || m.report_status === 'PENDING')) return { label: 'Aguardando confirmação', tone: 'warning' as const };
  if (legs.some((m) => m.report_status === 'REJECTED')) return { label: 'Aguardando novo reporte', tone: 'warning' as const };
  // Em mata-mata de ida/volta, uma única mão aprovada NÃO fecha o confronto.
  const isTwoLeg = !!tie.firstLeg && !!tie.secondLeg;
  if (isTwoLeg) {
    const firstDone = hasOfficialResult(tie.firstLeg);
    const secondDone = hasOfficialResult(tie.secondLeg);
    if (!(firstDone && secondDone)) {
      return { label: firstDone ? 'Aguardando volta' : 'Aguardando resultados', tone: 'warning' as const };
    }
    // Ambas as mãos jogadas: só é aprovado quando há classificado definido.
    if (!tie.winnerId) {
      return { label: 'Aguardando decisão', tone: 'warning' as const };
    }
    return { label: 'Resultado aprovado', tone: 'success' as const };
  }
  if (legs.some((m) => m.report_status === 'APPROVED')) return { label: 'Resultado aprovado', tone: 'success' as const };
  if (legs.every((m) => m.status === 'FINISHED') && tie.winnerId) return { label: 'Resultado aprovado', tone: 'success' as const };
  if (legs.some((m) => new Date(m.scheduled_date).getTime() <= Date.now()) && !legs.some((m) => hasReport(m))) {
    return { label: 'Aguardando report', tone: 'warning' as const };
  }
  if (tie.canReport) return { label: 'Aguardando reporte', tone: 'warning' as const };
  return { label: 'Agendado', tone: 'neutral' as const };
}

function mapBracketTies(bracket: Bracket | undefined, matches: Match[], canReportMatch: (match: Match) => boolean): Array<{ roundName: string; ties: BracketTieView[] }> {
  const activeMatches = matches.filter((m) => m.status !== 'CANCELLED');
  const matchById = new Map(activeMatches.map((m) => [m.id, m]));
  const matchesByRound = new Map<number, Match[]>();

  const bracketMatchIds = new Set<number>();
  for (const round of bracket?.structure?.rounds || []) {
    for (const rawMatch of round.matches || []) {
      if (rawMatch.match_id) {
        bracketMatchIds.add(rawMatch.match_id);
      }
    }
  }

  const knockoutCandidates = activeMatches.filter((m) => m.match_type === 'PLAYOFF' || m.match_type === 'FINAL');

  for (const match of knockoutCandidates) {
    const round = match.round_number || 1;
    const current = matchesByRound.get(round) || [];
    current.push(match);
    matchesByRound.set(round, current);
  }

  const rounds = bracket?.structure?.rounds || [];

  // Vencedor registrado no chaveamento por par de times (inclui desempate manual
  // de agregado por pênaltis, definido pelo admin via resolve-aggregate-tie).
  const structureWinnerByPair = new Map<string, number>();
  for (const round of rounds) {
    for (const md of (round.matches || []) as Array<Record<string, any>>) {
      const t1 = md.team1?.id ?? md.home_team_id;
      const t2 = md.team2?.id ?? md.away_team_id;
      const w = md.winner?.id ?? md.winner_id;
      if (t1 && t2 && w) {
        structureWinnerByPair.set([t1, t2].sort((a, b) => a - b).join(':'), w);
      }
    }
  }

  const hasRounds = rounds.length > 0;
  const roundNumbers = hasRounds
    ? rounds.map((r) => r.round_number)
    : Array.from(matchesByRound.keys()).sort((a, b) => a - b);

  return roundNumbers.map((roundNumber, index) => {
    const configuredRound = rounds.find((r) => r.round_number === roundNumber);
    const roundName = configuredRound?.round_name || `Rodada ${roundNumber}`;
    const roundMatches = [...(matchesByRound.get(roundNumber) || [])].sort(
      (a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime() || a.id - b.id,
    );

    const grouped = new Map<string, Match[]>();
    for (const match of roundMatches) {
      const key = pairKey(match);
      const list = grouped.get(key) || [];
      list.push(match);
      grouped.set(key, list);
    }

    const ties: BracketTieView[] = Array.from(grouped.values()).map((pairMatches, tieIndex) => {
      const [firstLeg, secondLeg] = pairMatches;
      const teamA = firstLeg?.home_team;
      const teamB = firstLeg?.away_team;
      const firstOfficial = hasOfficialResult(firstLeg);
      const secondOfficial = hasOfficialResult(secondLeg);
      const homeAgg = (firstOfficial ? (firstLeg?.home_score || 0) : 0) + (secondOfficial && secondLeg ? (secondLeg.home_team.id === teamA?.id ? secondLeg.home_score : secondLeg.away_score) : 0);
      const awayAgg = (firstOfficial ? (firstLeg?.away_score || 0) : 0) + (secondOfficial && secondLeg ? (secondLeg.home_team.id === teamB?.id ? secondLeg.home_score : secondLeg.away_score) : 0);
      const secondLegFinished = !!secondLeg && secondOfficial;

      let winnerId: number | undefined;
      if (secondLeg && secondLegFinished && firstOfficial) {
        if (homeAgg > awayAgg) winnerId = teamA?.id;
        if (awayAgg > homeAgg) winnerId = teamB?.id;
      } else if (!secondLeg && firstOfficial && firstLeg?.winner) {
        winnerId = firstLeg.winner.id;
      }
      // Fallback: classificado registrado no chaveamento (ex.: desempate por pênaltis).
      if (!winnerId && (firstLeg || secondLeg)) {
        winnerId = structureWinnerByPair.get(pairKey((firstLeg || secondLeg) as Match));
      }

      const reportMatch =
        pairMatches.find((m) => m.status === 'IN_PROGRESS')
        || pairMatches.find((m) => m.status === 'SCHEDULED')
        || pairMatches.find((m) => m.status === 'FINISHED')
        || pairMatches[0];
      const canReport = !!reportMatch && canReportMatch(reportMatch);
      const tieClosed = !!winnerId;
      const canOpenReport = !tieClosed && canOpenReportForMatch(reportMatch);
      const status = getTieStatus({ firstLeg, secondLeg, winnerId, canReport });

      const firstLegLabel = firstOfficial && firstLeg
        ? `${firstLeg.home_team.abbreviation} ${firstLeg.home_score} x ${firstLeg.away_score} ${firstLeg.away_team.abbreviation}`
        : formatWhen(firstLeg);
      const secondLegLabel = secondLeg
        ? (secondOfficial
          ? `${secondLeg.home_team.abbreviation} ${secondLeg.home_score} x ${secondLeg.away_score} ${secondLeg.away_team.abbreviation}`
          : formatWhen(secondLeg))
        : undefined;

      const aggregateReady = (!!secondLeg && firstOfficial && secondOfficial) || (!secondLeg && firstOfficial);
      const aggregatePartial = (firstOfficial || secondOfficial) && !aggregateReady;

      return {
        id: `${roundNumber}-${tieIndex + 1}`,
        roundName,
        teamA,
        teamB,
        firstLeg,
        secondLeg,
        winnerId,
        aggregate: secondLeg
          ? { home: homeAgg, away: awayAgg, label: `${teamA?.abbreviation || 'A'} ${homeAgg} x ${awayAgg} ${teamB?.abbreviation || 'B'}` }
          : (firstLeg ? { home: firstLeg.home_score, away: firstLeg.away_score, label: `${firstLeg.home_team.abbreviation} ${firstLeg.home_score} x ${firstLeg.away_score} ${firstLeg.away_team.abbreviation}` } : undefined),
        aggregateReady,
        aggregatePartial,
        firstLegLabel,
        secondLegLabel,
        statusLabel: status.label,
        statusTone: status.tone,
        canReport,
        canOpenReport,
        reportMatch,
      };
    });

    const roundMatchIds = (configuredRound?.matches || [])
      .map((m) => m.match_id)
      .filter((id): id is number => typeof id === 'number');

    for (const id of roundMatchIds) {
      if (ties.some((tie) => tie.firstLeg?.id === id || tie.secondLeg?.id === id)) {
        continue;
      }
      const match = matchById.get(id);
      if (!match) {
        continue;
      }

      const canReport = canReportMatch(match);
      const canOpenReport = match.status !== 'FINISHED' && canOpenReportForMatch(match);
      const status = getTieStatus({ firstLeg: match, canReport, winnerId: match.winner?.id });
      ties.push({
        id: `${roundNumber}-id-${id}`,
        roundName,
        teamA: match.home_team,
        teamB: match.away_team,
        firstLeg: match,
        winnerId: match.winner?.id,
        aggregate: {
          home: match.home_score,
          away: match.away_score,
          label: `${match.home_team.abbreviation} ${match.home_score} x ${match.away_score} ${match.away_team.abbreviation}`,
        },
        statusLabel: status.label,
        statusTone: status.tone,
        canReport,
        canOpenReport,
        reportMatch: match,
      });
    }

    for (const raw of configuredRound?.matches || []) {
      if (raw.match_id) continue;
      if (!raw.team1 && !raw.team2) continue;

      const alreadyRendered = ties.some(
        (tie) =>
          (tie.teamA?.id || null) === (raw.team1?.id || null)
          && (tie.teamB?.id || null) === (raw.team2?.id || null)
          && !tie.firstLeg
          && !tie.secondLeg,
      );
      if (alreadyRendered) continue;

      ties.push({
        id: `${roundNumber}-seed-${raw.team1?.id || 'tbd'}-${raw.team2?.id || 'tbd'}-${ties.length + 1}`,
        roundName,
        teamA: raw.team1,
        teamB: raw.team2,
        statusLabel: 'Aguardando reporte',
        statusTone: 'warning',
        canReport: false,
        canOpenReport: false,
      });
    }

    const fallbackSlots = configuredRound?.matches?.length || 0;
    while (ties.length < fallbackSlots) {
      const status = getTieStatus({ canReport: false });
      ties.push({
        id: `${roundNumber}-tbd-${ties.length + 1}`,
        roundName,
        statusLabel: status.label,
        statusTone: status.tone,
        canReport: false,
        canOpenReport: false,
      });
    }

    return { roundName: index === 0 ? roundName : roundName, ties };
  });
}

export function BracketTabV2({ championship, bracket, matches = [] }: BracketTabV2Props) {
  const { canManageBracket, canGenerateBracket, canReportMatch } = usePermissions();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [eaReportingMatch, setEaReportingMatch] = useState<Match | null>(null);

  const mappedRounds = useMemo(() => mapBracketTies(bracket, matches, canReportMatch), [bracket, matches, canReportMatch]);

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

  if ((!bracket || !bracket.structure) && mappedRounds.every((r) => r.ties.length === 0)) {
    const canGenerate = canGenerateBracket(championship);
    return (
      <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface1 to-surface2 p-12">
        <div className="relative z-10 mx-auto max-w-lg text-center">
          <div className="mb-6 text-8xl animate-pulse-slow">🏆</div>
          <h3 className="mb-4 text-2xl font-heading font-bold text-text">Chaveamento ainda não gerado</h3>
          <p className="mb-8 text-base leading-relaxed text-muted2">O chaveamento aparecerá quando a fase eliminatória estiver pronta.</p>
          {canGenerate && canManageBracket(championship) && (
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-gold via-gold to-gold2 px-8 py-4 font-heading text-lg font-bold text-background shadow-xl shadow-gold/30 transition-all hover:scale-105 disabled:opacity-50"
            >
              <Zap className="h-5 w-5" />
              <span>{generateMutation.isPending ? 'Gerando...' : 'Gerar Chaveamento'}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="hidden overflow-x-auto pb-4 lg:block">
        <div className="flex min-w-max gap-8 px-2">
          {mappedRounds.map((round, idx) => (
            <div key={`${round.roundName}-${idx}`} className="w-[340px] flex-shrink-0 space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-2">
                  <Trophy className="h-4 w-4 text-gold" />
                  <span className="text-sm font-heading font-bold text-gold">{round.roundName}</span>
                </div>
              </div>
              <div className="space-y-5">
                {round.ties.map((tie) => (
                  <BracketMatchCard
                    key={tie.id}
                    tie={tie}
                    onReportEA={(match) => setEaReportingMatch(match)}
                    onViewMatch={(match) => router.push(`/matches/${match.id}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 lg:hidden">
        {mappedRounds.map((round, idx) => (
          <section key={`${round.roundName}-${idx}`} className="space-y-3 rounded-2xl border border-border bg-surface1 p-4">
            <h3 className="text-sm font-heading font-bold uppercase tracking-widest text-gold">{round.roundName}</h3>
            {round.ties.map((tie) => (
              <BracketMatchCard
                key={tie.id}
                tie={tie}
                compact
                onReportEA={(match) => setEaReportingMatch(match)}
                onViewMatch={(match) => router.push(`/matches/${match.id}`)}
              />
            ))}
          </section>
        ))}
      </div>

      {eaReportingMatch && (
        <EAReportModal match={eaReportingMatch} isOpen={true} onClose={() => setEaReportingMatch(null)} />
      )}
    </div>
  );
}
