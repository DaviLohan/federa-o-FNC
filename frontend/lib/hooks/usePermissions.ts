'use client';

import { useAuthStore } from '@/lib/auth-store';
import type { Match, Team, Championship } from '@/types';

/**
 * Hook para verificar permissões do usuário
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  /**
   * Verifica se o usuário pode gerenciar campeonatos (criar, editar, deletar)
   */
  const canManageChampionships = (): boolean => {
    if (!user) return false;
    return user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
  };

  /**
   * Verifica se o usuário pode reportar uma partida específica
   * Apenas o dono de um dos times pode reportar
   */
  const canReportMatch = (match: Match): boolean => {
    if (!user) return false;

    if (typeof match.can_report === 'boolean') {
      return match.can_report;
    }

    // Admin e Supervisor sempre podem
    if (user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor) {
      return match.status === 'IN_PROGRESS' || match.status === 'FINISHED' || match.status === 'CONTESTED';
    }

    // Team Owner pode reportar se for dono de um dos times
    if (user.user_type === 'TEAM_OWNER') {
      const isHomeOwner = match.home_team.owner.id === user.id;
      const isAwayOwner = match.away_team.owner.id === user.id;
      return (isHomeOwner || isAwayOwner) && (match.status === 'IN_PROGRESS' || match.status === 'FINISHED' || match.status === 'CONTESTED');
    }

    return false;
  };

  const canStartMatch = (match: Match): boolean => {
    if (!user) return false;

    const isSupervisor = user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
    const isOwner = match.home_team.owner.id === user.id || match.away_team.owner.id === user.id;

    if (!isSupervisor && !isOwner) {
      return false;
    }

    return match.status === 'SCHEDULED' && !!match.can_start_now;
  };

  /**
   * Verifica se o usuário pode contestar uma partida
   * Jogador pode contestar se participou, Team Owner se é dono do time
   */
  const canContestMatch = (match: Match, userTeamId?: number): boolean => {
    if (!user) return false;

    // Admin e Supervisor sempre podem
    if (user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor) {
      return true;
    }

    // Team Owner pode contestar se for dono de um dos times
    if (user.user_type === 'TEAM_OWNER') {
      const isHomeOwner = match.home_team.owner.id === user.id;
      const isAwayOwner = match.away_team.owner.id === user.id;
      return isHomeOwner || isAwayOwner;
    }

    // Jogador pode contestar se participou da partida (precisa do userTeamId)
    if (user.user_type === 'PLAYER' && userTeamId) {
      return match.home_team.id === userTeamId || match.away_team.id === userTeamId;
    }

    return false;
  };

  /**
   * Verifica se o usuário pode inscrever times em campeonatos
   */
  const canEnrollTeam = (team?: Team): boolean => {
    if (!user) return false;

    // Admin e Supervisor sempre podem
    if (user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor) {
      return true;
    }

    // Team Owner pode inscrever seus próprios times
    if (user.user_type === 'TEAM_OWNER' && team) {
      return team.owner.id === user.id;
    }

    return false;
  };

  /**
   * Verifica se o usuário pode ver reports/contestations (admin only)
   */
  const canViewReports = (): boolean => {
    if (!user) return false;
    return user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
  };

  /**
   * Verifica se o usuário pode aprovar/rejeitar contestações
   */
  const canReviewContestations = (): boolean => {
    if (!user) return false;
    return user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
  };

  /**
   * Verifica se o usuário é dono de um time específico
   */
  const isTeamOwner = (team?: Team): boolean => {
    if (!user || !team) return false;
    return team.owner.id === user.id;
  };

  /**
   * Verifica se usuário pode visualizar todos os times (Admin/Supervisor)
   */
  const canViewAllTeams = (): boolean => {
    if (!user) return false;
    return user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
  };

  /**
   * Verifica se usuário pode visualizar elenco de um time específico
   * @param team Time a ser verificado
   * @returns true se pode visualizar o elenco
   */
  const canViewTeamRoster = (team?: Team): boolean => {
    if (!user || !team) return false;
    
    // Admin e Supervisor podem ver qualquer elenco
    if (user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor) {
      return true;
    }
    
    // Owner pode ver seu próprio elenco
    return team.owner.id === user.id;
  };

  /**
   * Verifica se usuário pode gerenciar chaveamento
   * @param championship Campeonato a ser verificado
   * @returns true se pode gerenciar chaveamento
   */
  const canManageBracket = (championship?: Championship): boolean => {
    if (!user || !championship) return false;
    return user.user_type === 'ADMIN' || user.user_type === 'SUPERVISOR' || !!user.is_supervisor;
  };

  /**
   * Verifica se usuário pode gerar chaveamento
   * @param championship Campeonato a ser verificado
   * @returns true se pode gerar chaveamento
   */
  const canGenerateBracket = (championship?: Championship): boolean => {
    if (!canManageBracket(championship)) return false;
    if (!championship) return false;
    
    return (
      championship.championship_type === 'GROUPS_KNOCKOUT' &&
      championship.current_phase === 'GROUPS'
    );
  };

  return {
    user,
    canManageChampionships: canManageChampionships(),
    canReportMatch,
    canStartMatch,
    canContestMatch,
    canEnrollTeam,
    canViewReports: canViewReports(),
    canReviewContestations: canReviewContestations(),
    isTeamOwner,
    canViewAllTeams: canViewAllTeams(),
    canViewTeamRoster,
    canManageBracket,
    canGenerateBracket,
  };
}
