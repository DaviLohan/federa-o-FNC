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



