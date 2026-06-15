from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.db.models import Q

from fnc_championships.models import Championship
from fnc_matches.models import Match
from player_stats.models import TeamPlayerPerformance
from player_stats.team_performance_sync import TeamPerformanceSyncService
from users.models import PlayerProfile


FORMATION = '3-5-2'

POSITION_GROUPS = {
    'GK': {'GK'},
    'DEF': {'CB', 'RB', 'LB', 'RWB', 'LWB', 'DEF', 'SW'},
    'MID': {'CDM', 'CM', 'CAM', 'LM', 'RM', 'MID', 'LWB', 'RWB'},
    'ATT': {'ST', 'CF', 'RW', 'LW', 'ATT', 'FWD'},
}

SLOT_COUNTS = {
    'GK': 1,
    'DEF': 3,
    'MID': 5,
    'ATT': 2,
}


@dataclass
class WeeklyCandidate:
    key: str
    player_id: int | None
    player_name: str
    team_id: int
    team_name: str
    team_logo: str | None
    position: str
    normalized_group: str
    average_rating: float
    goals: int
    assists: int
    cards: int
    saves: int
    clean_sheet_bonus: int
    win_bonus: int
    mvp_bonus: int
    matches_played: int
    has_advanced_data: bool

    @property
    def score(self) -> float:
        return (
            self.average_rating * 100
            + self.goals * 12
            + self.assists * 8
            + self.mvp_bonus * 6
            + self.clean_sheet_bonus * 5
            + self.win_bonus * 4
            - self.cards * 2
        )


