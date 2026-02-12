"""
Tests for match permissions.
"""

import pytest
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView
from fnc_matches.permissions import (
    IsMatchParticipantOrAdmin,
    CanSubmitMatchReport,
    CanManageMatchReport,
    CanContestMatch,
    CanReviewContestation
)
from conftest import (
    UserFactory, AdminUserFactory, TeamFactory,
    ChampionshipFactory, MatchFactory, FinishedMatchFactory,
    MatchReportFactory, ContestationFactory
)


@pytest.mark.django_db
class TestIsMatchParticipantOrAdmin:
    """Test suite for IsMatchParticipantOrAdmin permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = IsMatchParticipantOrAdmin()
        self.view = APIView()
    
    def test_admin_has_full_access(self):
        """Admin users should have full access to all matches."""
        admin = AdminUserFactory()
        match = MatchFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, match) is True
    
    def test_anyone_can_read_matches(self):
        """Any authenticated user can read match data."""
        user = UserFactory()
        match = MatchFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, match) is True
    
    def test_home_team_owner_can_modify(self):
        """Home team owner can modify the match."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(home_team=team)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, match) is True
    
    def test_away_team_owner_can_modify(self):
        """Away team owner can modify the match."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(away_team=team)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, match) is True
    
    def test_non_participant_cannot_modify(self):
        """Non-participant users cannot modify matches."""
        user = UserFactory(user_type='TEAM_OWNER')
        match = MatchFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_object_permission(request, self.view, match) is False


@pytest.mark.django_db
class TestCanSubmitMatchReport:
    """Test suite for CanSubmitMatchReport permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanSubmitMatchReport()
        self.view = APIView()
    
    def test_admin_can_submit_reports(self):
        """Admin users can submit match reports."""
        admin = AdminUserFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_team_owner_can_submit_reports(self):
        """Team owners can submit match reports."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_user_without_teams_cannot_submit(self):
        """Users without teams cannot submit reports."""
        user = UserFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
    
    def test_only_participants_can_edit_reports(self):
        """Only match participants can edit their reports."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(home_team=team)
        report = MatchReportFactory(match=match, reported_by=owner)
        
        request = self.factory.put('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, report) is True
    
    def test_non_participants_cannot_edit_reports(self):
        """Non-participants cannot edit match reports."""
        other_owner = UserFactory(user_type='TEAM_OWNER')
        TeamFactory(owner=other_owner)
        
        match = MatchFactory()
        report = MatchReportFactory(match=match)
        
        request = self.factory.put('/fake-url/')
        request.user = other_owner
        
        assert self.permission.has_object_permission(request, self.view, report) is False


@pytest.mark.django_db
class TestCanManageMatchReport:
    """Test suite for CanManageMatchReport permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanManageMatchReport()
        self.view = APIView()
    
    def test_admin_can_manage_reports(self):
        """Admin users can approve/reject reports."""
        admin = AdminUserFactory()
        report = MatchReportFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_permission(request, self.view) is True
        assert self.permission.has_object_permission(request, self.view, report) is True
    
    def test_regular_user_cannot_manage_reports(self):
        """Regular users cannot approve/reject reports."""
        user = UserFactory()
        report = MatchReportFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
        assert self.permission.has_object_permission(request, self.view, report) is False
    
    def test_team_owner_cannot_manage_reports(self):
        """Team owners cannot approve/reject reports (even their own)."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(home_team=team)
        report = MatchReportFactory(match=match, reported_by=owner)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is False


@pytest.mark.django_db
class TestCanContestMatch:
    """Test suite for CanContestMatch permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanContestMatch()
        self.view = APIView()
    
    def test_team_owner_can_contest(self):
        """Team owners can contest match results."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is True
    
    def test_user_without_team_cannot_contest(self):
        """Users without teams cannot contest."""
        user = UserFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
    
    def test_admin_can_view_contestations(self):
        """Admins can view all contestations."""
        admin = AdminUserFactory()
        contestation = ContestationFactory()
        
        request = self.factory.get('/fake-url/')
        request.user = admin
        
        assert self.permission.has_object_permission(request, self.view, contestation) is True
    
    def test_participants_can_view_contestations(self):
        """Match participants can view contestations."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(home_team=team)
        contestation = ContestationFactory(match=match, team=team, contested_by=owner)
        
        request = self.factory.get('/fake-url/')
        request.user = owner
        
        assert self.permission.has_object_permission(request, self.view, contestation) is True


@pytest.mark.django_db
class TestCanReviewContestation:
    """Test suite for CanReviewContestation permission."""
    
    def setup_method(self):
        self.factory = APIRequestFactory()
        self.permission = CanReviewContestation()
        self.view = APIView()
    
    def test_admin_can_review_contestations(self):
        """Admin users can review contestations."""
        admin = AdminUserFactory()
        contestation = ContestationFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = admin
        
        assert self.permission.has_permission(request, self.view) is True
        assert self.permission.has_object_permission(request, self.view, contestation) is True
    
    def test_regular_user_cannot_review(self):
        """Regular users cannot review contestations."""
        user = UserFactory()
        contestation = ContestationFactory()
        
        request = self.factory.post('/fake-url/')
        request.user = user
        
        assert self.permission.has_permission(request, self.view) is False
        assert self.permission.has_object_permission(request, self.view, contestation) is False
    
    def test_team_owner_cannot_review(self):
        """Team owners cannot review contestations (even their own)."""
        owner = UserFactory(user_type='TEAM_OWNER')
        team = TeamFactory(owner=owner)
        match = MatchFactory(home_team=team)
        contestation = ContestationFactory(match=match, team=team, contested_by=owner)
        
        request = self.factory.post('/fake-url/')
        request.user = owner
        
        assert self.permission.has_permission(request, self.view) is False


@pytest.mark.django_db
class TestPermissionsIntegration:
    """Integration tests for permissions working together."""
    
    def test_full_match_workflow_permissions(self):
        """Test permissions throughout the entire match workflow."""
        # Setup
        admin = AdminUserFactory()
        owner1 = UserFactory(user_type='TEAM_OWNER')
        owner2 = UserFactory(user_type='TEAM_OWNER')
        random_user = UserFactory()
        
        team1 = TeamFactory(owner=owner1)
        team2 = TeamFactory(owner=owner2)
        
        championship = ChampionshipFactory()
        match = FinishedMatchFactory(
            championship=championship,
            home_team=team1,
            away_team=team2
        )
        
        factory = APIRequestFactory()
        
        # Test 1: Only participants can submit report
        submit_perm = CanSubmitMatchReport()
        
        request = factory.post('/fake-url/')
        request.user = owner1
        assert submit_perm.has_permission(request, None) is True
        
        request.user = random_user
        assert submit_perm.has_permission(request, None) is False
        
        # Test 2: Only admin can approve/reject report
        manage_perm = CanManageMatchReport()
        report = MatchReportFactory(match=match, reported_by=owner1)
        
        request = factory.post('/fake-url/')
        request.user = admin
        assert manage_perm.has_permission(request, None) is True
        
        request.user = owner1
        assert manage_perm.has_permission(request, None) is False
        
        # Test 3: Only participants can contest
        contest_perm = CanContestMatch()
        
        request = factory.post('/fake-url/')
        request.user = owner2
        assert contest_perm.has_permission(request, None) is True
        
        request.user = random_user
        assert contest_perm.has_permission(request, None) is False
        
        # Test 4: Only admin can review contestation
        review_perm = CanReviewContestation()
        contestation = ContestationFactory(match=match, team=team2, contested_by=owner2)
        
        request = factory.post('/fake-url/')
        request.user = admin
        assert review_perm.has_permission(request, None) is True
        
        request.user = owner2
        assert review_perm.has_permission(request, None) is False
