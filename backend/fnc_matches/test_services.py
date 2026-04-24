"""
Tests for match services, focusing on result reversal logic.
"""

import pytest
from django.utils import timezone
from datetime import timedelta
from fnc_matches.services import (
    reverse_match_result,
    recompute_standings_for_championship,
    update_player_statistics,
    update_team_statistics,
    update_standings,
    update_top_scorers
)
from fnc_matches.models import Match, Goal, Assist, Card, MatchReport
from player_stats.models import PlayerStatistics, TeamStatistics, TopScorer
from fnc_championships.models import Standings
from conftest import (
    UserFactory, AdminUserFactory, PlayerProfileFactory, TeamFactory,
    ChampionshipFactory, MatchFactory, FinishedMatchFactory, TeamMembershipFactory,
    GoalFactory, AssistFactory, CardFactory, StandingsFactory
)


@pytest.mark.django_db
class TestReverseMatchResult:
    """Test suite for reverse_match_result function."""
    
    def test_cannot_reverse_friendly_match(self):
        """Friendly matches (without championship) cannot be reversed."""
        match = FinishedMatchFactory(championship=None, match_type='FRIENDLY')
        admin = AdminUserFactory()
        
        result = reverse_match_result(match, admin)
        
        assert result['success'] is False
        assert 'campeonato' in result['message'].lower()
    
    def test_can_only_reverse_contested_match(self):
        """Only matches with CONTESTED status can be reversed."""
        match = FinishedMatchFactory(status='FINISHED')
        admin = AdminUserFactory()
        
        result = reverse_match_result(match, admin)
        
        assert result['success'] is False
        assert 'CONTESTED' in result['message']
    
    def test_successful_reversal_resets_match_status(self):
        """Successful reversal should reset match to SCHEDULED status."""
        championship = ChampionshipFactory()
        match = FinishedMatchFactory(
            championship=championship,
            status='CONTESTED',
            home_score=3,
            away_score=1
        )
        admin = AdminUserFactory()
        
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        match.refresh_from_db()
        assert match.status == 'SCHEDULED'
        assert match.home_score == 0
        assert match.away_score == 0
        assert match.finished_at is None
    
    def test_reversal_removes_match_report(self):
        """Reversal should delete the match report if it exists."""
        championship = ChampionshipFactory()
        match = FinishedMatchFactory(championship=championship, status='CONTESTED')
        admin = AdminUserFactory()
        
        # Create a match report
        from conftest import MatchReportFactory
        report = MatchReportFactory(match=match)
        report_id = report.id
        
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        assert not MatchReport.objects.filter(id=report_id).exists()
    
    def test_reversal_decrements_player_statistics(self):
        """Reversal should correctly decrement player statistics."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        # Create players and add them to teams
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=2,
            away_score=0
        )
        
        # Create goals and assists for home player
        goal1 = GoalFactory(match=match, scorer=home_player, team=home_team)
        goal2 = GoalFactory(match=match, scorer=home_player, team=home_team)
        AssistFactory(goal=goal1, assistant=home_player)
        
        # Update statistics
        update_player_statistics(match)
        
        # Verify stats before reversal
        stats = PlayerStatistics.objects.get(
            player=home_player,
            championship=championship,
            team=home_team
        )
        assert stats.matches_played == 1
        assert stats.matches_won == 1
        assert stats.goals == 2
        assert stats.assists == 1
        
        # Reverse the match
        match.status = 'CONTESTED'
        match.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        
        # Verify stats after reversal
        stats.refresh_from_db()
        assert stats.matches_played == 0
        assert stats.matches_won == 0
        assert stats.goals == 0
        assert stats.assists == 0
    
    def test_reversal_handles_cards_correctly(self):
        """Reversal should correctly decrement yellow and red cards."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=1,
            away_score=0
        )
        
        # Create cards
        CardFactory(match=match, player=home_player, team=home_team, card_type='YELLOW')
        CardFactory(match=match, player=home_player, team=home_team, card_type='RED')
        
        # Update statistics
        update_player_statistics(match)
        
        # Verify stats before reversal
        stats = PlayerStatistics.objects.get(
            player=home_player,
            championship=championship,
            team=home_team
        )
        assert stats.yellow_cards == 1
        assert stats.red_cards == 1
        
        # Reverse the match
        match.status = 'CONTESTED'
        match.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        
        # Verify cards are decremented
        stats.refresh_from_db()
        assert stats.yellow_cards == 0
        assert stats.red_cards == 0
    
    def test_reversal_updates_standings_correctly(self):
        """Reversal should correctly update championship standings."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=3,
            away_score=1
        )
        
        # Update standings
        update_standings(match)
        
        # Verify standings before reversal
        home_standing = Standings.objects.get(team=home_team, championship=championship)
        away_standing = Standings.objects.get(team=away_team, championship=championship)
        
        assert home_standing.matches_played == 1
        assert home_standing.wins == 1
        assert home_standing.points == 3
        assert home_standing.goals_for == 3
        assert home_standing.goals_against == 1
        
        assert away_standing.matches_played == 1
        assert away_standing.losses == 1
        assert away_standing.points == 0
        assert away_standing.goals_for == 1
        assert away_standing.goals_against == 3
        
        # Reverse the match
        match.status = 'CONTESTED'
        match.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        
        # Verify standings after reversal
        home_standing.refresh_from_db()
        away_standing.refresh_from_db()
        
        assert home_standing.matches_played == 0
        assert home_standing.wins == 0
        assert home_standing.points == 0
        assert home_standing.goals_for == 0
        assert home_standing.goals_against == 0
        
        assert away_standing.matches_played == 0
        assert away_standing.losses == 0
        assert away_standing.points == 0
        assert away_standing.goals_for == 0
        assert away_standing.goals_against == 0
    
    def test_reversal_with_draw_result(self):
        """Reversal should correctly handle draw results."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        away_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        TeamMembershipFactory(team=away_team, player=away_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=2,
            away_score=2
        )
        
        # Update statistics and standings
        update_player_statistics(match)
        update_standings(match)
        
        # Verify standings show draw
        home_standing = Standings.objects.get(team=home_team, championship=championship)
        away_standing = Standings.objects.get(team=away_team, championship=championship)
        
        assert home_standing.draws == 1
        assert home_standing.points == 1
        assert away_standing.draws == 1
        assert away_standing.points == 1
        
        # Verify player stats show draw
        home_stats = PlayerStatistics.objects.get(
            player=home_player,
            championship=championship,
            team=home_team
        )
        assert home_stats.matches_drawn == 1
        
        # Reverse the match
        match.status = 'CONTESTED'
        match.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        
        # Verify draw is reversed
        home_standing.refresh_from_db()
        away_standing.refresh_from_db()
        home_stats.refresh_from_db()
        
        assert home_standing.draws == 0
        assert home_standing.points == 0
        assert away_standing.draws == 0
        assert away_standing.points == 0
        assert home_stats.matches_drawn == 0
    
    def test_reversal_recalculates_top_scorers(self):
        """Reversal should recalculate top scorers ranking."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        # Create first match with goals
        match1 = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=3,
            away_score=0
        )
        GoalFactory(match=match1, scorer=home_player, team=home_team)
        GoalFactory(match=match1, scorer=home_player, team=home_team)
        GoalFactory(match=match1, scorer=home_player, team=home_team)
        
        update_player_statistics(match1)
        update_top_scorers(match1)
        
        # Verify top scorer
        top_scorer = TopScorer.objects.get(player=home_player, championship=championship)
        assert top_scorer.goals == 3
        assert top_scorer.position == 1
        
        # Create second match with more goals
        match2 = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED',
            home_score=2,
            away_score=0
        )
        GoalFactory(match=match2, scorer=home_player, team=home_team)
        GoalFactory(match=match2, scorer=home_player, team=home_team)
        
        update_player_statistics(match2)
        update_top_scorers(match2)
        
        # Verify updated top scorer
        top_scorer.refresh_from_db()
        assert top_scorer.goals == 5
        
        # Reverse the second match
        match2.status = 'CONTESTED'
        match2.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match2, admin)
        
        assert result['success'] is True
        
        # Verify top scorer is recalculated back to 3 goals
        top_scorer.refresh_from_db()
        assert top_scorer.goals == 3
    
    def test_defensive_stat_decrements_dont_go_negative(self):
        """Ensure stat decrements never result in negative values."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            status='FINISHED'
        )
        
        # Create stats with initial low values
        stats = PlayerStatistics.objects.create(
            player=home_player,
            championship=championship,
            team=home_team,
            matches_played=1,
            goals=1,
            assists=0
        )
        
        # Create a goal in the match
        GoalFactory(match=match, scorer=home_player, team=home_team)
        
        # Reverse the match
        match.status = 'CONTESTED'
        match.save()
        admin = AdminUserFactory()
        result = reverse_match_result(match, admin)
        
        assert result['success'] is True
        
        # Verify stats don't go negative
        stats.refresh_from_db()
        assert stats.matches_played >= 0
        assert stats.goals >= 0
        assert stats.assists >= 0


