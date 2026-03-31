from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from fnc_championships.models import ChampionshipEnrollment
from fnc_payments.models import Payment, PaymentEvent
from fnc_teams.models import Team, TeamMembership
from users.models import PlayerProfile, User
from fnc_championships.models import Championship


def create_user(email, *, user_type='PLAYER'):
    return User.objects.create_user(
        email=email,
        password='testpass123',
        first_name='Test',
        last_name='User',
        platform='PS',
        user_type=user_type,
    )


def create_championship(**overrides):
    now = timezone.now()
    admin = overrides.pop('created_by', create_user(f'admin-{now.timestamp()}@fnc.com', user_type='ADMIN'))
    return Championship.objects.create(
        name=overrides.pop('name', 'Campeonato Teste'),
        description=overrides.pop('description', 'Descricao'),
        rules=overrides.pop('rules', 'Regras'),
        championship_type=overrides.pop('championship_type', 'LEAGUE'),
        status=overrides.pop('status', 'OPEN'),
        enrollment_start=overrides.pop('enrollment_start', now - timezone.timedelta(days=1)),
        enrollment_end=overrides.pop('enrollment_end', now + timezone.timedelta(days=7)),
        start_date=overrides.pop('start_date', now + timezone.timedelta(days=14)),
        end_date=overrides.pop('end_date', now + timezone.timedelta(days=60)),
        enrollment_fee=overrides.pop('enrollment_fee', Decimal('100.00')),
        prize_pool=overrides.pop('prize_pool', Decimal('500.00')),
        max_teams=overrides.pop('max_teams', 16),
        min_teams=overrides.pop('min_teams', 4),
        number_of_winners=overrides.pop('number_of_winners', 1),
        created_by=admin,
        **overrides,
    )


def create_team(owner, name='Time Teste', abbreviation='TT'):
    return Team.objects.create(owner=owner, name=name, abbreviation=abbreviation, description='Desc')


def seed_team_players(team, total=5):
    for _ in range(total):
        index = TeamMembership.objects.filter(team=team).count() + 1
        player_user = create_user(f'player{team.id}-{index}@fnc.com')
        profile = PlayerProfile.objects.create(
            user=player_user,
            player_name=f'Jogador {index}',
            gamer_tag=f'player{team.id}{index}',
            shirt_number=index,
            primary_position='ST',
            birth_date=timezone.now().date() - timezone.timedelta(days=365 * 20),
            whatsapp='11999999999',
            country='Brasil',
            language='pt-br',
            is_active=True,
        )
        TeamMembership.objects.create(team=team, player=profile, role='PLAYER', is_active=True)


@override_settings(MERCADOPAGO_ACCESS_TOKEN='test-token')
class PixCheckoutTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_user('owner@fnc.com', user_type='TEAM_OWNER')
        self.team = create_team(self.owner)
        seed_team_players(self.team)

    def test_free_enrollment_confirms_automatically(self):
        championship = create_championship(enrollment_fee=Decimal('0.00'))
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            '/api/v1/enrollments/',
            {'championship_id': championship.id, 'team_id': self.team.id},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertFalse(response.data['requires_payment'])
        self.assertIsNone(response.data['payment'])

        enrollment = ChampionshipEnrollment.objects.get(championship=championship, team=self.team)
        self.assertEqual(enrollment.status, 'APPROVED')
        self.assertEqual(enrollment.payment_status, 'PAID')

    @patch('fnc_payments.services.MercadoPagoPixGateway.create_pix_charge')
    def test_paid_enrollment_generates_pix_payment(self, mock_create_pix_charge):
        mock_create_pix_charge.return_value = type(
            'Charge',
            (),
            {
                'payment_id': 'mp-123',
                'status': 'pending',
                'external_reference': 'fnc:enrollment:1',
                'qr_code': '000201pix',
                'qr_code_base64': 'ZmFrZS1xci1jb2Rl',
                'ticket_url': 'https://mercadopago.com/ticket/123',
                'expires_at': timezone.now() + timezone.timedelta(minutes=30),
                'raw_response': {'id': 'mp-123', 'status': 'pending'},
            },
        )()
        championship = create_championship(enrollment_fee=Decimal('150.00'))
        self.client.force_authenticate(user=self.owner)

        response = self.client.post(
            '/api/v1/enrollments/',
            {'championship_id': championship.id, 'team_id': self.team.id},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['requires_payment'])
        self.assertEqual(response.data['payment']['gateway_payment_id'], 'mp-123')
        self.assertEqual(response.data['payment']['pix_qr_code_text'], '000201pix')

        enrollment = ChampionshipEnrollment.objects.get(championship=championship, team=self.team)
        payment = Payment.objects.get(enrollment=enrollment)
        self.assertEqual(enrollment.status, 'PENDING_PAYMENT')
        self.assertEqual(enrollment.payment_status, 'PENDING')
        self.assertEqual(payment.status, 'PENDING')
        self.assertEqual(payment.gateway_payment_id, 'mp-123')


@override_settings(MERCADOPAGO_ACCESS_TOKEN='test-token')
class MercadoPagoWebhookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.owner = create_user('owner2@fnc.com', user_type='TEAM_OWNER')
        self.team = create_team(self.owner, name='Time Webhook', abbreviation='TW')
        self.championship = create_championship(enrollment_fee=Decimal('120.00'), name='Championship Webhook')
        self.enrollment = ChampionshipEnrollment.objects.create(
            championship=self.championship,
            team=self.team,
            status='PENDING_PAYMENT',
            payment_status='PENDING',
        )
        self.payment = Payment.objects.create(
            enrollment=self.enrollment,
            team=self.team,
            championship=self.championship,
            amount=Decimal('120.00'),
            status='PENDING',
            gateway_payment_id='mp-456',
            gateway_external_reference=f'fnc:enrollment:{self.enrollment.id}',
        )

    @patch('fnc_payments.services.PaymentSyncService.refresh_payment')
    def test_webhook_is_idempotent_and_confirms_enrollment(self, mock_refresh_payment):
        def fake_refresh(payment):
            payment.status = 'PAID'
            payment.paid_at = timezone.now()
            payment.save(update_fields=['status', 'paid_at'])
            enrollment = payment.enrollment
            enrollment.status = 'APPROVED'
            enrollment.payment_status = 'PAID'
            enrollment.approved_at = timezone.now()
            enrollment.save(update_fields=['status', 'payment_status', 'approved_at'])
            return payment

        mock_refresh_payment.side_effect = fake_refresh
        payload = {'id': 'evt-1', 'type': 'payment', 'data': {'id': 'mp-456'}}

        first = self.client.post('/api/v1/payments/webhooks/mercadopago/', payload, format='json')
        second = self.client.post('/api/v1/payments/webhooks/mercadopago/', payload, format='json')

        self.assertEqual(first.status_code, status.HTTP_200_OK)
        self.assertEqual(second.status_code, status.HTTP_200_OK)
        self.assertEqual(PaymentEvent.objects.filter(gateway_event_id='evt-1').count(), 1)
        self.assertEqual(mock_refresh_payment.call_count, 1)

        self.enrollment.refresh_from_db()
        self.payment.refresh_from_db()
        self.assertEqual(self.enrollment.status, 'APPROVED')
        self.assertEqual(self.enrollment.payment_status, 'PAID')
        self.assertEqual(self.payment.status, 'PAID')
