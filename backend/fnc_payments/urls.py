from django.urls import include, path
from rest_framework.routers import DefaultRouter

from fnc_payments.views import (
    PaymentViewSet,
    mercadopago_webhook,
    asaas_webhook,
    asaas_withdrawal_webhook,
)


router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    # Mercado Pago (gateway ativo)
    path('payments/webhooks/mercadopago/', mercadopago_webhook, name='payments-webhook-mercadopago'),
    # Asaas (legado — mantido para pagamentos antigos)
    path('payments/webhooks/asaas/', asaas_webhook, name='payments-webhook-asaas'),
    path('payments/webhooks/asaas-withdrawal/', asaas_withdrawal_webhook, name='payments-webhook-asaas-withdrawal'),
]
