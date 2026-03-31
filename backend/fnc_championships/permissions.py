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
