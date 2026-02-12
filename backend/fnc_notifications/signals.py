"""
Django signals para criar notificações automáticas.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from fnc_teams.models import TeamInvitation
from fnc_championships.models import Championship, ChampionshipEnrollment
from fnc_matches.models import Match, Contestation
from .services import NotificationService
from .email_service import send_email_for_notification


# ========== TEAM INVITATIONS ==========

@receiver(post_save, sender=TeamInvitation)
def handle_team_invitation(sender, instance, created, **kwargs):
    """
    Cria notificação quando jogador é convidado ou aceita convite.
    """
    if created:
        # Novo convite - notificar jogador
        notification = NotificationService.notify_team_invitation(instance)
        if notification:
            send_email_for_notification(notification)
    elif instance.status == 'ACCEPTED':
        # Convite aceito - notificar dono do time
        notification = NotificationService.notify_invitation_accepted(instance)
        if notification:
            send_email_for_notification(notification)


# ========== CHAMPIONSHIP ENROLLMENTS ==========

@receiver(pre_save, sender=ChampionshipEnrollment)
def track_enrollment_status_change(sender, instance, **kwargs):
    """
    Rastreia mudanças de status de inscrição para notificar.
    """
    if instance.pk:
        try:
            old_instance = ChampionshipEnrollment.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except ChampionshipEnrollment.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=ChampionshipEnrollment)
def handle_enrollment_status(sender, instance, created, **kwargs):
    """
    Notifica time sobre mudanças no status de inscrição.
    """
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Se mudou para APPROVED
        if old_status != 'APPROVED' and new_status == 'APPROVED':
            notification = NotificationService.notify_enrollment_approved(instance)
            if notification:
                send_email_for_notification(notification)
        
        # Se mudou para REJECTED
        elif old_status != 'REJECTED' and new_status == 'REJECTED':
            notification = NotificationService.notify_enrollment_rejected(instance)
            if notification:
                send_email_for_notification(notification)


# ========== CHAMPIONSHIPS ==========

@receiver(pre_save, sender=Championship)
def track_championship_status_change(sender, instance, **kwargs):
    """
    Rastreia mudanças de status do campeonato.
    """
    if instance.pk:
        try:
            old_instance = Championship.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Championship.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Championship)
def handle_championship_status(sender, instance, created, **kwargs):
    """
    Notifica times sobre mudanças de status do campeonato.
    """
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Campeonato iniciado
        if old_status != 'IN_PROGRESS' and new_status == 'IN_PROGRESS':
            notifications = NotificationService.notify_championship_started(instance)
            if notifications:
                for notification in notifications:
                    send_email_for_notification(notification)
        
        # Campeonato finalizado
        elif old_status != 'FINISHED' and new_status == 'FINISHED':
            notifications = NotificationService.notify_championship_finished(instance)
            if notifications:
                for notification in notifications:
                    send_email_for_notification(notification)


# ========== MATCHES ==========

@receiver(post_save, sender=Match)
def handle_match_created(sender, instance, created, **kwargs):
    """
    Notifica times quando partida é criada/agendada.
    """
    if created and instance.scheduled_date:
        # Nova partida agendada
        notifications = NotificationService.notify_match_scheduled(instance)
        if notifications:
            for notification in notifications:
                send_email_for_notification(notification)


@receiver(pre_save, sender=Match)
def track_match_result(sender, instance, **kwargs):
    """
    Rastreia quando resultado é adicionado à partida.
    """
    if instance.pk:
        try:
            old_instance = Match.objects.get(pk=instance.pk)
            instance._had_result = old_instance.home_score is not None
        except Match.DoesNotExist:
            instance._had_result = False
    else:
        instance._had_result = False


@receiver(post_save, sender=Match)
def handle_match_result(sender, instance, created, **kwargs):
    """
    Notifica times sobre resultado da partida.
    """
    if not created and hasattr(instance, '_had_result'):
        # Se não tinha resultado e agora tem
        if not instance._had_result and instance.home_score is not None and instance.away_score is not None:
            notifications = NotificationService.notify_match_result(instance)
            if notifications:
                for notification in notifications:
                    send_email_for_notification(notification)


# ========== CONTESTATIONS ==========

@receiver(post_save, sender=Contestation)
def handle_contestation(sender, instance, created, **kwargs):
    """
    Notifica sobre contestações.
    """
    if created:
        # Nova contestação - notificar time adversário
        notification = NotificationService.notify_match_contested(instance)
        if notification:
            send_email_for_notification(notification)


@receiver(pre_save, sender=Contestation)
def track_contestation_resolution(sender, instance, **kwargs):
    """
    Rastreia resolução de contestação.
    """
    if instance.pk:
        try:
            old_instance = Contestation.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Contestation.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None


@receiver(post_save, sender=Contestation)
def handle_contestation_resolved(sender, instance, created, **kwargs):
    """
    Notifica sobre resolução de contestação.
    """
    if not created and hasattr(instance, '_old_status'):
        old_status = instance._old_status
        new_status = instance.status
        
        # Se foi resolvida (aprovada ou rejeitada)
        if old_status == 'PENDING' and new_status in ['APPROVED', 'REJECTED']:
            notification = NotificationService.notify_contestation_resolved(instance)
            if notification:
                send_email_for_notification(notification)
