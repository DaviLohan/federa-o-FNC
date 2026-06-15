from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from fnc_championships.models import Championship
from fnc_matches.models import Match, MatchReport
from fnc_teams.models import Team, TeamMembership
from users.models import PlayerProfile

from player_stats.models import PlayerTierState, RankingCycle, TeamPerformanceMatch, TeamPlayerPerformance, TierPromotionAudit
from player_stats.ranking_service import CompetitiveRankingService


User = get_user_model()


class CompetitiveRankingServiceTestCase(TestCase):
    def _make_user(self, email: str, user_type: str = 'TEAM_OWNER'):
        return User.objects.create_user(email=email, password='123456', user_type=user_type, is_active=True)

    def _make_team(self, owner, suffix: str):
        return Team.objects.create(owner=owner, name=f'Team {suffix}', abbreviation=f'T{suffix[:2].upper()}', is_active=True)

    def _make_player(self, idx: int):
        user = self._make_user(f'player{idx}@fnc.com', user_type='PLAYER')
        return PlayerProfile.objects.create(user=user, player_name=f'Player {idx}', gamer_tag=f'p{idx}')

    def _make_finished_match_with_snapshot(self, *, cycle, team, player, rating, goals, assists, match_index=1):
        championship = Championship.objects.create(
            name=f'Champ {match_index}',
            description='x',
            rules='x',
            championship_type='LEAGUE',
            status='IN_PROGRESS',
            enrollment_start=timezone.now() - timedelta(days=10),
            enrollment_end=timezone.now() + timedelta(days=10),
            start_date=timezone.now() - timedelta(days=1),
            end_date=timezone.now() + timedelta(days=20),
            created_by=self._make_user(f'admin{match_index}@fnc.com', user_type='ADMIN'),
        )
        opponent_owner = self._make_user(f'op{match_index}@fnc.com')
        opponent = self._make_team(opponent_owner, f'OP{match_index}')
        match = Match.objects.create(
            home_team=team,
            away_team=opponent,
            championship=championship,
            match_type='CHAMPIONSHIP',
            round_number=1,
            scheduled_date=cycle.starts_at + timedelta(days=match_index),
            status='FINISHED',
            home_score=2,
            away_score=1,
            started_at=timezone.now() - timedelta(hours=2),
            finished_at=timezone.now() - timedelta(hours=1),
        )
        MatchReport.objects.create(match=match, reported_by=team.owner, screenshot='match_reports/test.png', status='APPROVED')
        team_snapshot = TeamPerformanceMatch.objects.create(
            team=team,
            match=match,
            championship=championship,
            context='championship',
            is_home=True,
            played_at=match.scheduled_date,
            opponent_team=opponent,
            opponent_name=opponent.name,
            goals_scored=2,
            goals_conceded=1,
            result='W',
            clean_sheet=False,
        )
        TeamPlayerPerformance.objects.create(
            team=team,
            match=match,
            team_performance_match=team_snapshot,
            championship=championship,
            player=player,
            player_name_snapshot=player.player_name,
            matches_played=3,
            rating=Decimal(str(rating)),
            goals=goals,
            assists=assists,
        )

    def test_get_or_create_current_cycle_uses_month_slug(self):
        cycle = CompetitiveRankingService.get_or_create_current_cycle()
        expected_slug = timezone.localtime(timezone.now()).strftime('%Y-%m')
        self.assertEqual(cycle.slug, expected_slug)
        self.assertEqual(cycle.status, RankingCycle.Status.OPEN)

    def test_apply_promotions_is_idempotent_without_players(self):
        cycle = CompetitiveRankingService.get_or_create_current_cycle()
        result_1 = CompetitiveRankingService.apply_tier_promotions(cycle)
        cycle.refresh_from_db()
        result_2 = CompetitiveRankingService.apply_tier_promotions(cycle)
        self.assertEqual(result_1['promotions'], 0)
        self.assertEqual(result_2['promotions'], 0)
        self.assertEqual(cycle.status, RankingCycle.Status.CLOSED)

    def test_calculate_player_ranking_ignores_invalid_matches(self):
        cycle = CompetitiveRankingService.get_or_create_current_cycle()
        owner = self._make_user('owner@fnc.com')
        team = self._make_team(owner, 'A')
        player = self._make_player(1)
        TeamMembership.objects.create(team=team, player=player, role='PLAYER', is_active=True)

        self._make_finished_match_with_snapshot(cycle=cycle, team=team, player=player, rating=8.0, goals=2, assists=1, match_index=1)

        championship = Championship.objects.create(
            name='Invalid Champ', description='x', rules='x', championship_type='LEAGUE', status='OPEN',
            enrollment_start=timezone.now() - timedelta(days=10),
            enrollment_end=timezone.now() + timedelta(days=10),
            start_date=timezone.now(), end_date=timezone.now() + timedelta(days=10),
            created_by=self._make_user('admin-invalid@fnc.com', user_type='ADMIN'),
        )
        invalid_match = Match.objects.create(
            home_team=team,
            away_team=self._make_team(self._make_user('other@fnc.com'), 'B'),
            championship=championship,
            match_type='CHAMPIONSHIP',
            round_number=1,
            scheduled_date=cycle.starts_at + timedelta(days=2),
            status='SCHEDULED',
        )
        invalid_snapshot = TeamPerformanceMatch.objects.create(
            team=team, match=invalid_match, championship=championship, context='championship', is_home=True,
            played_at=invalid_match.scheduled_date, opponent_name='Other', goals_scored=0, goals_conceded=0, result='D', clean_sheet=True,
        )
        TeamPlayerPerformance.objects.create(
            team=team,
            match=invalid_match,
            team_performance_match=invalid_snapshot,
            championship=championship,
            player=player,
            player_name_snapshot=player.player_name,
            matches_played=8,
            rating=Decimal('10.0'),
            goals=7,
            assists=7,
        )

        CompetitiveRankingService.calculate_player_ranking(cycle)
        state = PlayerTierState.objects.get(cycle=cycle, player=player)
        self.assertEqual(state.matches_played, 3)
        self.assertEqual(state.goals, 2)
        self.assertEqual(state.assists, 1)

    def test_apply_tier_promotions_creates_audit_and_is_idempotent(self):
        cycle = CompetitiveRankingService.get_or_create_current_cycle()
        owner = self._make_user('owner2@fnc.com')
        team = self._make_team(owner, 'C')

        players = []
        for idx in range(6):
            player = self._make_player(10 + idx)
            TeamMembership.objects.create(team=team, player=player, role='PLAYER', is_active=True)
            self._make_finished_match_with_snapshot(
                cycle=cycle,
                team=team,
                player=player,
                rating=9 - (idx * 0.2),
                goals=max(0, 5 - idx),
                assists=max(0, 3 - idx),
                match_index=10 + idx,
            )
            players.append(player)

        CompetitiveRankingService.calculate_player_ranking(cycle)
        PlayerTierState.objects.filter(cycle=cycle).update(tier=PlayerTierState.Tier.BRONZE)

        first = CompetitiveRankingService.apply_tier_promotions(cycle)
        second = CompetitiveRankingService.apply_tier_promotions(cycle)

        self.assertEqual(first['promotions'], 5)
        self.assertEqual(second['promotions'], 0)
        self.assertEqual(TierPromotionAudit.objects.filter(cycle=cycle).count(), 5)

    def test_resolve_display_cycle_falls_back_to_previous_with_data(self):
        current = CompetitiveRankingService.get_or_create_current_cycle()
        previous_start = (current.starts_at - timedelta(days=1)).replace(day=1)
        previous = RankingCycle.objects.create(
            slug=previous_start.strftime('%Y-%m'),
            starts_at=previous_start,
            ends_at=current.starts_at,
            status=RankingCycle.Status.CLOSED,
        )

        owner = self._make_user('fb-owner@fnc.com')
        team = self._make_team(owner, 'FB')
        player = self._make_player(99)
        PlayerTierState.objects.create(
            cycle=previous,
            player=player,
            team=team,
            tier=PlayerTierState.Tier.BRONZE,
            score=Decimal('10.00'),
            average_rating=Decimal('7.00'),
            goals=1,
            assists=1,
            matches_played=3,
            tier_position=1,
            general_position=1,
            promotion_eligible=True,
        )

        cycle, fallback = CompetitiveRankingService.resolve_display_cycle()
        self.assertEqual(cycle.id, previous.id)
        self.assertTrue(fallback)
