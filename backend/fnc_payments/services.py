from __future__ import annotations

import hashlib
import hmac
import logging
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from fnc_championships.models import Championship, ChampionshipEnrollment
from fnc_payments.models import Payment, PaymentEvent
from fnc_teams.models import Team

logger = logging.getLogger(__name__)


# ─── Dataclasses ──────────────────────────────────────────────────────────────


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


# ─── Mercado Pago PIX Gateway ────────────────────────────────────────────────


class MercadoPagoPixGateway:
    """
    Gateway de pagamento via PIX usando a API do Mercado Pago.

    Fluxo:
      1. Criar pagamento PIX (POST /v1/payments) com payment_method_id=pix
      2. QR code já vem na resposta: point_of_interaction.transaction_data

    Docs: https://www.mercadopago.com.br/developers/pt/reference/payments/_payments/post
    """

    BASE_URL = 'https://api.mercadopago.com'

    def __init__(self):
        self.access_token = settings.MP_ACCESS_TOKEN
        if not self.access_token:
            raise ValidationError('Integração com Mercado Pago não configurada. Configure MP_ACCESS_TOKEN no .env.')

    def _headers(self):
        return {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json',
            'X-Idempotency-Key': '',  # preenchido por chamada
        }

    def create_pix_charge(
        self,
        *,
        enrollment,
        payer_name: str,
        payer_cpf: str,
        payer_email: str,
        amount: Decimal,
    ) -> PixChargeData:
        """
        Cria uma cobrança PIX no Mercado Pago e retorna os dados do QR code.
        """
        expiration_minutes = getattr(settings, 'PIX_PAYMENT_EXPIRATION_MINUTES', 30)
        expires_at = timezone.now() + timezone.timedelta(minutes=expiration_minutes)
        external_reference = f'fnc:enrollment:{enrollment.id}'

        # Idempotency key baseada no enrollment para evitar cobranças duplicadas
        import uuid
        idempotency_key = str(uuid.uuid5(uuid.NAMESPACE_DNS, external_reference))

        nome_parts = payer_name.strip().split()
        first_name = nome_parts[0] if nome_parts else 'Pagador'
        last_name = ' '.join(nome_parts[1:]) if len(nome_parts) > 1 else 'FNC'

        payload = {
            'transaction_amount': float(amount),
            'description': f'Inscrição {enrollment.team.name} - {enrollment.championship.name}',
            'payment_method_id': 'pix',
            'date_of_expiration': expires_at.strftime('%Y-%m-%dT%H:%M:%S.000-03:00'),
            'external_reference': external_reference,
            'payer': {
                'email': payer_email,
                'first_name': first_name,
                'last_name': last_name,
                'identification': {
                    'type': 'CPF',
                    'number': payer_cpf.replace('.', '').replace('-', '').strip(),
                },
            },
        }

        headers = self._headers()
        headers['X-Idempotency-Key'] = idempotency_key

        resp = requests.post(
            f'{self.BASE_URL}/v1/payments',
            json=payload,
            headers=headers,
            timeout=20,
        )

        if resp.status_code >= 400:
            raise ValidationError(_extract_mp_error(resp, 'Erro ao gerar cobrança PIX no Mercado Pago.'))

        data = resp.json()
        mp_payment_id = str(data['id'])

        # Extrai QR code da resposta
        tx_data = data.get('point_of_interaction', {}).get('transaction_data', {})
        qr_code = tx_data.get('qr_code', '')
        qr_code_base64 = tx_data.get('qr_code_base64', '')
        ticket_url = tx_data.get('ticket_url', '')

        return PixChargeData(
            payment_id=mp_payment_id,
            status=_map_mp_status(data.get('status', 'pending')),
            external_reference=external_reference,
            qr_code=qr_code,
            qr_code_base64=qr_code_base64,
            ticket_url=ticket_url,
            expires_at=expires_at,
            raw_response=data,
        )

    def get_payment(self, gateway_payment_id: str) -> dict:
        """Consulta o status de um pagamento no Mercado Pago."""
        resp = requests.get(
            f'{self.BASE_URL}/v1/payments/{gateway_payment_id}',
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            raise ValidationError(_extract_mp_error(resp, 'Erro ao consultar pagamento no Mercado Pago.'))
        return resp.json()

    @staticmethod
    def verify_webhook_signature(x_signature: str, x_request_id: str, data_id: str, secret: str) -> bool:
        """
        Valida a assinatura HMAC do webhook do Mercado Pago.
        Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks

        Retorna False se o secret não estiver configurado (rejeita por segurança).
        """
        if not secret:
            logger.error('MP_WEBHOOK_SECRET não configurado — rejeitando webhook por segurança.')
            return False

        if not x_signature:
            logger.warning('Webhook MP sem header x-signature.')
            return False

        # Extrai ts e v1 do header x-signature (formato: "ts=...,v1=...")
        parts = {}
        for part in x_signature.split(','):
            kv = part.strip().split('=', 1)
            if len(kv) == 2:
                parts[kv[0].strip()] = kv[1].strip()

        ts = parts.get('ts', '')
        v1 = parts.get('v1', '')

        if not ts or not v1:
            logger.warning('Webhook MP com x-signature malformado: %s', x_signature)
            return False

        # Monta o manifest conforme documentação do MP
        manifest = f'id:{data_id};request-id:{x_request_id};ts:{ts};'
        expected = hmac.new(
            key=secret.encode(),
            msg=manifest.encode(),
            digestmod=hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, v1)


# ─── Asaas PIX Gateway ───────────────────────────────────────────────────────


class AsaasPixGateway:
    """
    Gateway de pagamento via PIX usando a API do Asaas.

    Fluxo:
      1. Encontrar ou criar customer (POST /customers)
      2. Criar cobrança PIX (POST /payments)
      3. Buscar QR code PIX (GET /payments/{id}/pixQrCode)

    Docs: https://docs.asaas.com/reference
    """

    def __init__(self):
        self.api_key = settings.ASAAS_API_KEY
        self.base_url = settings.ASAAS_BASE_URL.rstrip('/')
        if not self.api_key:
            raise ValidationError('Integração com Asaas não configurada. Configure ASAAS_API_KEY no .env.')

    def _headers(self):
        return {
            'access_token': self.api_key,
            'Content-Type': 'application/json',
        }

    # ── Customer ──────────────────────────────────────────────────────────

    def _find_or_create_customer(self, *, name: str, cpf_cnpj: str, email: str) -> str:
        """
        Busca customer existente por cpfCnpj ou cria um novo.
        Retorna o ID do customer no Asaas.
        """
        # Tenta encontrar customer existente
        search_resp = requests.get(
            f'{self.base_url}/customers',
            params={'cpfCnpj': cpf_cnpj},
            headers=self._headers(),
            timeout=15,
        )
        if search_resp.status_code == 200:
            data = search_resp.json()
            customers = data.get('data', [])
            if customers:
                return customers[0]['id']

        # Cria novo customer
        payload = {
            'name': name,
            'cpfCnpj': cpf_cnpj,
            'email': email,
        }
        resp = requests.post(
            f'{self.base_url}/customers',
            json=payload,
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            raise ValidationError(_extract_asaas_error(resp, 'Erro ao cadastrar cliente no Asaas.'))

        return resp.json()['id']

    # ── Criar cobrança PIX ────────────────────────────────────────────────

    def create_pix_charge(
        self,
        *,
        enrollment,
        payer_name: str,
        payer_cpf_cnpj: str,
        payer_email: str,
        amount: Decimal,
    ) -> PixChargeData:
        """
        Cria uma cobrança PIX no Asaas e retorna os dados do QR code.
        """
        # 1. Encontrar ou criar customer
        customer_id = self._find_or_create_customer(
            name=payer_name,
            cpf_cnpj=payer_cpf_cnpj,
            email=payer_email,
        )

        # 2. Calcular expiração
        expiration_minutes = getattr(settings, 'PIX_PAYMENT_EXPIRATION_MINUTES', 30)
        due_date = (timezone.now() + timezone.timedelta(minutes=expiration_minutes)).date()
        expires_at = timezone.now() + timezone.timedelta(minutes=expiration_minutes)
        external_reference = f'fnc:enrollment:{enrollment.id}'

        # 3. Criar cobrança
        charge_payload = {
            'customer': customer_id,
            'billingType': 'PIX',
            'value': float(amount),
            'dueDate': due_date.isoformat(),
            'description': f'Inscrição {enrollment.team.name} - {enrollment.championship.name}',
            'externalReference': external_reference,
        }

        charge_resp = requests.post(
            f'{self.base_url}/payments',
            json=charge_payload,
            headers=self._headers(),
            timeout=20,
        )
        if charge_resp.status_code >= 400:
            raise ValidationError(_extract_asaas_error(charge_resp, 'Erro ao gerar cobrança Pix no Asaas.'))

        charge_data = charge_resp.json()
        asaas_payment_id = charge_data['id']

        # 4. Buscar QR code PIX
        qr_code = ''
        qr_code_base64 = ''
        try:
            qr_resp = requests.get(
                f'{self.base_url}/payments/{asaas_payment_id}/pixQrCode',
                headers=self._headers(),
                timeout=15,
            )
            if qr_resp.status_code == 200:
                qr_data = qr_resp.json()
                qr_code = qr_data.get('payload', '')
                qr_code_base64 = qr_data.get('encodedImage', '')
        except Exception as exc:
            logger.warning('Falha ao obter QR code PIX do Asaas: %s', exc)

        return PixChargeData(
            payment_id=asaas_payment_id,
            status=_map_asaas_status(charge_data.get('status', 'PENDING')),
            external_reference=charge_data.get('externalReference', external_reference),
            qr_code=qr_code,
            qr_code_base64=qr_code_base64,
            ticket_url=charge_data.get('invoiceUrl', ''),
            expires_at=expires_at,
            raw_response=charge_data,
        )

    # ── Consultar pagamento ───────────────────────────────────────────────

    def get_payment(self, gateway_payment_id: str) -> dict:
        """Consulta o status de uma cobrança no Asaas."""
        resp = requests.get(
            f'{self.base_url}/payments/{gateway_payment_id}',
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            raise ValidationError(_extract_asaas_error(resp, 'Erro ao consultar pagamento no Asaas.'))
        return resp.json()

    # ── Simular pagamento (apenas sandbox) ────────────────────────────────

    def simulate_payment(self, gateway_payment_id: str) -> dict:
        """
        Simula a confirmação de um pagamento PIX no sandbox do Asaas.
        NÃO funciona em produção.
        """
        resp = requests.post(
            f'{self.base_url}/payments/{gateway_payment_id}/receiveInCash',
            json={
                'paymentDate': timezone.now().date().isoformat(),
                'value': 0,  # 0 = usa o valor original da cobrança
                'notifyCustomer': False,
            },
            headers=self._headers(),
            timeout=15,
        )
        if resp.status_code >= 400:
            raise ValidationError(_extract_asaas_error(resp, 'Erro ao simular pagamento no Asaas.'))
        return resp.json()


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _map_mp_status(status_value: str) -> str:
    """
    Mapeia os status do Mercado Pago para os status internos do Payment.

    MP statuses: pending, approved, authorized, in_process, in_mediation,
                 rejected, cancelled, refunded, charged_back
    """
    status_lower = (status_value or '').lower()
    if status_lower == 'approved':
        return 'PAID'
    if status_lower in {'cancelled', 'rejected', 'refunded', 'charged_back'}:
        return 'FAILED'
    return 'PENDING'


def _extract_mp_error(response, fallback_message: str) -> dict:
    """Extrai mensagem de erro da resposta do Mercado Pago."""
    if not response.content:
        return {'error': fallback_message}
    try:
        data = response.json()
    except ValueError:
        return {'error': fallback_message}
    message = data.get('message') or data.get('error') or fallback_message
    cause = data.get('cause', [])
    if cause:
        descriptions = [c.get('description', '') for c in cause if c.get('description')]
        if descriptions:
            message = f"{fallback_message}: {' | '.join(descriptions)}"
    return {'error': message, 'gateway_error': data}


def _map_asaas_status(status_value: str) -> str:
    """
    Mapeia os status do Asaas para os status internos do Payment.
    """
    status_upper = (status_value or '').upper()
    if status_upper in {'CONFIRMED', 'RECEIVED', 'RECEIVED_IN_CASH'}:
        return 'PAID'
    if status_upper == 'OVERDUE':
        return 'EXPIRED'
    if status_upper in {
        'REFUNDED', 'REFUND_REQUESTED', 'REFUND_IN_PROGRESS',
        'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE',
        'AWAITING_CHARGEBACK_REVERSAL',
    }:
        return 'FAILED'
    return 'PENDING'


def _extract_asaas_error(response, fallback_message: str) -> dict:
    """Extrai mensagem de erro da resposta do Asaas."""
    if not response.content:
        return {'error': fallback_message}
    try:
        data = response.json()
    except ValueError:
        return {'error': fallback_message}
    errors = data.get('errors', [])
    if errors:
        descriptions = [e.get('description', '') for e in errors if e.get('description')]
        if descriptions:
            return {
                'error': f"{fallback_message}: {' | '.join(descriptions)}",
                'gateway_error': data,
            }
    message = data.get('message') or data.get('error') or fallback_message
    return {'error': message, 'gateway_error': data}


# ─── Enrollment Checkout Service ──────────────────────────────────────────────


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

        # Inscrição gratuita — aprovação imediata
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

        # Cobrança PIX via Mercado Pago
        owner = team.owner
        payer_name = owner.get_full_name() or owner.email.split('@')[0]
        payer_cpf = getattr(owner, 'cpf', '') or getattr(owner, 'document', '') or ''

        if not payer_cpf:
            raise ValidationError(
                'CPF do responsável pelo time é obrigatório para gerar o pagamento.'
            )

        # Em sandbox, usa email de teste para evitar "Unauthorized use of live credentials"
        payer_email = user.email
        sandbox_email = getattr(settings, 'MP_SANDBOX_PAYER_EMAIL', '')
        if sandbox_email:
            payer_email = sandbox_email

        gateway = MercadoPagoPixGateway()
        charge = gateway.create_pix_charge(
            enrollment=enrollment,
            payer_name=payer_name,
            payer_cpf=payer_cpf,
            payer_email=payer_email,
            amount=championship.enrollment_fee,
        )

        payment = Payment.objects.create(
            enrollment=enrollment,
            team=team,
            championship=championship,
            amount=championship.enrollment_fee,
            provider=Payment.Provider.MERCADO_PAGO,
            status=charge.status,
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


# ─── Payment Sync Service ────────────────────────────────────────────────────


class PaymentSyncService:
    @staticmethod
    @transaction.atomic
    def sync_payment(payment: Payment, gateway_payload: dict) -> Payment:
        """Sincroniza o Payment local com os dados recebidos do gateway."""
        payment = Payment.objects.select_for_update().get(pk=payment.pk)

        raw_status = gateway_payload.get('status', '')
        if payment.provider == Payment.Provider.MERCADO_PAGO:
            mapped_status = _map_mp_status(raw_status)
        else:
            mapped_status = _map_asaas_status(raw_status)

        payment.status = mapped_status
        payment.gateway_external_reference = gateway_payload.get(
            'externalReference', payment.gateway_external_reference
        )
        payment.ticket_url = gateway_payload.get('invoiceUrl', payment.ticket_url or '')
        payment.webhook_last_payload = gateway_payload
        payment.raw_response = gateway_payload

        if mapped_status == Payment.Status.PAID and not payment.paid_at:
            payment.paid_at = timezone.now()
        payment.save()

        # Atualiza enrollment conforme status
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
        """Consulta o status atual no gateway e sincroniza. Suporta MP e Asaas."""
        if payment.provider == Payment.Provider.MERCADO_PAGO:
            gateway = MercadoPagoPixGateway()
            payload = gateway.get_payment(payment.gateway_payment_id)
            # Normaliza payload do MP para o formato esperado pelo sync_payment
            normalized = {
                'status': payload.get('status', 'pending'),
                'externalReference': payload.get('external_reference', ''),
                'invoiceUrl': payload.get('point_of_interaction', {})
                              .get('transaction_data', {}).get('ticket_url', ''),
            }
        else:
            # Asaas (legado)
            gateway = AsaasPixGateway()
            payload = gateway.get_payment(payment.gateway_payment_id)
            normalized = payload

            # Atualizar QR code Asaas se ainda não temos
            if not payment.pix_qr_code_text or not payment.pix_qr_code_base64:
                try:
                    qr_resp = requests.get(
                        f'{gateway.base_url}/payments/{payment.gateway_payment_id}/pixQrCode',
                        headers=gateway._headers(),
                        timeout=15,
                    )
                    if qr_resp.status_code == 200:
                        qr_data = qr_resp.json()
                        payment.pix_qr_code_text = qr_data.get('payload', payment.pix_qr_code_text or '')
                        payment.pix_qr_code_base64 = qr_data.get('encodedImage', payment.pix_qr_code_base64 or '')
                        payment.save(update_fields=['pix_qr_code_text', 'pix_qr_code_base64'])
                except Exception as exc:
                    logger.warning('Falha ao atualizar QR code Asaas: %s', exc)

        return PaymentSyncService.sync_payment(payment, normalized)


# ─── Asaas Webhook Service ───────────────────────────────────────────────────


class AsaasWebhookService:
    """
    Processa webhooks do Asaas.

    Payload do webhook Asaas:
    {
        "event": "PAYMENT_CONFIRMED" | "PAYMENT_RECEIVED" | "PAYMENT_OVERDUE" | ...,
        "payment": {
            "id": "pay_xxxx",
            "customer": "cus_xxxx",
            "value": 50.0,
            "status": "CONFIRMED",
            "externalReference": "fnc:enrollment:123",
            ...
        }
    }

    Docs: https://docs.asaas.com/reference/webhook
    """

    @staticmethod
    @transaction.atomic
    def process(payload: dict) -> Optional[Payment]:
        event_type = payload.get('event', 'unknown')
        payment_data = payload.get('payment', {})
        asaas_payment_id = payment_data.get('id', '').strip()

        if not asaas_payment_id:
            logger.warning('Webhook Asaas recebido sem payment.id: %s', payload)
            return None

        # Deduplica eventos
        event_id = f'{event_type}:{asaas_payment_id}'
        event, created = PaymentEvent.objects.get_or_create(
            gateway_event_id=event_id,
            defaults={
                'provider': Payment.Provider.ASAAS,
                'event_type': event_type,
                'payload': payload,
            },
        )
        if not created and event.processed:
            return event.payment

        # Busca Payment local
        payment = (
            Payment.objects
            .filter(gateway_payment_id=asaas_payment_id)
            .select_related('enrollment')
            .first()
        )
        if not payment:
            event.last_error = 'Pagamento local não encontrado.'
            event.payload = payload
            event.save(update_fields=['last_error', 'payload'])
            logger.warning('Payment %s não encontrado localmente para webhook Asaas.', asaas_payment_id)
            return None

        # Sincroniza com dados frescos do gateway (não do webhook diretamente)
        try:
            refreshed_payment = PaymentSyncService.refresh_payment(payment)
        except Exception as exc:
            # Se falhar o refresh, sincroniza com os dados do webhook mesmo
            logger.warning('Refresh falhou, usando dados do webhook: %s', exc)
            refreshed_payment = PaymentSyncService.sync_payment(payment, payment_data)

        event.payment = refreshed_payment
        event.payload = payload
        event.processed = True
        event.processed_at = timezone.now()
        event.last_error = ''
        event.save(update_fields=['payment', 'payload', 'processed', 'processed_at', 'last_error'])
        return refreshed_payment


# ─── Mercado Pago Webhook Service ────────────────────────────────────────────


class MercadoPagoWebhookService:
    """
    Processa webhooks do Mercado Pago.

    O MP envia notificação com:
    {
        "action": "payment.updated",
        "api_version": "v1",
        "data": { "id": "123456789" },
        "date_created": "2026-03-31T15:00:00.000-03:00",
        "id": 12345,
        "live_mode": true,
        "type": "payment",
        "user_id": "..."
    }

    O webhook NÃO traz os dados completos — precisamos consultar GET /v1/payments/{id}
    Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
    """

    @staticmethod
    @transaction.atomic
    def process(payload: dict) -> Optional[Payment]:
        topic = payload.get('type', payload.get('topic', ''))
        if topic != 'payment':
            logger.info('Webhook MP ignorado (tipo=%s)', topic)
            return None

        mp_payment_id = str(payload.get('data', {}).get('id', '')).strip()
        if not mp_payment_id:
            logger.warning('Webhook MP sem data.id: %s', payload)
            return None

        action = payload.get('action', 'unknown')

        # Deduplica eventos
        event_id = f'mp:{action}:{mp_payment_id}'
        event, created = PaymentEvent.objects.get_or_create(
            gateway_event_id=event_id,
            defaults={
                'provider': Payment.Provider.MERCADO_PAGO,
                'event_type': action,
                'payload': payload,
            },
        )
        if not created and event.processed:
            return event.payment

        # Busca Payment local
        payment = (
            Payment.objects
            .filter(gateway_payment_id=mp_payment_id)
            .select_related('enrollment')
            .first()
        )
        if not payment:
            event.last_error = 'Pagamento local não encontrado.'
            event.payload = payload
            event.save(update_fields=['last_error', 'payload'])
            logger.warning('Payment MP %s não encontrado localmente.', mp_payment_id)
            return None

        # Consulta dados completos no MP e sincroniza
        try:
            refreshed_payment = PaymentSyncService.refresh_payment(payment)
        except Exception as exc:
            logger.warning('Refresh MP falhou: %s', exc)
            # Fallback mínimo — marca como os dados que temos
            refreshed_payment = payment

        event.payment = refreshed_payment
        event.payload = payload
        event.processed = True
        event.processed_at = timezone.now()
        event.last_error = ''
        event.save(update_fields=['payment', 'payload', 'processed', 'processed_at', 'last_error'])
        return refreshed_payment
