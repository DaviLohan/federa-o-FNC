from django.db import models
from django.conf import settings


class Notification(models.Model):
    """
    Modelo para notificações do sistema.
    
    Tipos de notificações:
    - TEAM_INVITATION: Convite para time
    - MATCH_SCHEDULED: Partida agendada
    - MATCH_RESULT: Resultado de partida
    - CHAMPIONSHIP_ENROLLED: Inscrito em campeonato
    - CHAMPIONSHIP_STARTED: Campeonato iniciado
    - SYSTEM: Notificação do sistema
    """
    
    NOTIFICATION_TYPES = [
        ('TEAM_INVITATION', 'Convite de Time'),
        ('MATCH_SCHEDULED', 'Partida Agendada'),
        ('MATCH_RESULT', 'Resultado de Partida'),
        ('MATCH_CONTESTED', 'Partida Contestada'),
        ('CHAMPIONSHIP_ENROLLED', 'Inscrito em Campeonato'),
        ('CHAMPIONSHIP_STARTED', 'Campeonato Iniciado'),
        ('CHAMPIONSHIP_FINISHED', 'Campeonato Finalizado'),
        ('SYSTEM', 'Notificação do Sistema'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Usuário'
    )
    notification_type = models.CharField(
        max_length=30,
        choices=NOTIFICATION_TYPES,
        verbose_name='Tipo'
    )
    title = models.CharField(max_length=200, verbose_name='Título')
    message = models.TextField(verbose_name='Mensagem')
    
    # Link para ação (ex: /teams/5, /matches/10)
    action_url = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='URL de Ação'
    )
    
    # Referências opcionais para objetos relacionados
    related_team_id = models.IntegerField(blank=True, null=True)
    related_match_id = models.IntegerField(blank=True, null=True)
    related_championship_id = models.IntegerField(blank=True, null=True)
    related_invitation_id = models.IntegerField(blank=True, null=True)
    
    is_read = models.BooleanField(default=False, verbose_name='Lida')
    read_at = models.DateTimeField(blank=True, null=True, verbose_name='Lida em')
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Criado em')
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - {self.title}"
