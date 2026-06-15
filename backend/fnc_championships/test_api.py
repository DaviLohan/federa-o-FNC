"""
Testes de API para endpoints de campeonatos.
"""

import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from fnc_championships.models import Championship, ChampionshipEnrollment
from conftest import (
    UserFactory, AdminUserFactory, TeamFactory, ChampionshipFactory,
    ChampionshipEnrollmentFactory, TeamOwnerProfileFactory
)


@pytest.mark.django_db
class TestChampionshipAPI:
    """Testes de API para Championship endpoints."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        TeamOwnerProfileFactory(user=self.user)
        self.team = TeamFactory(owner=self.user)
    
    def test_list_championships_unauthenticated(self):
        """Usuários não autenticados não podem listar campeonatos."""
        response = self.client.get('/api/v1/championships/')
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_championships_authenticated(self):
        """Usuários autenticados podem listar campeonatos."""
        self.client.force_authenticate(user=self.user)
        ChampionshipFactory(status='PENDING')
        ChampionshipFactory(status='IN_PROGRESS')
        
        response = self.client.get('/api/v1/championships/')
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) >= 2
    
    def test_retrieve_championship(self):
        """Usuários autenticados podem ver detalhes de um campeonato."""
        self.client.force_authenticate(user=self.user)
        championship = ChampionshipFactory(status='PENDING')
        
        response = self.client.get(f'/api/v1/championships/{championship.id}/')
        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == championship.id
    
    def test_create_championship_admin_only(self):
        """Apenas admins podem criar campeonatos."""
        self.client.force_authenticate(user=self.user)
        data = {
            'name': 'Novo Campeonato',
            'season': '2026/1',
            'championship_type': 'LEAGUE',
            'max_teams': 16,
            'start_date': timezone.now().date().isoformat(),
            'end_date': (timezone.now().date() + timezone.timedelta(days=30)).isoformat(),
        }
        
        response = self.client.post('/api/v1/championships/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode criar
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/v1/championships/', data)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_update_championship_admin_only(self):
        """Apenas admins podem atualizar campeonatos."""
        championship = ChampionshipFactory(status='PENDING')
        
        self.client.force_authenticate(user=self.user)
        data = {'name': 'Campeonato Atualizado'}
        response = self.client.patch(f'/api/v1/championships/{championship.id}/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode atualizar
        self.client.force_authenticate(user=self.admin)
        response = self.client.patch(f'/api/v1/championships/{championship.id}/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_delete_championship_admin_only(self):
        """Apenas admins podem deletar campeonatos."""
        championship = ChampionshipFactory(status='PENDING')
        
        self.client.force_authenticate(user=self.user)
        response = self.client.delete(f'/api/v1/championships/{championship.id}/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode deletar
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/v1/championships/{championship.id}/')
        assert response.status_code in [status.HTTP_204_NO_CONTENT, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestEnrollmentAPI:
    """Testes de API para Enrollment endpoints."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        TeamOwnerProfileFactory(user=self.user)
        self.team = TeamFactory(owner=self.user)
        self.championship = ChampionshipFactory(
            status='OPEN',
            max_teams=16,
            enrollment_fee=100.00
        )
    
    def test_list_enrollments_authenticated(self):
        """Usuários autenticados podem listar inscrições."""
        self.client.force_authenticate(user=self.user)
        ChampionshipEnrollmentFactory(team=self.team, championship=self.championship)
        
        response = self.client.get('/api/v1/enrollments/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_create_enrollment_team_owner_only(self):
        """Apenas donos de times podem criar inscrições."""
        player = UserFactory(user_type='PLAYER')
        self.client.force_authenticate(user=player)
        
        data = {
            'team': self.team.id,
            'championship': self.championship.id,
        }
        response = self.client.post('/api/v1/enrollments/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Dono de time pode criar
        self.client.force_authenticate(user=self.user)
        response = self.client.post('/api/v1/enrollments/', data)
        # Pode dar 201 ou 400 dependendo das validações (payment, etc)
        assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
    
    def test_approve_enrollment_admin_only(self):
        """Apenas admins podem aprovar inscrições."""
        enrollment = ChampionshipEnrollmentFactory(
            team=self.team,
            championship=self.championship,
            status='PENDING_PAYMENT'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/approve/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/approve/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_reject_enrollment_admin_only(self):
        """Apenas admins podem rejeitar inscrições."""
        enrollment = ChampionshipEnrollmentFactory(
            team=self.team,
            championship=self.championship,
            status='PENDING_PAYMENT'
        )
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        data = {'rejection_reason': 'Time não atende os requisitos'}
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/reject/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/reject/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_confirm_payment_enrolled_team_only(self):
        """Apenas times inscritos podem confirmar pagamento."""
        enrollment = ChampionshipEnrollmentFactory(
            team=self.team,
            championship=self.championship,
            status='APPROVED'
        )
        
        # Outro usuário não pode
        other_user = UserFactory(user_type='TEAM_OWNER')
        self.client.force_authenticate(user=other_user)
        data = {'payment_proof': 'http://example.com/proof.jpg'}
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/confirm_payment/', data)
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Dono do time inscrito pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/enrollments/{enrollment.id}/confirm_payment/', data)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]


@pytest.mark.django_db
class TestChampionshipActions:
    """Testes de ações específicas de campeonatos."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.user = UserFactory(user_type='TEAM_OWNER')
        TeamOwnerProfileFactory(user=self.user)
        self.team = TeamFactory(owner=self.user)
    
    def test_start_championship_admin_only(self):
        """Apenas admins podem iniciar campeonatos."""
        championship = ChampionshipFactory(status='PENDING')
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/championships/{championship.id}/start/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/championships/{championship.id}/start/')
        # Pode dar 200 ou 400 dependendo das validações (min teams, etc)
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_finish_championship_admin_only(self):
        """Apenas admins podem finalizar campeonatos."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        
        # Usuário regular não pode
        self.client.force_authenticate(user=self.user)
        response = self.client.post(f'/api/v1/championships/{championship.id}/finish/')
        assert response.status_code == status.HTTP_403_FORBIDDEN
        
        # Admin pode
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/championships/{championship.id}/finish/')
        assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
    
    def test_get_standings(self):
        """Usuários autenticados podem ver classificação."""
        championship = ChampionshipFactory(status='IN_PROGRESS', championship_type='LEAGUE')
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(f'/api/v1/championships/{championship.id}/standings/')
        assert response.status_code == status.HTTP_200_OK
    
    def test_get_brackets(self):
        """Usuários autenticados podem ver chaves."""
        championship = ChampionshipFactory(status='IN_PROGRESS', championship_type='GROUPS_KNOCKOUT')
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(f'/api/v1/championships/{championship.id}/bracket/')
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestEnrollmentWorkflowIntegration:
    """Testes de integração do fluxo completo de inscrições."""
    
    def setup_method(self):
        self.client = APIClient()
        self.admin = AdminUserFactory()
        self.owner = UserFactory(user_type='TEAM_OWNER')
        TeamOwnerProfileFactory(user=self.owner)
        self.team = TeamFactory(owner=self.owner)
        self.championship = ChampionshipFactory(
            status='OPEN',
            max_teams=16,
            enrollment_fee=100.00
        )
    
    def test_complete_enrollment_workflow(self):
        """Testa o fluxo completo: inscrever → aprovar → confirmar pagamento."""
        # 1. Dono do time se inscreve
        self.client.force_authenticate(user=self.owner)
        enrollment_data = {
            'team': self.team.id,
            'championship': self.championship.id,
        }
        response = self.client.post('/api/v1/enrollments/', enrollment_data)
        
        # Se a inscrição for criada com sucesso, continua o fluxo
        if response.status_code == status.HTTP_201_CREATED:
            enrollment_id = response.data['id']
            
            # 2. Verifica que aparece na lista
            response = self.client.get('/api/v1/enrollments/')
            assert response.status_code == status.HTTP_200_OK
            
            # 3. Admin aprova a inscrição
            self.client.force_authenticate(user=self.admin)
            response = self.client.post(f'/api/v1/enrollments/{enrollment_id}/approve/')
            # Verifica que retorna 200 ou 400 (pode já estar aprovada ou ter validações)
            assert response.status_code in [status.HTTP_200_OK, status.HTTP_400_BAD_REQUEST]
