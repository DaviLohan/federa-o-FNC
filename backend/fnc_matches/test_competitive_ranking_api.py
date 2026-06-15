from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import PlayerProfile


User = get_user_model()


class CompetitiveRankingAPITestCase(APITestCase):
    def setUp(self):
        self.player_user = User.objects.create_user(
            email='rank-player@fnc.com',
            password='123456',
            user_type='PLAYER',
            is_active=True,
        )
        self.player_profile = PlayerProfile.objects.create(
            user=self.player_user,
            player_name='Ranking Player',
            gamer_tag='rankplayer',
        )

    def test_rankings_endpoint_returns_competitive_payload(self):
        response = self.client.get('/api/v1/statistics/rankings/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('cycle', response.data)
        self.assertIn('tiers', response.data)
        self.assertIn('general', response.data)
        self.assertIn('total_players', response.data)

    def test_rankings_me_requires_authentication(self):
        response = self.client.get('/api/v1/statistics/rankings/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rankings_me_returns_player_payload_when_authenticated(self):
        self.client.force_authenticate(user=self.player_user)
        response = self.client.get('/api/v1/statistics/rankings/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['playerId'], self.player_profile.id)
        self.assertIn('currentTier', response.data)
        self.assertIn('positionsToPromotion', response.data)
        self.assertIn('pointsToPromotion', response.data)
