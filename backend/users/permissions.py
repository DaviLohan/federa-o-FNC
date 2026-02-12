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


class IsOwner(permissions.BasePermission):
    """
    Permissão customizada: apenas o dono do objeto pode acessá-lo.
    """
    
    def has_object_permission(self, request, view, obj):
        # Apenas o dono pode acessar
        if hasattr(obj, 'user'):
            # Para perfis (PlayerProfile, TeamOwnerProfile)
            return obj.user == request.user
        else:
            # Para User diretamente
            return obj == request.user


class IsSuperuserOrReadOnly(permissions.BasePermission):
    """
    Permissão customizada: apenas superusuários podem criar/editar/deletar.
    Outros usuários podem apenas visualizar.
    """
    
    def has_permission(self, request, view):
        # Permitir operações de leitura para qualquer usuário autenticado
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Apenas superusuários podem criar/editar/deletar
        return request.user and request.user.is_superuser
