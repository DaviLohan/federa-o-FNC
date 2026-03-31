from django.db import models
from django.utils.translation import gettext_lazy as _


class Payment(models.Model):
    class Provider(models.TextChoices):
        MERCADO_PAGO = 'MERCADO_PAGO', _('Mercado Pago')

    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pendente')
        PAID = 'PAID', _('Pago')
        FAILED = 'FAILED', _('Falhou')
        EXPIRED = 'EXPIRED', _('Expirado')

    enrollment = models.OneToOneField(
        'fnc_championships.ChampionshipEnrollment',
        on_delete=models.CASCADE,
        related_name='payment',
        verbose_name=_('inscricao'),
    )
    team = models.ForeignKey(
        'fnc_teams.Team',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_('time'),
    )
    championship = models.ForeignKey(
        'fnc_championships.Championship',
        on_delete=models.CASCADE,
        related_name='payments',
        verbose_name=_('campeonato'),
    )
    amount = models.DecimalField(_('valor'), max_digits=10, decimal_places=2)
    provider = models.CharField(
        _('provedor'), max_length=30, choices=Provider.choices, default=Provider.MERCADO_PAGO
    )
    status = models.CharField(
        _('status'), max_length=20, choices=Status.choices, default=Status.PENDING
    )
    gateway_payment_id = models.CharField(_('ID no gateway'), max_length=255, blank=True, null=True, unique=True)
    gateway_external_reference = models.CharField(
        _('referencia externa'), max_length=255, blank=True, null=True, unique=True
    )
    pix_qr_code_text = models.TextField(_('codigo pix copia e cola'), blank=True)
    pix_qr_code_base64 = models.TextField(_('qr code pix em base64'), blank=True)
    ticket_url = models.URLField(_('URL do ticket'), blank=True)
    expires_at = models.DateTimeField(_('expira em'), blank=True, null=True)
    paid_at = models.DateTimeField(_('pago em'), blank=True, null=True)
    webhook_last_payload = models.JSONField(_('ultimo payload de webhook'), blank=True, null=True)
    raw_response = models.JSONField(_('resposta bruta do gateway'), blank=True, null=True)
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)
    updated_at = models.DateTimeField(_('atualizado em'), auto_now=True)

    class Meta:
        verbose_name = _('pagamento')
        verbose_name_plural = _('pagamentos')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'provider']),
            models.Index(fields=['team', 'championship']),
        ]

    def __str__(self):
        return f'Pagamento {self.id} - {self.team} - {self.get_status_display()}'


class PaymentEvent(models.Model):
    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='events',
        verbose_name=_('pagamento'),
        blank=True,
        null=True,
    )
    provider = models.CharField(
        _('provedor'), max_length=30, choices=Payment.Provider.choices, default=Payment.Provider.MERCADO_PAGO
    )
    event_type = models.CharField(_('tipo do evento'), max_length=100)
    gateway_event_id = models.CharField(_('ID do evento no gateway'), max_length=255, unique=True)
    payload = models.JSONField(_('payload'))
    processed = models.BooleanField(_('processado'), default=False)
    processed_at = models.DateTimeField(_('processado em'), blank=True, null=True)
    last_error = models.TextField(_('ultimo erro'), blank=True)
    created_at = models.DateTimeField(_('criado em'), auto_now_add=True)

    class Meta:
        verbose_name = _('evento de pagamento')
        verbose_name_plural = _('eventos de pagamento')
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.provider} - {self.event_type} - {self.gateway_event_id}'
