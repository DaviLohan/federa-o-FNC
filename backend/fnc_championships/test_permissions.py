"""
Tests for championship permissions.
"""

import pytest
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from fnc_championships.permissions import (
    IsAdminOrReadOnly,
    IsEnrolledTeamOrAdmin,
    CanEnrollTeam,
    CanManageEnrollment
)
from conftest import (
    UserFactory, AdminUserFactory, TeamFactory,
    ChampionshipFactory, ChampionshipEnrollmentFactory
)


@pytest.mark.django_db
class TestIsAdminOrReadOnly:
    """Test suite for IsAdminOrReadOnly permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = IsAdminOrReadOnly()
        self.view = APIView()
    
    def test_anyone_can_read_championships(self):
        """Any authenticated user can read championship data."""
        user = UserFactory()
        championship = ChampionshipFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is True
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_admin_can_create_championships(self):
        """Admin users can create championships."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_supervisor_can_create_championships(self):
        """Supervisor users can create championships."""
        supervisor = UserFactory(user_type='SUPERVISOR')
        
        request = self.factory.post('/fake-url/')
        request.user = supervisor
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_regular_user_cannot_create_championships(self):
        """Regular users cannot create championships."""
        user = UserFactory(user_type='PLAYER')
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
    
    def test_team_owner_cannot_create_championships(self):
        """Team owners cannot create championships."""
        owner = UserFactory(user_type='TEAM_OWNER')
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is False
    
    def test_admin_can_edit_championships(self):
        """Admin users can edit championships."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        championship = ChampionshipFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_supervisor_can_edit_championships(self):
        """Supervisor users can edit championships."""
        supervisor = UserFactory(user_type='SUPERVISOR')
        championship = ChampionshipFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = supervisor
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_regular_user_cannot_edit_championships(self):
        """Regular users cannot edit championships."""
        user = UserFactory(user_type='PLAYER')
        championship = ChampionshipFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, championship) is False
    
    def test_admin_can_delete_championships(self):
        """Admin users can delete championships."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        championship = ChampionshipFactory()
        
        request = self.factory.delete('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_regular_user_cannot_delete_championships(self):
        """Regular users cannot delete championships."""
        user = UserFactory(user_type='PLAYER')
        championship = ChampionshipFactory()
        
        request = self.factory.delete('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, championship) is False


@pytest.mark.django_db
class TestIsEnrolledTeamOrAdmin:
    """Test suite for IsEnrolledTeamOrAdmin permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = IsEnrolledTeamOrAdmin()
        self.view = APIView()
    
    def test_admin_can_access_any_championship(self):
        """Admin users can access any championship data."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        championship = ChampionshipFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_supervisor_can_access_any_championship(self):
        """Supervisor users can access any championship data."""
        supervisor = UserFactory(user_type='SUPERVISOR')
        championship = ChampionshipFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = supervisor
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_enrolled_team_owner_can_access(self):
        """Team owners with enrolled teams can access championship data."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        championship = ChampionshipFactory()
        ChampionshipEnrollmentFactory(championship=championship, team=team, status='APPROVED')
        
        request = self.factory.get('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, championship) is True
    
    def test_non_enrolled_team_owner_cannot_access(self):
        """Team owners without enrolled teams cannot access championship data."""
        owner = UserFactory(user_type='TEAM_OWNER')
        TeamFactory(owner=owner)
        championship = ChampionshipFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, championship) is False
    
    def test_regular_user_without_team_cannot_access(self):
        """Regular users without teams cannot access championship data."""
        user = UserFactory(user_type='PLAYER')
        championship = ChampionshipFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, championship) is False


@pytest.mark.django_db
class TestCanEnrollTeam:
    """Test suite for CanEnrollTeam permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanEnrollTeam()
        self.view = APIView()
    
    def test_team_owner_can_enroll(self):
        """Users with teams can enroll them in championships."""
        owner = UserFactory(user_type='TEAM_OWNER')
        TeamFactory(owner=owner)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_user_without_team_cannot_enroll(self):
        """Users without teams cannot enroll."""
        user = UserFactory(user_type='PLAYER')
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
    
    def test_admin_with_team_can_enroll(self):
        """Admin users with teams can enroll them."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        TeamFactory(owner=admin)
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_permission(request, self.view) is True


@pytest.mark.django_db
class TestCanManageEnrollment:
    """Test suite for CanManageEnrollment permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanManageEnrollment()
        self.view = APIView()
    
    def test_admin_can_manage_any_enrollment(self):
        """Admin users can manage any enrollment."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        enrollment = ChampionshipEnrollmentFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, enrollment) is True
    
    def test_supervisor_can_manage_any_enrollment(self):
        """Supervisor users can manage any enrollment."""
        supervisor = UserFactory(user_type='SUPERVISOR')
        enrollment = ChampionshipEnrollmentFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = supervisor
        
        assert self.permission.has_object_permission(request, self.view, enrollment) is True
    
    def test_team_owner_can_manage_own_enrollment(self):
        """Team owners can manage their own team's enrollment."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        enrollment = ChampionshipEnrollmentFactory(team=team)
        
        request = self.factory.put('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, enrollment) is True
    
    def test_team_owner_cannot_manage_other_enrollment(self):
        """Team owners cannot manage other teams' enrollments."""
        owner1 = UserFactory(user_type='TEAM_OWNER')
        owner2 = UserFactory(user_type='TEAM_OWNER')
        team1 = TeamFactory(owner=owner1)
        team2 = TeamFactory(owner=owner2)
        enrollment = ChampionshipEnrollmentFactory(team=team2)
        
        request = self.factory.put('/fake-url/')
        request.user = owner1
        
        assert self.permission.has_object_permission(request, self.view, enrollment) is False
    
    def test_regular_user_cannot_manage_enrollments(self):
        """Regular users cannot manage enrollments."""
        user = UserFactory(user_type='PLAYER')
        enrollment = ChampionshipEnrollmentFactory()
        
        request = self.factory.put('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, enrollment) is False


@pytest.mark.django_db
class TestChampionshipPermissionsIntegration:
    """Integration tests for championship permissions working together."""
    
    def test_full_championship_workflow_permissions(self):
        """Test permissions throughout the entire championship enrollment workflow."""
        # Setup
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        supervisor = UserFactory(user_type='SUPERVISOR')
        owner1 = UserFactory(user_type='TEAM_OWNER')
        owner2 = UserFactory(user_type='TEAM_OWNER')
        player = UserFactory(user_type='PLAYER')
        
        team1 = TeamFactory(owner=owner1)
        team2 = TeamFactory(owner=owner2)
        
        championship = ChampionshipFactory()
        
        factory = APIRequestFactory()
        
        # Test 1: Only admin/supervisor can create championships
        create_perm = IsAdminOrReadOnly()
        
        request = factory.post('/fake-url/')
        request.user = admin
        assert create_perm.has_permission(request, None) is True
        
        request.user = supervisor
        assert create_perm.has_permission(request, None) is True
        
        request.user = owner1
        assert create_perm.has_permission(request, None) is False
        
        request.user = player
        assert create_perm.has_permission(request, None) is False
        
        # Test 2: Everyone can read championships
        request = factory.get('/fake-url/')
        request.user = player
        assert create_perm.has_permission(request, None) is True
        assert create_perm.has_object_permission(request, None, championship) is True
        
        # Test 3: Only team owners can enroll
        enroll_perm = CanEnrollTeam()
        
        request = factory.post('/fake-url/')
        request.user = owner1
        assert enroll_perm.has_permission(request, None) is True
        
        request.user = player
        assert enroll_perm.has_permission(request, None) is False
        
        # Test 4: Team owners manage own enrollments, admin manages all
        enrollment1 = ChampionshipEnrollmentFactory(championship=championship, team=team1)
        enrollment2 = ChampionshipEnrollmentFactory(championship=championship, team=team2)
        
        manage_perm = CanManageEnrollment()
        
        request = factory.put('/fake-url/')
        request.user = admin
        assert manage_perm.has_object_permission(request, None, enrollment1) is True
        assert manage_perm.has_object_permission(request, None, enrollment2) is True
        
        request.user = owner1
        assert manage_perm.has_object_permission(request, None, enrollment1) is True
        assert manage_perm.has_object_permission(request, None, enrollment2) is False
        
        request.user = owner2
        assert manage_perm.has_object_permission(request, None, enrollment1) is False
        assert manage_perm.has_object_permission(request, None, enrollment2) is True
        
        # Test 5: Only enrolled teams and admin can access restricted data
        enrollment1.status = 'APPROVED'
        enrollment1.save()
        
        access_perm = IsEnrolledTeamOrAdmin()
        
        request = factory.get('/fake-url/')
        request.user = admin
        assert access_perm.has_object_permission(request, None, championship) is True
        
        request.user = owner1
        assert access_perm.has_object_permission(request, None, championship) is True
        
        request.user = player
        assert access_perm.has_object_permission(request, None, championship) is False
    
    def test_only_admin_can_start_and_finish_championships(self):
        """Only admin users should be able to start and finish championships."""
        admin = UserFactory(user_type='ADMIN', is_staff=True, is_superuser=True)
        supervisor = UserFactory(user_type='SUPERVISOR')
        owner = UserFactory(user_type='TEAM_OWNER')
        championship = ChampionshipFactory()
        
        perm = IsAdminOrReadOnly()
        factory = APIRequestFactory()
        
        # Test start championship action
        request = factory.post('/fake-url/')
        request.user = admin
        assert perm.has_permission(request, None) is True
        assert perm.has_object_permission(request, None, championship) is True
        
        request.user = supervisor
        assert perm.has_permission(request, None) is True
        assert perm.has_object_permission(request, None, championship) is True
        
        request.user = owner
        assert perm.has_permission(request, None) is False
        assert perm.has_object_permission(request, None, championship) is False
