from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated, BasePermission
from rest_framework.response import Response

from fnc_payments.models import Payment
from fnc_payments.serializers import PaymentSerializer, PaymentStatusSerializer
from fnc_payments.services import MercadoPagoWebhookService, PaymentSyncService


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
        serializer = self.get_serializer(payment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def refresh(self, request, pk=None):
        payment = self.get_object()
        payment = PaymentSyncService.refresh_payment(payment)
        serializer = PaymentSerializer(payment)
        return Response(serializer.data)


@api_view(['POST'])
@permission_classes([AllowAny])
def mercadopago_webhook(request):
    payment = MercadoPagoWebhookService.process(request.data or {})
    return Response(
        {
            'received': True,
            'payment_id': payment.id if payment else None,
        },
        status=status.HTTP_200_OK,
    )
