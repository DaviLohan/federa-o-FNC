from rest_framework import permissions
from fnc_teams.models import TeamMembership


class IsTeamOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada: apenas o dono do time pode editá-lo.
    Outros usuários podem apenas visualizar.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permitir operações de leitura para qualquer usuário autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Verificar se obj é um Team
        if hasattr(obj, 'owner'):
            return obj.owner == request.user
        
        # Para outros objetos relacionados a time (Membership, Invitation, etc)
        if hasattr(obj, 'team'):
            return obj.team.owner == request.user
        
        return False


class IsTeamMemberOrOwner(permissions.BasePermission):
    """
    Permissão customizada: apenas membros do time ou o dono podem acessar.
    """
    
    def has_object_permission(self, request, view, obj):
        # Verificar se é o dono do time
        if hasattr(obj, 'owner'):
            if obj.owner == request.user:
                return True
        
        if hasattr(obj, 'team'):
            # Verificar se é o dono do time
            if obj.team.owner == request.user:
                return True
            
            # Verificar se é membro do time
            try:
                player_profile = request.user.player_profile
                return obj.team.memberships.filter(
                    player=player_profile,
                    is_active=True
                ).exists()
            except:
                return False
        
        return False


class IsInvitedPlayerOrTeamOwner(permissions.BasePermission):
    """
    Permissão customizada: apenas o jogador convidado ou gestores de elenco (dono/capitão) podem acessar o convite.
    """
    
    def has_object_permission(self, request, view, obj):
        # obj é TeamInvitation
        # Verificar se é gestor do elenco (dono/capitão)
        if obj.team.owner == request.user:
            return True

        if hasattr(request.user, 'player_profile'):
            if TeamMembership.objects.filter(
                team=obj.team,
                player=request.user.player_profile,
                role=TeamMembership.Role.CAPTAIN,
                is_active=True,
            ).exists():
                return True

        # Verificar se é o jogador que recebeu o convite
        if hasattr(request.user, 'player_profile'):
            return obj.player == request.user.player_profile
        
        return False


class CanManageFormation(permissions.BasePermission):
    """
    Permissão customizada: apenas o dono do time pode gerenciar formações.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permitir leitura para membros do time
        if request.method in permissions.SAFE_METHODS:
            if hasattr(request.user, 'player_profile'):
                player_profile = request.user.player_profile
                if obj.team.memberships.filter(
                    player=player_profile,
                    is_active=True
                ).exists():
                    return True
        
        if obj.team.owner == request.user:
            return True

        if not hasattr(request.user, 'player_profile'):
            return False

        return TeamMembership.objects.filter(
            team=obj.team,
            player=request.user.player_profile,
            is_active=True,
            role__in=[
                TeamMembership.Role.OWNER,
                TeamMembership.Role.CAPTAIN,
                TeamMembership.Role.COMMISSION,
            ],
        ).exists()
