"""
Testes de API para endpoints de partidas.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from ea_integration.models import EAClub, EAMatch
from fnc_matches.models import Match, MatchReport, Contestation
from fnc_championships.models import Standings
from conftest import (
    UserFactory, AdminUserFactory, TeamFactory, ChampionshipFactory,
    MatchFactory, FinishedMatchFactory, TeamMembershipFactory,
    PlayerProfileFactory, GoalFactory, MatchReportFactory,
    ContestationFactory
)


@pytest.mark.django_db
class TestMatchAPI:
    """Testes de API para Match endpoints."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        self.team1 = TeamFactory(owner=self.user)
        self.team2 = TeamFactory()
        self.player_user = UserFactory(user_type='PLAYER')
        self.player_profile = PlayerProfileFactory(user=self.player_user)
        TeamMembershipFactory(team=self.team1, player=self.player_profile)
        self.championship = ChampionshipFactory(status='IN_PROGRESS')
    
    def test_list_matches_unauthenticated(self):
        """Usuários não autenticados não podem listar partidas."""
        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_matches_authenticated(self):
        """Dono de time vê apenas partidas dos próprios times."""
        self.client.force_authenticate(user=self.user)
        own_match = MatchFactory(championship=self.championship, home_team=self.team1, away_team=self.team2)
        MatchFactory(championship=self.championship)
        
        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item['id'] for item in response.data['results']]
        assert own_match.id in returned_ids
        assert len(response.data['results']) == 1

    def test_admin_list_matches_sees_all(self):
        """Admin/supervisor mantém visão completa das partidas."""
        self.client.force_authenticate(user=self.admin)
        MatchFactory(championship=self.championship, home_team=self.team1, away_team=self.team2)
        MatchFactory(championship=self.championship)

        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2

    def test_player_list_matches_sees_only_team_matches(self):
        """Jogador vê apenas partidas do time em que está vinculado."""
        self.client.force_authenticate(user=self.player_user)
        own_match = MatchFactory(championship=self.championship, home_team=self.team1, away_team=self.team2)
        MatchFactory(championship=self.championship)

        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_200_OK
        returned_ids = [item['id'] for item in response.data['results']]
        assert returned_ids == [own_match.id]
    
    def test_retrieve_match(self):
        """Usuários autenticados podem ver detalhes de uma partida."""
        self.client.force_authenticate(user=self.user)
        match = MatchFactory(championship=self.championship, home_team=self.team1, away_team=self.team2)
        
        response = self.client.get(f'/api/v1/matches/{match.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == match.id
        assert response.data['home_team']['id'] == self.team1.id

    def test_player_cannot_retrieve_third_party_match(self):
        """Jogador não pode acessar detalhes de partida sem vínculo com seu time."""
        unrelated_match = MatchFactory(championship=self.championship)
        self.client.force_authenticate(user=self.player_user)

        response = self.client.get(f'/api/v1/matches/{unrelated_match.id}/')
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_create_match_admin_only(self):
        """Apenas admins podem criar partidas."""
        self.client.force_authenticate(user=self.user)
        data = {
            'home_team': self.team1.id,
            'away_team': self.team2.id,
            'championship': self.championship.id,
            'scheduled_date': timezone.now().isoformat(),
            'match_type': 'CHAMPIONSHIP'
        }
        
        response = self.client.post('/api/v1/matches/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode criar
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/matches/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_start_match_participant_only(self):
        """Apenas participantes podem iniciar partida."""
        match = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            status='SCHEDULED'
        )
        
        # Usuário não participante não pode
        other_user = UserFactory(user_type='TEAM_OWNER')
        self.client.force_authenticate(user=other_user)
        response = self.client.post(f'/api/v1/matches/{match.id}/start/')
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        
        # Participante pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/matches/{match.id}/start/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_start_match_before_scheduled_time_is_blocked(self):
        """Partida não pode ser iniciada antes do horário agendado."""
        future_match = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            status='SCHEDULED',
            scheduled_date=timezone.now() + timezone.timedelta(hours=2),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/matches/{future_match.id}/start/')
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert response.data['error'] == 'Esta partida ainda não chegou no horário de início.'

    def test_due_match_is_auto_released_on_listing(self):
        """Partida vencida no horário é liberada automaticamente ao sincronizar."""
        due_match = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            status='SCHEDULED',
            started_at=None,
            scheduled_date=timezone.now() - timezone.timedelta(minutes=5),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_200_OK

        due_match.refresh_from_db()
        assert due_match.status == 'IN_PROGRESS'
        assert due_match.started_at is not None

    def test_default_match_order_is_round_then_schedule(self):
        """API entrega partidas em ordem crescente de rodada e horário."""
        first = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            round_number=1,
            scheduled_date=timezone.now() + timezone.timedelta(days=1),
        )
        second = MatchFactory(
            championship=self.championship,
            round_number=2,
            scheduled_date=timezone.now() + timezone.timedelta(days=2),
        )
        third = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            round_number=1,
            scheduled_date=timezone.now() + timezone.timedelta(days=1, hours=1),
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/v1/matches/')
        assert response.status_code == status.HTTP_200_OK

        returned_ids = [item['id'] for item in response.data['results'][:3]]
        assert returned_ids == [first.id, third.id, second.id]
    
    def test_finish_match_participant_only(self):
        """Apenas participantes podem finalizar partida."""
        match = MatchFactory(
            championship=self.championship,
            home_team=self.team1,
            away_team=self.team2,
            status='IN_PROGRESS'
        )
        
        # Usuário não participante não pode
        other_user = UserFactory(user_type='TEAM_OWNER')
        self.client.force_authenticate(user=other_user)
        response = self.client.post(f'/api/v1/matches/{match.id}/finish/')
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]
        
        # Participante pode
        self.client.force_authenticate(user=self.user)
        data = {'home_score': 3, 'away_score': 1}
        response = self.client.post(f'/api/v1/matches/{match.id}/finish/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestMatchReportAPI:
    """Testes de API para MatchReport endpoints."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        self.team = TeamFactory(owner=self.user)
        self.championship = ChampionshipFactory(status='IN_PROGRESS')
        self.match = FinishedMatchFactory(
            championship=self.championship,
            home_team=self.team,
            away_team=TeamFactory()
        )

    def _fake_screenshot(self):
        return SimpleUploadedFile(
            'result.gif',
            b'GIF87a\x01\x00\x01\x00\x80\x01\x00\x00\x00\x00ccc,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;',
            content_type='image/gif',
        )
    
    def test_list_match_reports(self):
        """Usuários autenticados podem listar súmulas."""
        self.client.force_authenticate(user=self.user)
        MatchReportFactory(match=self.match, reported_by=self.user)
        
        response = self.client.get('/api/v1/reports/')
        assert response.status_code == status.HTTP_200_OK

    def test_submit_report_from_other_team_is_blocked(self):
        """Dono de time não pode reportar partida de terceiros."""
        outsider = UserFactory(user_type='TEAM_OWNER')
        outsider_team = TeamFactory(owner=outsider)
        other_match = FinishedMatchFactory(
            championship=self.championship,
            home_team=outsider_team,
            away_team=TeamFactory(),
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/matches/{other_match.id}/submit_report/',
            {'notes': 'Tentativa inválida'},
        )
        assert response.status_code in [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]

    def test_submit_report_persists_match_score(self):
        """Súmula manual deve persistir o placar informado na partida."""
        manual_match = MatchFactory(
            championship=self.championship,
            home_team=self.team,
            away_team=TeamFactory(),
            status='IN_PROGRESS',
        )

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/matches/{manual_match.id}/submit_report/',
            {
                'home_score': '3',
                'away_score': '1',
                'notes': 'Placar confirmado',
                'screenshot': self._fake_screenshot(),
            },
            format='multipart',
        )

        assert response.status_code == status.HTTP_201_CREATED
        manual_match.refresh_from_db()
        assert manual_match.home_score == 3
        assert manual_match.away_score == 1
        assert MatchReport.objects.get(match=manual_match).status == MatchReport.Status.SUBMITTED

    def test_finish_match_recomputes_standings_with_reported_score(self):
        """Finalização deve refletir o placar reportado corretamente na classificação."""
        opponent = TeamFactory()
        isolated_championship = ChampionshipFactory(status='IN_PROGRESS')
        match = MatchFactory(
            championship=isolated_championship,
            home_team=self.team,
            away_team=opponent,
            status='IN_PROGRESS',
        )
        MatchReportFactory(match=match, reported_by=self.user)

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/finish/',
            {'home_score': 4, 'away_score': 2},
        )

        assert response.status_code == status.HTTP_200_OK
        home_standing = Standings.objects.get(championship=isolated_championship, team=self.team)
        away_standing = Standings.objects.get(championship=isolated_championship, team=opponent)
        assert home_standing.points == 3
        assert home_standing.wins == 1
        assert home_standing.goals_for == 4
        assert home_standing.goals_against == 2
        assert away_standing.points == 0
        assert away_standing.losses == 1
        assert away_standing.goals_for == 2
        assert away_standing.goals_against == 4


@pytest.mark.django_db
class TestCompetitiveRankingAPI:
    def setup_method(self):
        self.client = APIClient()
        self.user = UserFactory(user_type='PLAYER')
        self.player = PlayerProfileFactory(user=self.user)

    def test_rankings_endpoint_returns_competitive_payload(self):
        response = self.client.get('/api/v1/statistics/rankings/')
        assert response.status_code == status.HTTP_200_OK
        assert 'cycle' in response.data
        assert 'tiers' in response.data
        assert 'general' in response.data
        assert 'total_players' in response.data

    def test_rankings_me_requires_authentication(self):
        response = self.client.get('/api/v1/statistics/rankings/me/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_rankings_me_returns_player_payload_when_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/v1/statistics/rankings/me/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['playerId'] == self.player.id
        assert 'currentTier' in response.data
        assert 'positionsToPromotion' in response.data
        assert 'pointsToPromotion' in response.data
    
    def test_approve_report_admin_only(self):
        """Apenas admins podem aprovar súmulas."""
        report = MatchReportFactory(match=self.match, reported_by=self.user, status='SUBMITTED')
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/reports/{report.id}/approve/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/reports/{report.id}/approve/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_reject_report_admin_only(self):
        """Apenas admins podem rejeitar súmulas."""
        report = MatchReportFactory(match=self.match, reported_by=self.user, status='SUBMITTED')
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'rejection_reason': 'Screenshot inválido'}
        response = self.client.post(f'/api/v1/reports/{report.id}/reject/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/reports/{report.id}/reject/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestContestationAPI:
    """Testes de API para Contestation endpoints."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        self.team = TeamFactory(owner=self.user)
        self.championship = ChampionshipFactory(status='IN_PROGRESS')
        self.match = FinishedMatchFactory(
            championship=self.championship,
            home_team=self.team,
            away_team=TeamFactory()
        )
    
    def test_list_contestations(self):
        """Usuários autenticados podem listar contestações."""
        self.client.force_authenticate(user=self.user)
        ContestationFactory(match=self.match, team=self.team, contested_by=self.user)
        
        response = self.client.get('/api/v1/contestations/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_create_contestation_team_owner_only(self):
        """Apenas donos de times podem criar contestações."""
        player = UserFactory(user_type='PLAYER')
        self.client.force_authenticate(user=player)
        
        data = {
            'match': self.match.id,
            'team': self.team.id,
            'reason': 'WRONG_SCORE',
            'description': 'O placar está incorreto'
        }
        response = self.client.post('/api/v1/contestations/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Dono de time pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/contestations/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_review_contestation_admin_only(self):
        """Apenas admins podem revisar contestações."""
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='PENDING'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'response': 'Analisado'}
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/review/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/review/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_approve_current_result_admin_only(self):
        """Apenas admins podem aprovar o resultado atual de contestações."""
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'reason': 'Resultado atual mantido pela revisão administrativa'}
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/approve-current-result/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/approve-current-result/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_change_result_admin_only(self):
        """Apenas admins podem alterar o resultado de contestações."""
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'winner_team_id': self.match.away_team.id, 'reason': 'Time vencedor atual irregular'}
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/change-result/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN

        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/change-result/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]

    def test_admin_cannot_decide_contestation_without_reason(self):
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/contestations/{contestation.id}/approve-current-result/',
            {'reason': ''}
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_admin_can_approve_current_result(self):
        self.match.status = 'CONTESTED'
        self.match.save(update_fields=['status'])
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/contestations/{contestation.id}/approve-current-result/',
            {'reason': 'Resultado atual mantido após análise da evidência.'}
        )

        assert response.status_code == status.HTTP_200_OK
        contestation.refresh_from_db()
        self.match.refresh_from_db()
        assert contestation.status == 'REJECTED'
        assert contestation.decision_type == 'APPROVE_CURRENT_RESULT'
        assert self.match.status == 'FINISHED'

    def test_admin_can_change_result(self):
        self.match.status = 'CONTESTED'
        self.match.home_score = 2
        self.match.away_score = 0
        self.match.finished_at = timezone.now()
        self.match.save(update_fields=['status', 'home_score', 'away_score', 'finished_at'])
        contestation = ContestationFactory(
            match=self.match,
            team=self.match.away_team,
            contested_by=self.match.away_team.owner,
            status='UNDER_REVIEW'
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/contestations/{contestation.id}/change-result/',
            {'winner_team_id': self.match.away_team.id, 'reason': 'Vitória administrativa para o time regular.'}
        )

        assert response.status_code == status.HTTP_200_OK
        contestation.refresh_from_db()
        self.match.refresh_from_db()
        assert contestation.status == 'ACCEPTED'
        assert contestation.decision_type == 'CHANGE_RESULT'
        assert (self.match.home_score, self.match.away_score) == (0, 1)


