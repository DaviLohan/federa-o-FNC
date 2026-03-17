from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer para notificações."""
    
    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_type',
            'title',
            'message',
            'action_url',
            'related_team_id',
            'related_match_id',
            'related_championship_id',
            'related_invitation_id',
            'related_leave_request_id',
            'is_read',
            'read_at',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']
