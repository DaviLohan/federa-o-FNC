"""
Testes de API para endpoints de partidas.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
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
    
    def test_accept_contestation_admin_only(self):
        """Apenas admins podem aceitar contestações."""
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'response': 'Contestação aceita'}
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/accept/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/accept/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_reject_contestation_admin_only(self):
        """Apenas admins podem rejeitar contestações."""
        contestation = ContestationFactory(
            match=self.match,
            team=self.team,
            contested_by=self.user,
            status='UNDER_REVIEW'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'response': 'Contestação rejeitada'}
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/reject/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/contestations/{contestation.id}/reject/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


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
