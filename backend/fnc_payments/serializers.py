from rest_framework import serializers

from fnc_payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source='team.name', read_only=True)
    championship_name = serializers.CharField(source='championship.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'team',
            'team_name',
            'championship',
            'championship_name',
            'amount',
            'provider',
            'status',
            'gateway_payment_id',
            'gateway_external_reference',
            'pix_qr_code_text',
            'pix_qr_code_base64',
            'ticket_url',
            'expires_at',
            'paid_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields


class PaymentStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'status', 'expires_at', 'paid_at', 'updated_at']
        read_only_fields = fields
