from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from uuid import uuid4

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from fnc_championships.models import Championship, ChampionshipEnrollment
from fnc_payments.models import Payment, PaymentEvent
from fnc_teams.models import Team


@dataclass
class PixChargeData:
    payment_id: str
    status: str
    external_reference: str
    qr_code: str
    qr_code_base64: str
    ticket_url: str
    expires_at: timezone.datetime | None
    raw_response: dict


class MercadoPagoPixGateway:
    base_url = 'https://api.mercadopago.com'

    def __init__(self):
        self.access_token = settings.MERCADOPAGO_ACCESS_TOKEN
        if not self.access_token:
            raise ValidationError('Integração com Mercado Pago não configurada.')

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
        }

    def create_pix_charge(self, *, enrollment, payer_email: str, amount: Decimal) -> PixChargeData:
        expiration_minutes = getattr(settings, 'PIX_PAYMENT_EXPIRATION_MINUTES', 30)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiration_minutes)
        external_reference = f'fnc:enrollment:{enrollment.id}'
        payload = {
            'transaction_amount': float(amount),
            'description': f'Inscrição {enrollment.team.name} - {enrollment.championship.name}',
            'payment_method_id': 'pix',
            'date_of_expiration': _format_gateway_datetime(expires_at),
            'external_reference': external_reference,
            'payer': {
                'email': payer_email,
                'first_name': enrollment.team.owner.first_name,
                'last_name': enrollment.team.owner.last_name,
            },
        }
        notification_url = getattr(settings, 'MERCADOPAGO_WEBHOOK_URL', '')
        if notification_url:
            payload['notification_url'] = notification_url
        response = requests.post(
            f'{self.base_url}/v1/payments',
            json=payload,
            headers={**self._headers(), 'X-Idempotency-Key': str(uuid4())},
            timeout=20,
        )
        if response.status_code >= 400:
            raise ValidationError(_extract_gateway_error(response, 'Erro ao gerar Pix no Mercado Pago.'))

        data = response.json()
        tx_data = data.get('point_of_interaction', {}).get('transaction_data', {})
        return PixChargeData(
            payment_id=str(data['id']),
            status=str(data.get('status', 'pending')).upper(),
            external_reference=data.get('external_reference', external_reference),
            qr_code=tx_data.get('qr_code', ''),
            qr_code_base64=tx_data.get('qr_code_base64', ''),
            ticket_url=tx_data.get('ticket_url', ''),
            expires_at=_parse_gateway_datetime(data.get('date_of_expiration')),
            raw_response=data,
        )

    def get_payment(self, gateway_payment_id: str) -> dict:
        response = requests.get(
            f'{self.base_url}/v1/payments/{gateway_payment_id}',
            headers=self._headers(),
            timeout=20,
        )
        if response.status_code >= 400:
            raise ValidationError(_extract_gateway_error(response, 'Erro ao consultar pagamento no Mercado Pago.'))
        return response.json()


def _parse_gateway_datetime(value):
    if not value:
        return None
    try:
        return timezone.datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return None


def _format_gateway_datetime(value):
    offset = value.strftime('%z')
    offset_with_colon = f'{offset[:-2]}:{offset[-2:]}' if offset else 'Z'
    return value.strftime('%Y-%m-%dT%H:%M:%S.000') + offset_with_colon


def _map_gateway_status(status_value: str) -> str:
    status_value = (status_value or '').lower()
    if status_value == 'approved':
        return 'PAID'
    if status_value in {'cancelled', 'rejected'}:
        return 'FAILED'
    if status_value == 'expired':
        return 'EXPIRED'
    return 'PENDING'


def _extract_gateway_error(response, fallback_message: str) -> dict:
    if not response.content:
        return {'error': fallback_message}

    try:
        data = response.json()
    except ValueError:
        return {'error': fallback_message}

    message = data.get('message') or data.get('error_description') or data.get('error') or fallback_message
    causes = data.get('cause') or []
    details = []

    for cause in causes:
        if isinstance(cause, dict):
            description = cause.get('description') or cause.get('data') or cause.get('code')
            if description:
                details.append(str(description))

    if details:
        message = f"{message}: {' | '.join(details)}"

    return {
        'error': message,
        'gateway_error': data,
    }


