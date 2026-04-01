import logging

from django.conf import settings
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response

from fnc_payments.models import Payment
from fnc_payments.serializers import PaymentSerializer, PaymentStatusSerializer
from fnc_payments.services import (
    AsaasWebhookService,
    MercadoPagoPixGateway,
    MercadoPagoWebhookService,
    PaymentSyncService,
)

logger = logging.getLogger(__name__)


class IsPaymentOwnerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.user_type in ['ADMIN', 'SUPERVISOR']:
            return True
        return obj.team.owner_id == request.user.id


class PaymentViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Payment.objects.select_related('team', 'championship', 'enrollment')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsPaymentOwnerOrAdmin]

    def get_serializer_class(self):
        if self.action == 'status':
            return PaymentStatusSerializer
        return PaymentSerializer

    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        payment = self.get_object()
        # Leitura rápida do banco — webhook atualiza em tempo real.
        # Fallback: se PENDING há mais de 20s sem atualização, consulta o gateway uma vez.
        if payment.status == Payment.Status.PENDING and payment.gateway_payment_id:
            from django.utils import timezone
            from datetime import timedelta
            age = timezone.now() - payment.updated_at
            if age > timedelta(seconds=20):
                try:
                    payment = PaymentSyncService.refresh_payment(payment)
                except Exception as exc:
                    logger.warning('Falha ao consultar status no gateway: %s', exc)
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        payment = self.get_object()
        payment = PaymentSyncService.refresh_payment(payment)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


# ─── Mercado Pago Webhook ─────────────────────────────────────────────────────


@api_view(['POST'])
@permission_classes([AllowAny])
def mercadopago_webhook(request):
    """
    Endpoint para receber webhooks do Mercado Pago.
    Configurar no painel MP: POST https://seu-dominio/api/v1/payments/webhooks/mercadopago/

    O MP envia:
    - query param: ?data.id=123&type=payment
    - body: { "action": "payment.updated", "data": { "id": "123" }, "type": "payment" }
    """
    # ── Validação de assinatura HMAC ──────────────────────────────────────
    x_signature = request.headers.get('x-signature', '')
    x_request_id = request.headers.get('x-request-id', '')

    payload = request.data or {}

    # MP às vezes envia info via query params (IPN legacy)
    if not payload.get('data') and request.query_params.get('data.id'):
        payload = {
            'type': request.query_params.get('type', 'payment'),
            'data': {'id': request.query_params.get('data.id', '')},
            'action': 'payment.updated',
        }

    data_id = str((payload.get('data') or {}).get('id', ''))

    if not MercadoPagoPixGateway.verify_webhook_signature(
        x_signature=x_signature,
        x_request_id=x_request_id,
        data_id=data_id,
        secret=settings.MP_WEBHOOK_SECRET,
    ):
        logger.warning('Webhook MP com assinatura inválida — rejeitado. data_id=%s', data_id)
        return Response(
            {'error': 'Assinatura inválida.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    logger.info('Webhook MP recebido: action=%s data.id=%s',
                payload.get('action', '?'), data_id)

    payment = MercadoPagoWebhookService.process(payload)
    return Response(
        {
            'received': True,
            'payment_id': payment.id if payment else None,
        },
        status=status.HTTP_200_OK,
    )


# ─── Asaas Webhooks (legado) ─────────────────────────────────────────────────


@api_view(['POST'])
@permission_classes([AllowAny])
def asaas_webhook(request):
    """Webhook Asaas (legado — mantido para pagamentos antigos)."""
    expected_token = getattr(settings, 'ASAAS_WEBHOOK_ACCESS_TOKEN', '')
    received_token = request.headers.get('asaas-access-token', '')

    if not expected_token:
        logger.error('ASAAS_WEBHOOK_ACCESS_TOKEN não configurado — rejeitando webhook por segurança.')
        return Response({'error': 'Serviço não configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if received_token != expected_token:
        logger.warning('Webhook Asaas com token inválido: %s', received_token[:20])
        return Response({'received': False, 'error': 'Token inválido.'}, status=status.HTTP_401_UNAUTHORIZED)

    payment = AsaasWebhookService.process(request.data or {})
    return Response(
        {
            'received': True,
            'payment_id': payment.id if payment else None,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def asaas_withdrawal_webhook(request):
    """Webhook de saque Asaas (legado)."""
    expected_token = getattr(settings, 'ASAAS_WITHDRAWAL_WEBHOOK_TOKEN', '')
    received_token = request.headers.get('asaas-access-token', '')

    if not expected_token:
        logger.error('ASAAS_WITHDRAWAL_WEBHOOK_TOKEN não configurado — rejeitando webhook por segurança.')
        return Response({'status': 'REFUSED', 'refuseReason': 'Serviço não configurado.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

    if received_token != expected_token:
        return Response(
            {'status': 'REFUSED', 'refuseReason': 'Token inválido.'},
            status=status.HTTP_200_OK,
        )

    logger.info('Webhook de saque Asaas — APPROVED')
    return Response({'status': 'APPROVED'}, status=status.HTTP_200_OK)
