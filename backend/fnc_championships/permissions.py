from rest_framework import permissions


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada: apenas ADMIN e SUPERVISOR podem criar/editar campeonatos.
    Outros usuários podem apenas visualizar.
    """
    
    def has_permission(self, request, view):
        # Permitir operações de leitura para qualquer usuário autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Apenas ADMIN e SUPERVISOR podem criar/editar/deletar campeonatos
        return (
            request.user and 
            request.user.user_type in ['ADMIN', 'SUPERVISOR']
        )
    
    def has_object_permission(self, request, view, obj):
        # Permitir operações de leitura para qualquer usuário autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Apenas ADMIN e SUPERVISOR podem editar/deletar campeonatos
        return (
            request.user and 
            request.user.user_type in ['ADMIN', 'SUPERVISOR']
        )


class IsEnrolledTeamOrAdmin(permissions.BasePermission):
    """
    Permissão customizada: apenas times inscritos ou admins podem acessar certos dados do campeonato.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins e Supervisors podem acessar tudo
        if request.user.user_type in ['ADMIN', 'SUPERVISOR']:
            return True
        
        # Verificar se o usuário é dono de um time inscrito
        # obj pode ser Championship, ChampionshipEnrollment, etc
        championship = obj if hasattr(obj, 'enrollments') else obj.championship
        
        # Buscar times do usuário que estão inscritos neste campeonato
        user_teams = request.user.owned_teams.all()
        enrolled = championship.enrollments.filter(
            team__in=user_teams
        ).exists()
        
        return enrolled


class CanEnrollTeam(permissions.BasePermission):
    """
    Permissão customizada: apenas donos de times podem inscrever times.
    """
    
    def has_permission(self, request, view):
        # Verificar se o usuário tem algum time
        return hasattr(request.user, 'owned_teams') and request.user.owned_teams.exists()


class CanManageEnrollment(permissions.BasePermission):
    """
    Permissão customizada: apenas admins ou o dono do time podem gerenciar inscrição.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins e Supervisors podem gerenciar qualquer inscrição
        if request.user.user_type in ['ADMIN', 'SUPERVISOR']:
            return True
        
        # Dono do time pode gerenciar apenas sua própria inscrição
        return obj.team.owner == request.user
