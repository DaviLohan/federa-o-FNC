"""
Serviço de verificação de email e redefinição de senha.

Gerencia a criação, validação e envio de códigos de verificação de 6 dígitos.
"""
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from fnc_notifications.tasks import send_email_task
from .models import VerificationCode

import logging

logger = logging.getLogger(__name__)


class VerificationService:
    """
    Serviço centralizado para operações de verificação de email e password reset.
    """

    # ──────────────────────────────────────────────────────────────────────────
    # Criação e envio de códigos
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def send_verification_email(user):
        """
        Cria um código de verificação de email e envia por email.

        Args:
            user: Instância do User model.

        Returns:
            bool: True se o email foi enviado com sucesso.
        """
        code_obj = VerificationCode.create_code(
            user=user,
            code_type=VerificationCode.CodeType.EMAIL_VERIFICATION
        )

        send_email_task.delay(
            to_emails=[user.email],
            subject='Verifique seu email - FDT ARENA',
            template_name='verification_code',
            context={
                'user_name': user.first_name,
                'code': code_obj.code,
                'expiry_minutes': getattr(
                    settings, 'VERIFICATION_CODE_EXPIRY_MINUTES', 15
                ),
                'site_url': getattr(settings, 'SITE_URL', ''),
            }
        )
        return True

    @staticmethod
    def send_password_reset_email(user):
        """
        Cria um código de redefinição de senha e envia por email.

        Args:
            user: Instância do User model.

        Returns:
            bool: True se o email foi enviado com sucesso.
        """
        code_obj = VerificationCode.create_code(
            user=user,
            code_type=VerificationCode.CodeType.PASSWORD_RESET
        )

        send_email_task.delay(
            to_emails=[user.email],
            subject='Redefinição de senha - FDT ARENA',
            template_name='password_reset',
            context={
                'user_name': user.first_name,
                'code': code_obj.code,
                'expiry_minutes': getattr(
                    settings, 'VERIFICATION_CODE_EXPIRY_MINUTES', 15
                ),
                'site_url': getattr(settings, 'SITE_URL', ''),
            }
        )
        return True

    # ──────────────────────────────────────────────────────────────────────────
    # Validação de códigos
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def validate_code(user, code, code_type):
        """
        Valida um código de verificação.

        Busca o código mais recente não utilizado do tipo especificado para o
        usuário. Incrementa o contador de tentativas a cada chamada.

        Args:
            user: Instância do User model.
            code: String do código de 6 dígitos.
            code_type: Tipo do código (EMAIL_VERIFICATION ou PASSWORD_RESET).

        Returns:
            tuple: (success: bool, error_message: str | None, code_obj: VerificationCode | None)
        """
        max_attempts = getattr(settings, 'VERIFICATION_CODE_MAX_ATTEMPTS', 5)

        # Buscar código mais recente não utilizado para este usuário e tipo
        code_obj = VerificationCode.objects.filter(
            user=user,
            code_type=code_type,
            is_used=False
        ).order_by('-created_at').first()

        if code_obj is None:
            return False, _('Nenhum código de verificação encontrado. Solicite um novo.'), None

        if code_obj.is_expired:
            return False, _('Código expirado. Solicite um novo.'), None

        if code_obj.attempts >= max_attempts:
            return False, _('Número máximo de tentativas excedido. Solicite um novo código.'), None

        # Incrementar tentativas
        code_obj.attempts += 1
        code_obj.save(update_fields=['attempts'])

        if code_obj.code != code:
            remaining = max_attempts - code_obj.attempts
            if remaining <= 0:
                return False, _('Código incorreto. Número máximo de tentativas excedido. Solicite um novo código.'), None
            return False, _(f'Código incorreto. {remaining} tentativa(s) restante(s).'), None

        # Código válido — marcar como usado
        code_obj.is_used = True
        code_obj.used_at = timezone.now()
        code_obj.save(update_fields=['is_used', 'used_at'])

        return True, None, code_obj

    # ──────────────────────────────────────────────────────────────────────────
    # Rate limiting de reenvio
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def can_resend(user, code_type):
        """
        Verifica se o usuário pode solicitar um novo código (rate limiting).

        Args:
            user: Instância do User model.
            code_type: Tipo do código.

        Returns:
            tuple: (can_resend: bool, seconds_remaining: int)
        """
        resend_interval = getattr(
            settings, 'VERIFICATION_CODE_RESEND_INTERVAL_SECONDS', 60
        )

        last_code = VerificationCode.objects.filter(
            user=user,
            code_type=code_type,
        ).order_by('-created_at').first()

        if last_code is None:
            return True, 0

        elapsed = (timezone.now() - last_code.created_at).total_seconds()
        if elapsed >= resend_interval:
            return True, 0

        return False, int(resend_interval - elapsed)
