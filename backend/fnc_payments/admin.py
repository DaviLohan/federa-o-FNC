from django.contrib import admin
from .models import Payment, PaymentEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'team', 'championship', 'status', 'amount', 'created_at']
    list_filter = ['status']
    search_fields = ['team__name', 'championship__name']


@admin.register(PaymentEvent)
class PaymentEventAdmin(admin.ModelAdmin):
    list_display = ['id', 'payment', 'event_type', 'created_at']
    list_filter = ['event_type']
