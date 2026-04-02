"""
Tasks Celery para envio de emails assíncrono.

Todas as operações de envio de email passam por aqui para não bloquear
as requisições HTTP (o SMTP pode demorar vários segundos).
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    max_retries=3,
    default_retry_delay=30,
    autoretry_for=(Exception,),
    retry_backoff=True,
    name='fnc_notifications.send_email',
)
def send_email_task(self, to_emails, subject, template_name, context, from_email=None):
    """
    Envia email de notificação de forma assíncrona via Celery.

    Retenta até 3 vezes com backoff exponencial em caso de falha SMTP.
    """
    from .email_service import EmailService

    logger.info(f'[Celery] Enviando email: {subject} -> {", ".join(to_emails)}')

    success = EmailService.send_notification_email(
        to_emails=to_emails,
        subject=subject,
        template_name=template_name,
        context=context,
        from_email=from_email,
    )

    if not success:
        logger.error(f'[Celery] Falha ao enviar email: {subject} -> {", ".join(to_emails)}')
        raise Exception(f'Falha ao enviar email para {", ".join(to_emails)}')

    return True
