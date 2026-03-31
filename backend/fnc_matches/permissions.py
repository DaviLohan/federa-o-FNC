from rest_framework import permissions


class IsMatchParticipantOrAdmin(permissions.BasePermission):
    """
    Permissão customizada: apenas times participantes da partida ou admins podem acessar/editar.
    """
    
    def has_object_permission(self, request, view, obj):
        # Admins podem acessar tudo
        if request.user.is_superuser:
            return True
        
        # Permitir leitura para todos
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Verificar se o usuário é dono de um dos times participantes
        # obj pode ser Match, Goal, Card, etc
        match = obj if hasattr(obj, 'home_team') else obj.match
        
        is_participant = (
            match.home_team.owner == request.user or
            match.away_team.owner == request.user
        )
        
        return is_participant


class CanSubmitMatchReport(permissions.BasePermission):
    """
    Permissão customizada: apenas times participantes podem submeter súmula.
    """
    
    def has_permission(self, request, view):
        # Admins sempre podem
        if request.user.is_superuser:
            return True
        
        # Verificar se o usuário tem times
        return hasattr(request.user, 'owned_teams') and request.user.owned_teams.exists()
    
    def has_object_permission(self, request, view, obj):
        # Admins sempre podem
        if request.user.is_superuser:
            return True
        
        # Apenas times participantes podem editar
        match = obj.match if hasattr(obj, 'match') else obj
        
        is_participant = (
            match.home_team.owner == request.user or
            match.away_team.owner == request.user
        )
        
        return is_participant


class CanManageMatchReport(permissions.BasePermission):
    """
    Permissão customizada: apenas admins podem aprovar/rejeitar súmulas.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_superuser


class CanContestMatch(permissions.BasePermission):
    """
    Permissão customizada: apenas times participantes podem contestar resultados.
    """
    
    def has_permission(self, request, view):
        # Verificar se o usuário tem times
        return hasattr(request.user, 'owned_teams') and request.user.owned_teams.exists()
    
    def has_object_permission(self, request, view, obj):
        # Admins sempre podem visualizar
        if request.user.is_superuser:
            return True
        
        # Apenas o time que contestou pode editar sua própria contestação
        if request.method not in permissions.SAFE_METHODS:
            return obj.contested_by_team.owner == request.user
        
        # Times participantes podem visualizar
        match = obj.match
        is_participant = (
            match.home_team.owner == request.user or
            match.away_team.owner == request.user
        )
        
        return is_participant


class CanReviewContestation(permissions.BasePermission):
    """
    Permissão customizada: apenas admins podem analisar contestações.
    """
    
    def has_permission(self, request, view):
        return request.user and request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        return request.user and request.user.is_superuser
