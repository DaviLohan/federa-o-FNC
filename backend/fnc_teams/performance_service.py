from __future__ import annotations

from collections import Counter
from typing import Any

from django.db.models import Q
from django.utils.dateparse import parse_date

from fnc_matches.models import Match
from player_stats.models import TeamPerformanceMatch, TeamPlayerPerformance
from player_stats.team_performance_sync import TeamPerformanceSyncService


class TeamPerformanceService:
    """Consulta analytics persistidos de desempenho do time."""

    @classmethod
    def get_team_performance(
        cls,
        team,
        *,
        championship_id: str | None = None,
        context: str | None = None,
        date_from: str | None = None,
        date_to: str | None = None,
    ) -> dict[str, Any]:
        matches = cls._get_filtered_matches(
            team.id,
            championship_id=championship_id,
            context=context,
            date_from=date_from,
            date_to=date_to,
        )

        if not matches:
            return {
                'summary': cls._empty_summary(team.id),
                'leaders': {},
                'players': [],
                'matches': [],
                'filters': {'championships': []},
            }

        cls._ensure_snapshots(team, matches)

        match_ids = [match.id for match in matches]
        snapshots = list(
            TeamPerformanceMatch.objects.filter(team=team, match_id__in=match_ids)
            .select_related('opponent_team', 'championship', 'match')
            .order_by('-played_at')
        )
        player_snapshots = list(
            TeamPlayerPerformance.objects.filter(team=team, match_id__in=match_ids)
            .select_related('player', 'championship', 'match')
        )

        summary = cls._build_summary(team.id, snapshots)
        players = cls._build_players(player_snapshots)
        leaders = cls._build_leaders(players)
        recent_matches = cls._build_recent_matches(snapshots)

        championships = {}
        for snapshot in snapshots:
            if snapshot.championship_id:
                championships[snapshot.championship_id] = {
                    'id': snapshot.championship_id,
                    'name': snapshot.championship.name,
                }

        return {
            'summary': summary,
            'leaders': leaders,
            'players': players,
            'matches': recent_matches,
            'filters': {'championships': list(championships.values())},
        }

    @classmethod
    def _get_filtered_matches(cls, team_id, *, championship_id=None, context=None, date_from=None, date_to=None):
        filters = Q(status='FINISHED') & (Q(home_team_id=team_id) | Q(away_team_id=team_id))

        if championship_id:
            filters &= Q(championship_id=championship_id)
        if context == 'championship':
            filters &= Q(championship__isnull=False)
        elif context == 'friendly':
            filters &= Q(championship__isnull=True)

        parsed_from = parse_date(date_from) if date_from else None
        parsed_to = parse_date(date_to) if date_to else None
        if parsed_from:
            filters &= Q(scheduled_date__date__gte=parsed_from)
        if parsed_to:
            filters &= Q(scheduled_date__date__lte=parsed_to)

        return list(
            Match.objects.filter(filters)
            .select_related('home_team', 'away_team', 'championship')
            .order_by('-scheduled_date')
        )

    @classmethod
    def _ensure_snapshots(cls, team, matches):
        existing_ids = set(
            TeamPerformanceMatch.objects.filter(team=team, match_id__in=[match.id for match in matches]).values_list('match_id', flat=True)
        )
        missing_matches = [match for match in matches if match.id not in existing_ids]
        if missing_matches:
            TeamPerformanceSyncService.sync_matches_for_team(team, missing_matches)

    @classmethod
    def _build_summary(cls, team_id, snapshots):
        summary = cls._empty_summary(team_id)
        rating_total = 0.0

        for snapshot in snapshots:
            summary['matches'] += 1
            summary['goals_scored'] += snapshot.goals_scored
            summary['goals_conceded'] += snapshot.goals_conceded
            summary['clean_sheets'] += 1 if snapshot.clean_sheet else 0

            if snapshot.result == 'W':
                summary['wins'] += 1
            elif snapshot.result == 'D':
                summary['draws'] += 1
            else:
                summary['losses'] += 1

            if snapshot.has_advanced_data:
                summary['advanced_matches'] += 1
                rating_total += float(snapshot.average_rating or 0)
                summary['passes_made'] += snapshot.passes_made
                summary['pass_attempts'] += snapshot.pass_attempts
                summary['tackles_made'] += snapshot.tackles_made
                summary['tackle_attempts'] += snapshot.tackle_attempts
                summary['saves'] += snapshot.saves
            else:
                summary['basic_matches'] += 1

        summary['goal_difference'] = summary['goals_scored'] - summary['goals_conceded']
        summary['win_rate'] = round((summary['wins'] / summary['matches']) * 100, 1) if summary['matches'] else 0
        summary['avg_team_rating'] = round(rating_total / summary['advanced_matches'], 2) if summary['advanced_matches'] else None
        summary['pass_accuracy'] = cls._safe_percentage(summary['passes_made'], summary['pass_attempts'])
        summary['tackle_accuracy'] = cls._safe_percentage(summary['tackles_made'], summary['tackle_attempts'])
        return summary

    @classmethod
    def _build_players(cls, player_snapshots):
        rows: dict[str, dict[str, Any]] = {}

        for stat in player_snapshots:
            key = f'player:{stat.player_id}' if stat.player_id else f'name:{stat.player_name_snapshot.lower().strip()}'
            row = rows.setdefault(
                key,
                {
                    'player_id': stat.player_id,
                    'player_name': stat.player_name_snapshot,
                    'position': stat.position or '—',
                    'matches_played': 0,
                    'advanced_matches': 0,
                    'basic_matches': 0,
                    'rating_total': 0.0,
                    'rating_count': 0,
                    'goals': 0,
                    'assists': 0,
                    'passes_made': 0,
                    'pass_attempts': 0,
                    'tackles_made': 0,
                    'tackle_attempts': 0,
                    'saves': 0,
                    'cards': 0,
                    'has_advanced_data': False,
                    'positions': Counter(),
                },
            )

            row['matches_played'] += stat.matches_played
            row['goals'] += stat.goals
            row['assists'] += stat.assists
            row['passes_made'] += stat.passes_made
            row['pass_attempts'] += stat.pass_attempts
            row['tackles_made'] += stat.tackles_made
            row['tackle_attempts'] += stat.tackle_attempts
            row['saves'] += stat.saves
            row['cards'] += stat.cards
            row['positions'][stat.position or row['position'] or '—'] += 1

            if stat.has_advanced_data:
                row['advanced_matches'] += 1
                row['has_advanced_data'] = True
                if stat.rating is not None:
                    row['rating_total'] += float(stat.rating)
                    row['rating_count'] += 1
            else:
                row['basic_matches'] += 1

        players = []
        for row in rows.values():
            position = row['positions'].most_common(1)[0][0] if row['positions'] else row['position']
            average_rating = round(row['rating_total'] / row['rating_count'], 2) if row['rating_count'] else None
            players.append({
                'player_id': row['player_id'],
                'player_name': row['player_name'],
                'position': position,
                'matches_played': row['matches_played'],
                'advanced_matches': row['advanced_matches'],
                'basic_matches': row['basic_matches'],
                'average_rating': average_rating,
                'goals': row['goals'],
                'assists': row['assists'],
                'goal_contributions': row['goals'] + row['assists'],
                'passes_made': row['passes_made'],
                'passes_missed': max(row['pass_attempts'] - row['passes_made'], 0),
                'pass_accuracy': cls._safe_percentage(row['passes_made'], row['pass_attempts']),
                'tackles_made': row['tackles_made'],
                'tackles_missed': max(row['tackle_attempts'] - row['tackles_made'], 0),
                'tackle_accuracy': cls._safe_percentage(row['tackles_made'], row['tackle_attempts']),
                'saves': row['saves'],
                'cards': row['cards'],
                'has_advanced_data': row['has_advanced_data'],
            })

        players.sort(
            key=lambda item: (
                -(item['average_rating'] or 0),
                -item['goal_contributions'],
                -item['matches_played'],
                item['player_name'].lower(),
            )
        )
        return players

    @classmethod
    def _build_leaders(cls, players):
        if not players:
            return {}

        def top_by(predicate, condition=None):
            candidates = [player for player in players if condition(player)] if condition else players
            if not candidates:
                return None
            return max(candidates, key=predicate)

        return {
            'best_rating': top_by(lambda p: p['average_rating'] or 0, lambda p: p['average_rating'] is not None),
            'top_scorer': top_by(lambda p: p['goals']),
            'top_assister': top_by(lambda p: p['assists']),
            'best_passer': top_by(lambda p: p['pass_accuracy'] or -1, lambda p: p['pass_accuracy'] is not None),
            'best_tackler': top_by(lambda p: p['tackle_accuracy'] or -1, lambda p: p['tackle_accuracy'] is not None),
            'most_matches': top_by(lambda p: p['matches_played']),
        }

    @classmethod
    def _build_recent_matches(cls, snapshots):
        rows = []
        for snapshot in snapshots[:8]:
            rows.append({
                'match_id': snapshot.match_id,
                'played_at': snapshot.played_at,
                'opponent': {
                    'id': snapshot.opponent_team_id,
                    'name': snapshot.opponent_name,
                    'abbreviation': snapshot.opponent_team.abbreviation if snapshot.opponent_team else '',
                    'logo': snapshot.opponent_team.logo.url if snapshot.opponent_team and getattr(snapshot.opponent_team, 'logo', None) else None,
                },
                'championship': (
                    {'id': snapshot.championship_id, 'name': snapshot.championship.name}
                    if snapshot.championship_id
                    else None
                ),
                'context': snapshot.context,
                'result': snapshot.result,
                'goals_scored': snapshot.goals_scored,
                'goals_conceded': snapshot.goals_conceded,
                'clean_sheet': snapshot.clean_sheet,
                'has_advanced_data': snapshot.has_advanced_data,
                'advanced_players': snapshot.advanced_players,
                'lineup_players': snapshot.lineup_players,
                'average_rating': float(snapshot.average_rating) if snapshot.average_rating is not None else None,
                'passes_made': snapshot.passes_made,
                'pass_attempts': snapshot.pass_attempts,
                'pass_accuracy': cls._safe_percentage(snapshot.passes_made, snapshot.pass_attempts),
                'tackles_made': snapshot.tackles_made,
                'tackle_attempts': snapshot.tackle_attempts,
                'tackle_accuracy': cls._safe_percentage(snapshot.tackles_made, snapshot.tackle_attempts),
                'saves': snapshot.saves,
            })
        return rows

    @staticmethod
    def _safe_percentage(made, attempts):
        if not attempts:
            return None
        return round((made / attempts) * 100, 1)

    @staticmethod
    def _empty_summary(team_id):
        return {
            'team_id': team_id,
            'matches': 0,
            'wins': 0,
            'draws': 0,
            'losses': 0,
            'goals_scored': 0,
            'goals_conceded': 0,
            'goal_difference': 0,
            'win_rate': 0,
            'clean_sheets': 0,
            'advanced_matches': 0,
            'basic_matches': 0,
            'avg_team_rating': None,
            'passes_made': 0,
            'pass_attempts': 0,
            'pass_accuracy': None,
            'tackles_made': 0,
            'tackle_attempts': 0,
            'tackle_accuracy': None,
            'saves': 0,
        }
