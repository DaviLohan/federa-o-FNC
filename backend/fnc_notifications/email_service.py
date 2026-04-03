"""
Serviço de envio de emails para notificações do sistema.

Usa a API HTTP do Brevo (ex-Sendinblue) via sib-api-v3-sdk.
Isso evita o bloqueio de porta SMTP (587) em ambientes como Railway.

Configuração no settings.py / variáveis de ambiente:
    BREVO_API_KEY = 'xkeysib-...'
    DEFAULT_FROM_EMAIL = 'IMPERIUM <noreply@example.com>'

Em desenvolvimento (sem BREVO_API_KEY), usa o backend SMTP/console configurado
via EMAIL_BACKEND normal do Django.
"""
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
from typing import List, Optional
import logging

logger = logging.getLogger(__name__)


def _parse_email_address(address: str):
    """
    Transforma 'Nome <email@exemplo.com>' em {'name': 'Nome', 'email': 'email@exemplo.com'}.
    Se não tiver nome, retorna só {'email': '...'}.
    """
    if '<' in address and address.endswith('>'):
        name_part, email_part = address.rsplit('<', 1)
        return {'name': name_part.strip(), 'email': email_part.rstrip('>')}
    return {'email': address.strip()}


class EmailService:
    """
    Serviço centralizado para envio de emails.

    Em produção usa a API HTTP do Brevo (contorna bloqueio SMTP do Railway).
    Em desenvolvimento usa o backend padrão do Django (SMTP / console).
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
        """
        if not to_emails:
            logger.warning('Tentativa de enviar email sem destinatários')
            return False

        from_email = from_email or settings.DEFAULT_FROM_EMAIL

        try:
            html_content = render_to_string(
                f'emails/{template_name}.html',
                context
            )
            text_content = strip_tags(html_content)
        except Exception as e:
            logger.error(f'Erro ao renderizar template {template_name}: {str(e)}')
            return False

        brevo_api_key = getattr(settings, 'BREVO_API_KEY', '')

        if brevo_api_key:
            return EmailService._send_via_brevo_api(
                to_emails=to_emails,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                from_email=from_email,
                api_key=brevo_api_key,
            )
        else:
            return EmailService._send_via_django_smtp(
                to_emails=to_emails,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
                from_email=from_email,
            )

    @staticmethod
    def _send_via_brevo_api(
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: str,
        from_email: str,
        api_key: str,
    ) -> bool:
        """Envia email via Brevo API HTTP (sem SMTP)."""
        try:
            import sib_api_v3_sdk
            from sib_api_v3_sdk.rest import ApiException

            configuration = sib_api_v3_sdk.Configuration()
            configuration.api_key['api-key'] = api_key

            api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
                sib_api_v3_sdk.ApiClient(configuration)
            )

            sender = _parse_email_address(from_email)
            recipients = [{'email': email} for email in to_emails]

            send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
                sender=sender,
                to=recipients,
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )

            api_instance.send_transac_email(send_smtp_email)
            logger.info(f'[Brevo API] Email enviado: {subject} -> {", ".join(to_emails)}')
            return True

        except Exception as e:
            logger.error(f'[Brevo API] Erro ao enviar email: {str(e)}')
            return False

    @staticmethod
    def _send_via_django_smtp(
        to_emails: List[str],
        subject: str,
        html_content: str,
        text_content: str,
        from_email: str,
    ) -> bool:
        """Envia email via backend SMTP padrão do Django (desenvolvimento)."""
        try:
            from django.core.mail import EmailMultiAlternatives

            msg = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=from_email,
                to=to_emails,
            )
            msg.attach_alternative(html_content, 'text/html')
            msg.send(fail_silently=False)

            logger.info(f'[SMTP] Email enviado: {subject} -> {", ".join(to_emails)}')
            return True

        except Exception as e:
            logger.error(f'[SMTP] Erro ao enviar email: {str(e)}')
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
        'TEAM_INVITATION': lambda n: EmailService.send_team_invitation_email(
            user_email=n.user.email,
            team_name=n.related_team.name if n.related_team else 'Time',
            inviter_name=(
                n.related_invitation.invited_by.get_full_name()
                if n.related_invitation and n.related_invitation.invited_by
                else (n.related_team.owner.get_full_name() if n.related_team else 'Administrador')
            ),
            invitation_url=f'{settings.SITE_URL}{n.action_url}' if n.action_url else ''
        ),
        
        'CHAMPIONSHIP_ENROLLED': lambda n: EmailService.send_enrollment_approved_email(
            team_emails=[n.user.email],
            team_name=n.related_team.name if n.related_team else 'Seu time',
            championship_name=n.related_championship.name if n.related_championship else 'Campeonato'
        ),
        
        'MATCH_SCHEDULED': lambda n: EmailService.send_match_scheduled_email(
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
