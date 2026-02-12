"""
Serviço de envio de emails para notificações do sistema.

Suporta múltiplos providers:
- SendGrid (recomendado para produção)
- SMTP (desenvolvimento/self-hosted)
- Console (apenas para desenvolvimento)

Configuração no settings.py:
    EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'  # ou sendgrid_backend.SendGridBackend
    EMAIL_HOST = 'smtp.sendgrid.net'
    EMAIL_PORT = 587
    EMAIL_USE_TLS = True
    EMAIL_HOST_USER = 'apikey'
    EMAIL_HOST_PASSWORD = 'SG.xxxxx'
    DEFAULT_FROM_EMAIL = 'noreply@imperium.com'
    
    # SendGrid API Key (alternativa ao SMTP)
    SENDGRID_API_KEY = 'SG.xxxxx'
"""
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """
    Serviço centralizado para envio de emails.
    """
    
    @staticmethod
    def send_notification_email(
        to_emails: List[str],
        subject: str,
        template_name: str,
        context: dict,
        from_email: Optional[str] = None
    ) -> bool:
        """
        Envia email de notificação usando template HTML.
        
        Args:
            to_emails: Lista de emails destinatários
            subject: Assunto do email
            template_name: Nome do template (sem extensão, ex: 'team_invitation')
            context: Contexto para o template
            from_email: Email remetente (opcional, usa DEFAULT_FROM_EMAIL)
        
        Returns:
            bool: True se enviado com sucesso, False caso contrário
        
        Example:
            >>> EmailService.send_notification_email(
            ...     to_emails=['user@example.com'],
            ...     subject='Você foi convidado para um time',
            ...     template_name='team_invitation',
            ...     context={'team_name': 'FNC Elite', 'inviter': 'João'}
            ... )
        """
        if not to_emails:
            logger.warning('Tentativa de enviar email sem destinatários')
            return False
        
        # Email remetente
        from_email = from_email or settings.DEFAULT_FROM_EMAIL
        
        try:
            # Renderizar template HTML
            html_content = render_to_string(
                f'emails/{template_name}.html',
                context
            )
            
            # Versão texto puro (fallback)
            text_content = strip_tags(html_content)
            
            # Criar mensagem
            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=to_emails
            )
            
            # Anexar versão HTML
            msg.attach_alternative(html_content, "text/html")
            
            # Enviar
            msg.send(fail_silently=False)
            
            logger.info(f'Email enviado com sucesso: {subject} -> {", ".join(to_emails)}')
            return True
            
        except Exception as e:
            logger.error(f'Erro ao enviar email: {str(e)}')
            return False
    
    @staticmethod
    def send_team_invitation_email(user_email: str, team_name: str, inviter_name: str, invitation_url: str):
        """Envia email de convite para time."""
        return EmailService.send_notification_email(
            to_emails=[user_email],
            subject=f'Você foi convidado para {team_name}',
            template_name='team_invitation',
            context={
                'team_name': team_name,
                'inviter_name': inviter_name,
                'invitation_url': invitation_url,
            }
        )
    
    @staticmethod
    def send_enrollment_approved_email(team_emails: List[str], team_name: str, championship_name: str):
        """Envia email de inscrição aprovada."""
        return EmailService.send_notification_email(
            to_emails=team_emails,
            subject=f'Inscrição aprovada: {championship_name}',
            template_name='enrollment_approved',
            context={
                'team_name': team_name,
                'championship_name': championship_name,
            }
        )
    
    @staticmethod
    def send_match_scheduled_email(team_emails: List[str], match_info: dict):
        """Envia email de partida agendada."""
        return EmailService.send_notification_email(
            to_emails=team_emails,
            subject=f'Partida agendada: {match_info["opponent"]}',
            template_name='match_scheduled',
            context=match_info
        )
    
    @staticmethod
    def send_match_result_email(team_emails: List[str], result_info: dict):
        """Envia email de resultado da partida."""
        result_type = 'vitória' if result_info['is_winner'] else ('empate' if result_info['is_draw'] else 'derrota')
        
        return EmailService.send_notification_email(
            to_emails=team_emails,
            subject=f'Resultado da partida: {result_type.upper()}',
            template_name='match_result',
            context=result_info
        )
    
    @staticmethod
    def send_walkover_notification_email(team_emails: List[str], wo_info: dict):
        """Envia email sobre Walk-Over."""
        return EmailService.send_notification_email(
            to_emails=team_emails,
            subject='Walk-Over (WO) declarado',
            template_name='walkover_notification',
            context=wo_info
        )
    
    @staticmethod
    def send_championship_started_email(team_emails: List[str], championship_name: str):
        """Envia email de campeonato iniciado."""
        return EmailService.send_notification_email(
            to_emails=team_emails,
            subject=f'Campeonato iniciado: {championship_name}',
            template_name='championship_started',
            context={'championship_name': championship_name}
        )
    
    @staticmethod
    def send_admin_alert_email(admin_emails: List[str], alert_type: str, alert_data: dict):
        """Envia alerta aos administradores."""
        subjects = {
            'pending_wo': 'Partidas pendentes de Walk-Over',
            'contestation_new': 'Nova contestação de resultado',
            'system_error': 'Erro no sistema'
        }
        
        return EmailService.send_notification_email(
            to_emails=admin_emails,
            subject=f'[ADMIN] {subjects.get(alert_type, "Alerta")}',
            template_name=f'admin/{alert_type}',
            context=alert_data
        )


# ============================================================================
# INTEGRAÇÃO COM NOTIFICAÇÕES IN-APP
# ============================================================================

def send_email_for_notification(notification):
    """
    Envia email correspondente a uma notificação in-app.
    
    Args:
        notification: Instância de Notification model
    """
    from fnc_notifications.models import Notification
    
    # Verificar se usuário habilitou emails
    # TODO: Adicionar campo User.email_notifications_enabled
    if not notification.user.email:
        return False
    
    # Mapear tipo de notificação para método de email
    email_methods = {
        Notification.NotificationType.TEAM_INVITATION: lambda n: EmailService.send_team_invitation_email(
            user_email=n.user.email,
            team_name=n.related_team.name if n.related_team else 'Time',
            inviter_name='Administrador',  # TODO: Pegar do related_user
            invitation_url=f'{settings.SITE_URL}{n.action_url}' if n.action_url else ''
        ),
        
        Notification.NotificationType.ENROLLMENT_APPROVED: lambda n: EmailService.send_enrollment_approved_email(
            team_emails=[n.user.email],
            team_name=n.related_team.name if n.related_team else 'Seu time',
            championship_name=n.related_championship.name if n.related_championship else 'Campeonato'
        ),
        
        Notification.NotificationType.MATCH_SCHEDULED: lambda n: EmailService.send_match_scheduled_email(
            team_emails=[n.user.email],
            match_info={
                'opponent': 'Adversário',  # TODO: Extrair do match
                'date': n.created_at.strftime('%d/%m/%Y %H:%M'),
            }
        ),
        
        # Adicionar mais mapeamentos conforme necessário
    }
    
    # Executar método correspondente
    email_method = email_methods.get(notification.notification_type)
    if email_method:
        try:
            return email_method(notification)
        except Exception as e:
            logger.error(f'Erro ao enviar email para notificação {notification.id}: {str(e)}')
            return False
    
    return False
