from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from .models import Notification
from .serializers import NotificationSerializer


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar notificações.
    
    Endpoints:
    - GET /notifications/ - Listar notificações do usuário
    - GET /notifications/{id}/ - Detalhes da notificação
    - POST /notifications/{id}/mark_read/ - Marcar como lida
    - POST /notifications/mark_all_read/ - Marcar todas como lidas
    - DELETE /notifications/{id}/ - Deletar notificação
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retorna apenas notificações do usuário logado."""
        user = self.request.user
        queryset = Notification.objects.filter(user=user)
        
        # Filtro por tipo
        notification_type = self.request.query_params.get('type', None)
        if notification_type:
            queryset = queryset.filter(notification_type=notification_type)
        
        # Filtro por lida/não lida
        is_read = self.request.query_params.get('is_read', None)
        if is_read is not None:
            queryset = queryset.filter(is_read=is_read.lower() == 'true')
        
        return queryset
    
    def perform_create(self, serializer):
        """Define o usuário da notificação como o usuário atual."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """
        Marca uma notificação como lida.
        """
        notification = self.get_object()
        
        if notification.user != request.user:
            return Response(
                {'error': 'Você não tem permissão para esta ação.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
        return Response({
            'message': 'Notificação marcada como lida.',
            'notification': NotificationSerializer(notification).data
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        """
        Marca todas as notificações não lidas do usuário como lidas.
        """
        user = request.user
        unread_notifications = Notification.objects.filter(user=user, is_read=False)
        
        count = unread_notifications.count()
        unread_notifications.update(is_read=True, read_at=timezone.now())
        
        return Response({
            'message': f'{count} notificações marcadas como lidas.',
            'count': count
        })
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Retorna a contagem de notificações não lidas.
        """
        user = request.user
        count = Notification.objects.filter(user=user, is_read=False).count()
        
        return Response({'unread_count': count})