@pytest.mark.django_db
class TestUpdatePlayerStatistics:
    """Test suite for update_player_statistics function."""
    
    def test_creates_new_statistics_for_player(self):
        """Should create new statistics record for player's first match."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            home_score=1,
            away_score=0
        )
        
        update_player_statistics(match)
        
        # Should create statistics for the player
        assert PlayerStatistics.objects.filter(
            player=home_player,
            championship=championship,
            team=home_team
        ).exists()
    
    def test_increments_matches_played(self):
        """Should increment matches_played counter."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()
        
        home_player = PlayerProfileFactory()
        TeamMembershipFactory(team=home_team, player=home_player)
        
        match = FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team
        )
        
        update_player_statistics(match)
        
        stats = PlayerStatistics.objects.get(
            player=home_player,
            championship=championship,
            team=home_team
        )
        assert stats.matches_played == 1


@pytest.mark.django_db
class TestUpdateStandings:
    """Test suite for update_standings function."""
    
    def test_creates_standings_for_new_teams(self):
        """Should create standings records for teams in their first match."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        match = FinishedMatchFactory(
            championship=championship,
            home_score=2,
            away_score=1
        )
        
        update_standings(match)
        
        # Should create standings for both teams
        assert Standings.objects.filter(
            championship=championship,
            team=match.home_team
        ).exists()
        assert Standings.objects.filter(
            championship=championship,
            team=match.away_team
        ).exists()
    
    def test_winner_gets_3_points(self):
        """Winner should receive 3 points."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        match = FinishedMatchFactory(
            championship=championship,
            home_score=3,
            away_score=1
        )
        
        update_standings(match)
        
        winner_standing = Standings.objects.get(
            championship=championship,
            team=match.home_team
        )
        assert winner_standing.points == 3
        assert winner_standing.wins == 1
    
    def test_loser_gets_0_points(self):
        """Loser should receive 0 points."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        match = FinishedMatchFactory(
            championship=championship,
            home_score=1,
            away_score=3
        )
        
        update_standings(match)
        
        loser_standing = Standings.objects.get(
            championship=championship,
            team=match.home_team
        )
        assert loser_standing.points == 0
        assert loser_standing.losses == 1
    
    def test_draw_gives_1_point_each(self):
        """Both teams should get 1 point in a draw."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        match = FinishedMatchFactory(
            championship=championship,
            home_score=2,
            away_score=2
        )
        
        update_standings(match)
        
        home_standing = Standings.objects.get(
            championship=championship,
            team=match.home_team
        )
        away_standing = Standings.objects.get(
            championship=championship,
            team=match.away_team
        )
        
        assert home_standing.points == 1
        assert home_standing.draws == 1
        assert away_standing.points == 1
        assert away_standing.draws == 1

    def test_recompute_standings_resets_stale_values_from_finished_matches(self):
        """Recompute must rebuild the table from finished matches instead of accumulating stale values."""
        championship = ChampionshipFactory(status='IN_PROGRESS')
        home_team = TeamFactory()
        away_team = TeamFactory()

        FinishedMatchFactory(
            championship=championship,
            home_team=home_team,
            away_team=away_team,
            home_score=4,
            away_score=1,
        )

        StandingsFactory(
            championship=championship,
            team=home_team,
            matches_played=9,
            wins=9,
            draws=0,
            losses=0,
            goals_for=27,
            goals_against=3,
            points=27,
        )

        recompute_standings_for_championship(championship)

        home_standing = Standings.objects.get(championship=championship, team=home_team)
        away_standing = Standings.objects.get(championship=championship, team=away_team)
        assert home_standing.matches_played == 1
        assert home_standing.wins == 1
        assert home_standing.points == 3
        assert home_standing.goals_for == 4
        assert home_standing.goals_against == 1
        assert away_standing.matches_played == 1
        assert away_standing.losses == 1
        assert away_standing.points == 0
