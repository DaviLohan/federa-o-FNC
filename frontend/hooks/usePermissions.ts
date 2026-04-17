import { useAuthStore } from '@/lib/auth-store';

/**
 * Hook para verificar permissões do usuário baseado em seu tipo
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  const isAdmin = user?.user_type === 'ADMIN';
  const isSupervisor = user?.user_type === 'SUPERVISOR' || !!user?.is_supervisor;
  const isTeamOwner = user?.user_type === 'TEAM_OWNER';
  const isPlayer = user?.user_type === 'PLAYER';

  // Permissões agregadas
  const canManageChampionships = isAdmin || isSupervisor;
  const canViewAllTeams = isAdmin || isSupervisor;
  const canManageTeam = (teamId?: number, ownerId?: number) => {
    if (!user) return false;
    if (isAdmin || isSupervisor) return true;
    if (isTeamOwner && ownerId === user.id) return true;
    return false;
  };

  return {
    user,
    isAdmin,
    isSupervisor,
    isTeamOwner,
    isPlayer,
    canManageChampionships,
    canViewAllTeams,
    canManageTeam,
  };
}