class EnrollmentCheckoutService:
    @staticmethod
    @transaction.atomic
    def create_checkout(*, user, championship: Championship, team: Team) -> dict:
        if isinstance(championship, int):
            championship = Championship.objects.get(pk=championship)
        if isinstance(team, int):
            team = Team.objects.select_related('owner').get(pk=team)

        enrollment = ChampionshipEnrollment.objects.create(
            championship=championship,
            team=team,
            status=ChampionshipEnrollment.Status.PENDING_PAYMENT,
            payment_status=ChampionshipEnrollment.PaymentStatus.PENDING,
        )

        if championship.enrollment_fee <= 0:
            enrollment.status = ChampionshipEnrollment.Status.APPROVED
            enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.PAID
            enrollment.approved_at = timezone.now()
            enrollment.save(update_fields=['status', 'payment_status', 'approved_at'])
            return {
                'enrollment': enrollment,
                'payment': None,
                'requires_payment': False,
                'message': 'Inscrição confirmada com sucesso.',
            }

        # Em DEBUG, bypass do pagamento (Pix não funciona com credenciais de teste do MP)
        if settings.DEBUG:
            enrollment.status = ChampionshipEnrollment.Status.APPROVED
            enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.PAID
            enrollment.approved_at = timezone.now()
            enrollment.save(update_fields=['status', 'payment_status', 'approved_at'])
            return {
                'enrollment': enrollment,
                'payment': None,
                'requires_payment': False,
                'message': 'Inscrição confirmada (modo desenvolvimento — pagamento simulado).',
            }

        gateway = MercadoPagoPixGateway()
        charge = gateway.create_pix_charge(
            enrollment=enrollment,
            payer_email=user.email,
            amount=championship.enrollment_fee,
        )

        payment = Payment.objects.create(
            enrollment=enrollment,
            team=team,
            championship=championship,
            amount=championship.enrollment_fee,
            provider=Payment.Provider.MERCADO_PAGO,
            status=_map_gateway_status(charge.status),
            gateway_payment_id=charge.payment_id,
            gateway_external_reference=charge.external_reference,
            pix_qr_code_text=charge.qr_code,
            pix_qr_code_base64=charge.qr_code_base64,
            ticket_url=charge.ticket_url,
            expires_at=charge.expires_at,
            raw_response=charge.raw_response,
        )

        enrollment.payment_id = payment.gateway_payment_id
        enrollment.save(update_fields=['payment_id'])

        return {
            'enrollment': enrollment,
            'payment': payment,
            'requires_payment': True,
            'message': 'Pagamento Pix gerado com sucesso.',
        }


class PaymentSyncService:
    @staticmethod
    @transaction.atomic
    def sync_payment(payment: Payment, gateway_payload: dict) -> Payment:
        payment = Payment.objects.select_for_update().get(pk=payment.pk)

        mapped_status = _map_gateway_status(gateway_payload.get('status', ''))
        tx_data = gateway_payload.get('point_of_interaction', {}).get('transaction_data', {})
        payment.status = mapped_status
        payment.gateway_external_reference = gateway_payload.get(
            'external_reference', payment.gateway_external_reference
        )
        payment.pix_qr_code_text = tx_data.get('qr_code', payment.pix_qr_code_text or '')
        payment.pix_qr_code_base64 = tx_data.get('qr_code_base64', payment.pix_qr_code_base64 or '')
        payment.ticket_url = tx_data.get('ticket_url', payment.ticket_url or '')
        payment.expires_at = _parse_gateway_datetime(gateway_payload.get('date_of_expiration')) or payment.expires_at
        payment.webhook_last_payload = gateway_payload
        payment.raw_response = gateway_payload
        if mapped_status == Payment.Status.PAID and not payment.paid_at:
            payment.paid_at = timezone.now()
        payment.save()

        enrollment = payment.enrollment
        if mapped_status == Payment.Status.PAID:
            updates = []
            if enrollment.status != ChampionshipEnrollment.Status.APPROVED:
                enrollment.status = ChampionshipEnrollment.Status.APPROVED
                updates.append('status')
            if enrollment.payment_status != ChampionshipEnrollment.PaymentStatus.PAID:
                enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.PAID
                updates.append('payment_status')
            if not enrollment.approved_at:
                enrollment.approved_at = timezone.now()
                updates.append('approved_at')
            if updates:
                enrollment.save(update_fields=updates)
        elif mapped_status == Payment.Status.EXPIRED:
            enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.EXPIRED
            enrollment.save(update_fields=['payment_status'])
        elif mapped_status == Payment.Status.FAILED:
            enrollment.payment_status = ChampionshipEnrollment.PaymentStatus.FAILED
            enrollment.save(update_fields=['payment_status'])

        return payment

    @staticmethod
    def refresh_payment(payment: Payment) -> Payment:
        gateway = MercadoPagoPixGateway()
        payload = gateway.get_payment(payment.gateway_payment_id)
        return PaymentSyncService.sync_payment(payment, payload)


class MercadoPagoWebhookService:
    @staticmethod
    @transaction.atomic
    def process(payload: dict) -> Payment | None:
        gateway_payment_id = str(payload.get('data', {}).get('id') or payload.get('id') or '').strip()
        event_type = payload.get('type') or payload.get('action') or 'unknown'
        event_id = str(payload.get('id') or f'{event_type}:{gateway_payment_id}')

        if not gateway_payment_id:
            return None

        event, created = PaymentEvent.objects.get_or_create(
            gateway_event_id=event_id,
            defaults={
                'provider': Payment.Provider.MERCADO_PAGO,
                'event_type': event_type,
                'payload': payload,
            },
        )
        if not created and event.processed:
            return event.payment

        payment = Payment.objects.filter(gateway_payment_id=gateway_payment_id).select_related('enrollment').first()
        if not payment:
            event.last_error = 'Pagamento local não encontrado.'
            event.payload = payload
            event.save(update_fields=['last_error', 'payload'])
            return None

        refreshed_payment = PaymentSyncService.refresh_payment(payment)
        event.payment = refreshed_payment
        event.payload = payload
        event.processed = True
        event.processed_at = timezone.now()
        event.last_error = ''
        event.save(update_fields=['payment', 'payload', 'processed', 'processed_at', 'last_error'])
        return refreshed_payment
