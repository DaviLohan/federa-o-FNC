from django.urls import include, path
from rest_framework.routers import DefaultRouter

from fnc_payments.views import PaymentViewSet, mercadopago_webhook


router = DefaultRouter()
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
    path('payments/webhooks/mercadopago/', mercadopago_webhook, name='payments-webhook-mercadopago'),
]
