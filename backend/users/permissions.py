from rest_framework import permissions


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada: apenas o dono do objeto pode editá-lo.
    Outros usuários podem apenas visualizar.
    """
    
    def has_object_permission(self, request, view, obj):
        # Permitir operações de leitura para qualquer usuário autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Apenas o dono pode editar/deletar
        # obj pode ser User, PlayerProfile ou TeamOwnerProfile
        if hasattr(obj, 'user'):
            # Para perfis (PlayerProfile, TeamOwnerProfile)
            return obj.user == request.user
        else:
            # Para User diretamente
            return obj == request.user


class IsAdminOrSupervisor(permissions.BasePermission):
    """
    Permissão: apenas ADMIN ou SUPERVISOR.
    """

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.has_supervisor_access
        )