class WeeklySelectionService:
    @classmethod
    def get_weekly_selection(cls, *, championship_id: int, round_number: int | None = None) -> dict[str, Any]:
        championship = Championship.objects.get(id=championship_id)
        rounds = cls._get_available_rounds(championship_id)
        if not rounds:
            return cls._empty_payload(championship, round_number)

        selected_round = round_number if round_number in rounds else rounds[-1]
        matches = cls._get_round_matches(championship_id, selected_round)
        if not matches:
            return cls._empty_payload(championship, selected_round, rounds)

        cls._ensure_snapshots(matches)
        player_rows = list(
            TeamPlayerPerformance.objects.filter(match__in=matches)
            .select_related('player', 'team', 'match', 'team_performance_match')
        )
        if not player_rows:
            return cls._empty_payload(championship, selected_round, rounds)

        candidates = cls._aggregate_candidates(player_rows)
        lineup = cls._build_lineup(candidates)
        selected_players = [player for group in ('GK', 'DEF', 'MID', 'ATT') for player in lineup[group]]
        if len(selected_players) < 11:
            return cls._empty_payload(championship, selected_round, rounds)

        mvp = max(selected_players, key=lambda item: (item['score'], item['average_rating'], item['goals'], item['assists']))
        mvp['is_mvp'] = True

        return {
            'championship': {
                'id': championship.id,
                'name': championship.name,
                'logo': championship.logo.url if championship.logo else None,
            },
            'round_number': selected_round,
            'available_rounds': rounds,
            'formation': FORMATION,
            'mvp': mvp,
            'lineup': lineup,
            'players': selected_players,
            'meta': {
                'matches_analyzed': len(matches),
                'players_considered': len(candidates),
            },
        }

    @classmethod
    def _empty_payload(cls, championship: Championship, round_number: int | None, available_rounds: list[int] | None = None) -> dict[str, Any]:
        return {
            'championship': {
                'id': championship.id,
                'name': championship.name,
                'logo': championship.logo.url if championship.logo else None,
            },
            'round_number': round_number,
            'available_rounds': available_rounds or [],
            'formation': FORMATION,
            'mvp': None,
            'lineup': {'GK': [], 'DEF': [], 'MID': [], 'ATT': []},
            'players': [],
            'meta': {'matches_analyzed': 0, 'players_considered': 0},
        }

    @classmethod
    def _get_available_rounds(cls, championship_id: int) -> list[int]:
        return list(
            Match.objects.filter(championship_id=championship_id, status=Match.Status.FINISHED)
            .exclude(round_number__isnull=True)
            .values_list('round_number', flat=True)
            .distinct()
            .order_by('round_number')
        )

    @classmethod
    def _get_round_matches(cls, championship_id: int, round_number: int) -> list[Match]:
        return list(
            Match.objects.filter(
                championship_id=championship_id,
                round_number=round_number,
                status=Match.Status.FINISHED,
            )
            .select_related('home_team', 'away_team', 'championship')
            .order_by('scheduled_date', 'id')
        )

    @classmethod
    def _ensure_snapshots(cls, matches: list[Match]) -> None:
        for match in matches:
            TeamPerformanceSyncService.sync_match(match)

    @classmethod
    def _aggregate_candidates(cls, player_rows: list[TeamPlayerPerformance]) -> list[WeeklyCandidate]:
        aggregated: dict[str, dict[str, Any]] = {}

        for row in player_rows:
            player_name = (row.player_name_snapshot or '').strip() or (row.player.player_name if row.player else 'Jogador')
            key = f'player:{row.player_id}' if row.player_id else f'name:{player_name.lower()}:{row.team_id}'
            position = cls._normalize_position(row.position or (row.player.primary_position if row.player else ''))
            group = cls._group_for_position(position)
            team_snapshot = row.team_performance_match

            item = aggregated.setdefault(
                key,
                {
                    'player_id': row.player_id,
                    'player_name': player_name,
                    'team_id': row.team_id,
                    'team_name': row.team.name,
                    'team_logo': row.team.logo.url if row.team.logo else None,
                    'position_counts': {},
                    'rating_total': Decimal('0'),
                    'rating_count': 0,
                    'goals': 0,
                    'assists': 0,
                    'cards': 0,
                    'saves': 0,
                    'matches_played': 0,
                    'clean_sheet_bonus': 0,
                    'win_bonus': 0,
                    'mvp_bonus': 0,
                    'has_advanced_data': False,
                    'normalized_group': group,
                },
            )

            item['position_counts'][position] = item['position_counts'].get(position, 0) + 1
            if row.rating is not None:
                item['rating_total'] += row.rating
                item['rating_count'] += 1
            item['goals'] += row.goals
            item['assists'] += row.assists
            item['cards'] += row.cards
            item['saves'] += row.saves
            item['matches_played'] += row.matches_played
            item['has_advanced_data'] = item['has_advanced_data'] or row.has_advanced_data
            if team_snapshot.clean_sheet and group in {'GK', 'DEF'}:
                item['clean_sheet_bonus'] += 1
            if team_snapshot.result == 'W':
                item['win_bonus'] += 1
            if row.rating is not None and float(row.rating) >= 8.5:
                item['mvp_bonus'] += 1

        candidates: list[WeeklyCandidate] = []
        for key, item in aggregated.items():
            position = max(item['position_counts'].items(), key=lambda pair: pair[1])[0]
            average_rating = float(item['rating_total'] / item['rating_count']) if item['rating_count'] else 0.0
            group = cls._group_for_position(position)
            candidates.append(
                WeeklyCandidate(
                    key=key,
                    player_id=item['player_id'],
                    player_name=item['player_name'],
                    team_id=item['team_id'],
                    team_name=item['team_name'],
                    team_logo=item['team_logo'],
                    position=position,
                    normalized_group=group,
                    average_rating=round(average_rating, 2),
                    goals=item['goals'],
                    assists=item['assists'],
                    cards=item['cards'],
                    saves=item['saves'],
                    clean_sheet_bonus=item['clean_sheet_bonus'],
                    win_bonus=item['win_bonus'],
                    mvp_bonus=item['mvp_bonus'],
                    matches_played=item['matches_played'],
                    has_advanced_data=item['has_advanced_data'],
                )
            )

        candidates.sort(key=lambda c: (-c.score, -c.average_rating, -c.goals, -c.assists, c.player_name.lower()))
        return candidates

    @classmethod
    def _build_lineup(cls, candidates: list[WeeklyCandidate]) -> dict[str, list[dict[str, Any]]]:
        lineup: dict[str, list[dict[str, Any]]] = {'GK': [], 'DEF': [], 'MID': [], 'ATT': []}
        used_keys: set[str] = set()

        for group in ('GK', 'DEF', 'MID', 'ATT'):
            for candidate in candidates:
                if candidate.key in used_keys or candidate.normalized_group != group:
                    continue
                if len(lineup[group]) >= SLOT_COUNTS[group]:
                    break
                lineup[group].append(cls._serialize_candidate(candidate))
                used_keys.add(candidate.key)

        # Fallback: se faltar alguém em algum setor, preencher com os melhores remanescentes.
        remaining = [candidate for candidate in candidates if candidate.key not in used_keys]
        for group in ('GK', 'DEF', 'MID', 'ATT'):
            while len(lineup[group]) < SLOT_COUNTS[group] and remaining:
                candidate = remaining.pop(0)
                lineup[group].append(cls._serialize_candidate(candidate))
                used_keys.add(candidate.key)

        return lineup

    @staticmethod
    def _serialize_candidate(candidate: WeeklyCandidate) -> dict[str, Any]:
        return {
            'player_id': candidate.player_id,
            'player_name': candidate.player_name,
            'team_id': candidate.team_id,
            'team_name': candidate.team_name,
            'team_logo': candidate.team_logo,
            'position': candidate.position,
            'group': candidate.normalized_group,
            'average_rating': candidate.average_rating,
            'goals': candidate.goals,
            'assists': candidate.assists,
            'cards': candidate.cards,
            'saves': candidate.saves,
            'matches_played': candidate.matches_played,
            'has_advanced_data': candidate.has_advanced_data,
            'score': round(candidate.score, 2),
            'is_mvp': False,
        }

    @staticmethod
    def _normalize_position(position: str) -> str:
        value = (position or '').strip().upper()
        return value or 'MID'

    @staticmethod
    def _group_for_position(position: str) -> str:
        for group, positions in POSITION_GROUPS.items():
            if position in positions:
                return group
        return 'MID'
