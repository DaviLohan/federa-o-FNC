from __future__ import annotations

from collections import Counter, defaultdict

from django.db import transaction

from ea_integration.models import EAMatch, EAPlayerMatchStats
from fnc_matches.models import Assist, Card, Goal, Match, MatchLineup, MatchLineupPlayer
from fnc_teams.models import Team
from users.models import PlayerProfile

from .models import TeamPerformanceMatch, TeamPlayerPerformance


class TeamPerformanceSyncService:
    """Sincroniza snapshots persistidos de desempenho por partida."""

    @classmethod
    def sync_match(cls, match: Match) -> None:
        if match.status != Match.Status.FINISHED:
            return

        cls.sync_team_for_match(match.home_team, match)
        cls.sync_team_for_match(match.away_team, match)

    @classmethod
    def sync_team_for_match(cls, team: Team, match: Match) -> TeamPerformanceMatch:
        advanced_stats = cls._get_advanced_stats_for_team(match, team)
        lineup_players = cls._get_lineup_players(match, team)
        roster_map = cls._get_roster_map(team, lineup_players)
        goals, assists, cards = cls._get_event_counters(match, team)

        snapshot_data = cls._build_match_snapshot(team, match, advanced_stats, lineup_players)

        with transaction.atomic():
            team_snapshot, _ = TeamPerformanceMatch.objects.update_or_create(
                team=team,
                match=match,
                defaults=snapshot_data,
            )

            TeamPlayerPerformance.objects.filter(team=team, match=match).delete()

            if advanced_stats:
                player_rows = [
                    cls._build_advanced_player_row(team_snapshot, match, team, stat, roster_map)
                    for stat in advanced_stats
                ]
            else:
                player_rows = cls._build_basic_player_rows(
                    team_snapshot,
                    match,
                    lineup_players,
                    goals,
                    assists,
                    cards,
                )

            TeamPlayerPerformance.objects.bulk_create(player_rows)

        return team_snapshot

    @classmethod
    def sync_matches_for_team(cls, team: Team, matches) -> None:
        for match in matches:
            cls.sync_team_for_match(team, match)

    @classmethod
    def _get_advanced_stats_for_team(cls, match: Match, team: Team):
        ea_match = EAMatch.objects.filter(linked_match=match).select_related('home_club', 'away_club').first()
        if not ea_match:
            return []

        if ea_match.home_club.team_id == team.id:
            ea_club_id = ea_match.home_club_id
        elif ea_match.away_club.team_id == team.id:
            ea_club_id = ea_match.away_club_id
        else:
            return []

        return list(
            EAPlayerMatchStats.objects.filter(ea_match=ea_match, ea_club_id=ea_club_id).order_by('-rating', 'player_name')
        )

    @classmethod
    def _get_lineup_players(cls, match: Match, team: Team):
        lineup = MatchLineup.objects.filter(match=match, team=team).prefetch_related(
            'players', 'players__player', 'players__player__user'
        ).first()
        return list(lineup.players.all()) if lineup else []

    @classmethod
    def _get_roster_map(cls, team: Team, lineup_players):
        roster = {}
        for item in lineup_players:
            gamer_tag = (item.player.gamer_tag or '').strip().lower()
            if gamer_tag:
                roster[gamer_tag] = item.player

        memberships = PlayerProfile.objects.filter(
            teammembership__team=team,
            teammembership__is_active=True,
        )
        for player in memberships:
            gamer_tag = (player.gamer_tag or '').strip().lower()
            if gamer_tag and gamer_tag not in roster:
                roster[gamer_tag] = player

        return roster

    @classmethod
    def _get_event_counters(cls, match: Match, team: Team):
        goals = Counter()
        assists = Counter()
        cards = Counter()

        for goal in Goal.objects.filter(match=match, team=team).select_related('assist__assistant'):
            if goal.goal_type != Goal.GoalType.OWN_GOAL and goal.scorer_id:
                goals[goal.scorer_id] += 1
            if hasattr(goal, 'assist') and goal.assist and goal.assist.assistant_id:
                assists[goal.assist.assistant_id] += 1

        for card in Card.objects.filter(match=match, team=team):
            if card.player_id:
                cards[card.player_id] += 1

        return goals, assists, cards

    @classmethod
    def _build_match_snapshot(cls, team: Team, match: Match, advanced_stats, lineup_players):
        is_home = match.home_team_id == team.id
        opponent = match.away_team if is_home else match.home_team
        goals_scored = match.home_score if is_home else match.away_score
        goals_conceded = match.away_score if is_home else match.home_score

        result = 'D'
        if goals_scored > goals_conceded:
            result = 'W'
        elif goals_scored < goals_conceded:
            result = 'L'

        if advanced_stats:
            ratings = [float(stat.rating or 0) for stat in advanced_stats]
            average_rating = round(sum(ratings) / len(ratings), 2) if ratings else None
            passes_made = sum(stat.passes_made for stat in advanced_stats)
            pass_attempts = sum(stat.pass_attempts for stat in advanced_stats)
            tackles_made = sum(stat.tackles_made for stat in advanced_stats)
            tackle_attempts = sum(stat.tackle_attempts for stat in advanced_stats)
            saves = sum(stat.saves for stat in advanced_stats)
        else:
            average_rating = None
            passes_made = pass_attempts = tackles_made = tackle_attempts = saves = 0

        return {
            'championship': match.championship,
            'context': TeamPerformanceMatch.Context.CHAMPIONSHIP if match.championship_id else TeamPerformanceMatch.Context.FRIENDLY,
            'is_home': is_home,
            'played_at': match.scheduled_date,
            'opponent_team': opponent,
            'opponent_name': opponent.name,
            'goals_scored': goals_scored,
            'goals_conceded': goals_conceded,
            'result': result,
            'clean_sheet': goals_conceded == 0,
            'has_advanced_data': bool(advanced_stats),
            'advanced_players': len(advanced_stats),
            'lineup_players': len(lineup_players),
            'average_rating': average_rating,
            'passes_made': passes_made,
            'pass_attempts': pass_attempts,
            'tackles_made': tackles_made,
            'tackle_attempts': tackle_attempts,
            'saves': saves,
        }

    @classmethod
    def _build_advanced_player_row(cls, team_snapshot: TeamPerformanceMatch, match: Match, team: Team, stat: EAPlayerMatchStats, roster_map):
        matched_player = roster_map.get((stat.player_name or '').strip().lower())
        return TeamPlayerPerformance(
            team=team,
            match=match,
            team_performance_match=team_snapshot,
            championship=match.championship,
            player=matched_player,
            player_name_snapshot=stat.player_name,
            position=stat.position,
            has_advanced_data=True,
            matches_played=1,
            rating=stat.rating,
            goals=stat.goals,
            assists=stat.assists,
            passes_made=stat.passes_made,
            pass_attempts=stat.pass_attempts,
            shots=stat.shots,
            tackles_made=stat.tackles_made,
            tackle_attempts=stat.tackle_attempts,
            saves=stat.saves,
            seconds_played=stat.seconds_played,
            cards=stat.red_cards,
        )

    @classmethod
    def _build_basic_player_rows(cls, team_snapshot: TeamPerformanceMatch, match: Match, lineup_players, goals, assists, cards):
        rows = []
        lineup_player_ids = {item.player_id for item in lineup_players}
        relevant_ids = lineup_player_ids | set(goals.keys()) | set(assists.keys()) | set(cards.keys())
        players_by_id = {item.player_id: item for item in lineup_players}
        fallback_players = {
            player.id: player
            for player in PlayerProfile.objects.filter(id__in=relevant_ids - lineup_player_ids)
        }

        for player_id in relevant_ids:
            lineup_player = players_by_id.get(player_id)
            player = lineup_player.player if lineup_player else fallback_players.get(player_id)
            if not player:
                continue
            position = lineup_player.position if lineup_player else player.primary_position
            rows.append(
                TeamPlayerPerformance(
                    team=team_snapshot.team,
                    match=match,
                    team_performance_match=team_snapshot,
                    championship=match.championship,
                    player=player,
                    player_name_snapshot=player.player_name or player.gamer_tag,
                    position=position or '',
                    has_advanced_data=False,
                    matches_played=1,
                    goals=goals.get(player_id, 0),
                    assists=assists.get(player_id, 0),
                    cards=cards.get(player_id, 0),
                )
            )

        return rows