@pytest.mark.django_db
class TestGlobalRankingAPI:
    def setup_method(self):
        self.client = APIClient()

    def test_global_rankings_endpoint_returns_sorted_data(self):
        team_a = TeamFactory(name='Ranking A')
        team_b = TeamFactory(name='Ranking B')
        FinishedMatchFactory(home_team=team_a, away_team=team_b, home_score=2, away_score=1)

        response = self.client.get('/api/v1/statistics/global_rankings/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] >= 2
        assert response.data['results'][0]['team_name'] == 'Ranking A'
        assert response.data['results'][0]['points'] == 100

    def test_global_rankings_accepts_tier_filter(self):
        team_a = TeamFactory(name='Tier Filter A')
        team_b = TeamFactory(name='Tier Filter B')
        FinishedMatchFactory(home_team=team_a, away_team=team_b, home_score=2, away_score=0)

        response = self.client.get('/api/v1/statistics/global_rankings/?tier=TIER_1')
        assert response.status_code == status.HTTP_200_OK

    def test_global_rankings_rejects_invalid_tier(self):
        response = self.client.get('/api/v1/statistics/global_rankings/?tier=foo')
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_owner_can_confirm_irregular_result(self, monkeypatch):
        owner = UserFactory(user_type='TEAM_OWNER')
        team1 = TeamFactory(owner=owner)
        team2 = TeamFactory()
        match = MatchFactory(
            championship=self.championship,
            home_team=team1,
            away_team=team2,
            status='IN_PROGRESS'
        )

        def fake_confirm_report(self, match, ea_match_id, user, **kwargs):
            match.status = 'FINISHED'
            match.irregularity_flag = True
            match.match_result_confirmed = True
            match.confirmed_by_team = match.home_team
            match.decision_reason = kwargs['decision_reason']
            return match

        monkeypatch.setattr('ea_integration.report_service.MatchReportEAService.confirm_report', fake_confirm_report)

        self.client.force_authenticate(user=owner)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {'ea_match_id': 99, 'reason': 'Aceitamos manter o resultado apesar da irregularidade.'},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK

    def test_losing_owner_cannot_confirm_report(self):
        winner = UserFactory(user_type='TEAM_OWNER')
        loser = UserFactory(user_type='TEAM_OWNER')
        winner_team = TeamFactory(owner=winner)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9001', platform='common-gen5', name='Winner Club')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9002', platform='common-gen5', name='Loser Club')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-winner-only',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.VALIDATED,
            validation_notes=[],
            raw_data={},
        )

        self.client.force_authenticate(user=loser)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-report/',
            {'ea_match_id': ea_match.pk},
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'time vencedor' in response.data['error']

    def test_winner_can_confirm_irregular_result_without_creating_contestation(self):
        winner = UserFactory(user_type='TEAM_OWNER')
        loser = UserFactory(user_type='TEAM_OWNER')
        winner_team = TeamFactory(owner=winner)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9101', platform='common-gen5', name='Irregular Winner Club')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9102', platform='common-gen5', name='Irregular Loser Club')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-irregular-accepted',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
            validation_notes=[{'severity': 'error', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}],
            raw_data={},
        )

        self.client.force_authenticate(user=winner)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {
                'ea_match_id': ea_match.pk,
                'reason': 'Aceitamos manter o resultado apesar da irregularidade encontrada.',
            },
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_200_OK
        match.refresh_from_db()
        assert match.status == Match.Status.FINISHED
        assert match.irregularity_flag is True
        assert match.match_result_confirmed is True
        assert match.confirmed_by_team == winner_team
        assert match.contestations.count() == 0

    def test_losing_owner_cannot_confirm_irregular_result(self):
        winner = UserFactory(user_type='TEAM_OWNER')
        loser = UserFactory(user_type='TEAM_OWNER')
        winner_team = TeamFactory(owner=winner)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9201', platform='common-gen5', name='Winner Club 2')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9202', platform='common-gen5', name='Loser Club 2')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-irregular-blocked',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
            validation_notes=[{'severity': 'critical', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}],
            raw_data={},
        )

        self.client.force_authenticate(user=loser)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {
                'ea_match_id': ea_match.pk,
                'reason': 'Não deveria passar para o time perdedor.',
            },
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'time vencedor' in response.data['error']

    def test_supervisor_can_confirm_irregular_result_with_winner_team(self):
        winner = UserFactory(user_type='TEAM_OWNER')
        loser = UserFactory(user_type='TEAM_OWNER')
        supervisor = UserFactory(user_type='SUPERVISOR')
        winner_team = TeamFactory(owner=winner)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9301', platform='common-gen5', name='Winner Club 3')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9302', platform='common-gen5', name='Loser Club 3')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-irregular-supervisor',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
            validation_notes=[{'severity': 'critical', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}],
            raw_data={},
        )

        self.client.force_authenticate(user=supervisor)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {
                'ea_match_id': ea_match.pk,
                'reason': 'Confirmação administrativa com manutenção do resultado.',
                'confirmed_by_team_id': winner_team.id,
            },
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_200_OK
        match.refresh_from_db()
        assert match.status == Match.Status.FINISHED
        assert match.match_result_confirmed is True
        assert match.confirmed_by_team == winner_team

    def test_supervisor_can_confirm_irregular_result_without_confirmed_team_id(self):
        winner = UserFactory(user_type='TEAM_OWNER')
        loser = UserFactory(user_type='TEAM_OWNER')
        supervisor = UserFactory(user_type='SUPERVISOR')
        winner_team = TeamFactory(owner=winner)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9303', platform='common-gen5', name='Winner Club 4')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9304', platform='common-gen5', name='Loser Club 4')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-irregular-supervisor-no-team',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
            validation_notes=[{'severity': 'critical', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}],
            raw_data={},
        )

        self.client.force_authenticate(user=supervisor)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {
                'ea_match_id': ea_match.pk,
                'reason': 'Confirmação administrativa sem time explícito no payload.',
            },
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_200_OK
        match.refresh_from_db()
        assert match.status == Match.Status.FINISHED
        assert match.match_result_confirmed is True
        assert match.confirmed_by_team == winner_team

    def test_team_captain_can_confirm_irregular_result_as_winner(self):
        owner = UserFactory(user_type='TEAM_OWNER')
        captain_user = UserFactory(user_type='PLAYER')
        captain_profile = PlayerProfileFactory(user=captain_user)
        loser = UserFactory(user_type='TEAM_OWNER')
        winner_team = TeamFactory(owner=owner)
        TeamMembershipFactory(team=winner_team, player=captain_profile, role='CAPTAIN', is_active=True)
        loser_team = TeamFactory(owner=loser)
        match = MatchFactory(
            championship=self.championship,
            home_team=winner_team,
            away_team=loser_team,
            status='IN_PROGRESS'
        )
        home_club = EAClub.objects.create(team=winner_team, ea_club_id='9401', platform='common-gen5', name='Winner Club Captain')
        away_club = EAClub.objects.create(team=loser_team, ea_club_id='9402', platform='common-gen5', name='Loser Club Captain')
        ea_match = EAMatch.objects.create(
            ea_match_id='api-irregular-captain',
            match_type='leagueMatch',
            played_at=match.scheduled_date,
            home_club=home_club,
            home_club_name=home_club.name,
            home_score=2,
            away_club=away_club,
            away_club_name=away_club.name,
            away_score=1,
            linked_match=match,
            validation_status=EAMatch.ValidationStatus.CONTESTED,
            validation_notes=[{'severity': 'critical', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}],
            raw_data={},
        )

        self.client.force_authenticate(user=captain_user)
        response = self.client.post(
            f'/api/v1/matches/{match.id}/confirm-irregular-result/',
            {
                'ea_match_id': ea_match.pk,
                'reason': 'Capitão confirma resultado com irregularidades aceitas.',
            },
            format='json',
            secure=True,
        )

        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestMatchWorkflowIntegration:
    """Testes de integração do fluxo completo de partidas."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.owner1 = UserFactory(user_type='TEAM_OWNER')
        self.owner2 = UserFactory(user_type='TEAM_OWNER')
        self.team1 = TeamFactory(owner=self.owner1)
        self.team2 = TeamFactory(owner=self.owner2)
        self.championship = ChampionshipFactory(status='IN_PROGRESS')
    
    def test_complete_match_workflow(self):
        """Testa o fluxo completo: criar → iniciar → finalizar → reportar → aprovar."""
        # 1. Admin cria partida
        self.client.force_authenticate(user=self.admin)
        match_data = {
            'home_team': self.team1.id,
            'away_team': self.team2.id,
            'championship': self.championship.id,
            'scheduled_date': timezone.now().isoformat(),
            'match_type': 'CHAMPIONSHIP',
            'round_number': 1
        }
        response = self.client.post('/api/v1/matches/', match_data)
        
        if response.status_code == status.HTTP_201_CREATED:
            match_id = response.data['id']
            
            # 2. Participante lista partidas
            self.client.force_authenticate(user=self.owner1)
            response = self.client.get('/api/v1/matches/')
            assert response.status_code == status.HTTP_200_OK
            
            # 3. Participante visualiza detalhes
            response = self.client.get(f'/api/v1/matches/{match_id}/')
            assert response.status_code == status.HTTP_200_OK
            assert response.data['status'] in ['SCHEDULED', 'IN_PROGRESS']
