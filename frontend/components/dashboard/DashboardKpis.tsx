'use client';

import type { ReactNode } from 'react';
import { Trophy, Goal, Handshake, Star, Users, Calendar, Mail, Shield, Gamepad2, Percent, Target } from 'lucide-react';
import type {
  User, Team, CompetitiveMyRankingPayload, GlobalTeamRankingRow,
} from '@/types';
import type { PlatformStats } from '@/lib/api';
import { KpiTrendCard } from '@/components/statistics/KpiTrendCard';

type Kpi = { icon: ReactNode; value: string | number; label: string; sublabel?: string; accent: 'gold' | 'green' | 'brand' | 'warning' };

interface Props {
  user: User;
  stats: { openChampionships: number; upcomingMatches: number; pendingInvitations: number; hasTeam: boolean };
  myRank?: CompetitiveMyRankingPayload;
  myTeam?: Team | null;
  teamRanking: GlobalTeamRankingRow[];
  platformStats?: PlatformStats;
  isAdmin?: boolean;
}

export function DashboardKpis({ user, stats, myRank, myTeam, teamRanking, platformStats, isAdmin }: Props) {
  let kpis: Kpi[];

  if (isAdmin && platformStats) {
    kpis = [
      { icon: <Users className="h-5 w-5" />, value: platformStats.players, label: 'Jogadores', accent: 'brand' },
      { icon: <Shield className="h-5 w-5" />, value: platformStats.teams, label: 'Times', accent: 'gold' },
      { icon: <Trophy className="h-5 w-5" />, value: platformStats.championships, label: 'Campeonatos', accent: 'green' },
      { icon: <Calendar className="h-5 w-5" />, value: platformStats.matches, label: 'Partidas', accent: 'warning' },
    ];
  } else if (user.user_type === 'PLAYER' && myRank && myRank.matchesPlayed > 0) {
    kpis = [
      { icon: <Trophy className="h-5 w-5" />, value: myRank.generalPosition != null ? `#${myRank.generalPosition}` : '—', label: 'Posição no ranking', accent: 'gold' },
      { icon: <Star className="h-5 w-5" />, value: myRank.averageRating ? myRank.averageRating.toFixed(1) : '—', label: 'Nota média', accent: 'gold' },
      { icon: <Goal className="h-5 w-5" />, value: myRank.goals, label: 'Gols', accent: 'green' },
      { icon: <Handshake className="h-5 w-5" />, value: myRank.assists, label: 'Assistências', accent: 'brand' },
    ];
  } else {
    const teamRow = myTeam ? teamRanking.find((r) => r.team_id === myTeam.id) : undefined;
    if (myTeam && teamRow) {
      kpis = [
        { icon: <Trophy className="h-5 w-5" />, value: `#${teamRow.position}`, label: 'Posição do time', sublabel: teamRow.tier_display, accent: 'gold' },
        { icon: <Gamepad2 className="h-5 w-5" />, value: teamRow.matches_played, label: 'Partidas', accent: 'brand' },
        { icon: <Target className="h-5 w-5" />, value: teamRow.goal_difference > 0 ? `+${teamRow.goal_difference}` : teamRow.goal_difference, label: 'Saldo de gols', accent: 'green' },
        { icon: <Percent className="h-5 w-5" />, value: `${Math.round(teamRow.win_rate)}%`, label: 'Aproveitamento', accent: 'gold' },
      ];
    } else {
      // Fallback genérico (sem time/ranking ainda)
      kpis = [
        { icon: <Shield className="h-5 w-5" />, value: stats.hasTeam ? '1' : '0', label: 'Seu time', accent: 'gold' },
        { icon: <Trophy className="h-5 w-5" />, value: stats.openChampionships, label: 'Campeonatos abertos', accent: 'green' },
        { icon: <Calendar className="h-5 w-5" />, value: stats.upcomingMatches, label: 'Próximas partidas', accent: 'brand' },
        { icon: <Mail className="h-5 w-5" />, value: stats.pendingInvitations, label: 'Convites', accent: 'warning' },
      ];
    }
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k, i) => (
        <KpiTrendCard key={k.label} icon={k.icon} value={k.value} label={k.label} sublabel={k.sublabel} accent={k.accent} index={i} />
      ))}
    </div>
  );
}
