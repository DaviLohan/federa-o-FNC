"""Serviços para geração e classificação da fase de grupos."""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Iterable

from django.db import transaction

from fnc_matches.models import Match

from ..models import Championship, ChampionshipEnrollment, Group, GroupStandings
from .schedule_utils import resolve_championship_round_datetime


@dataclass(frozen=True)
class GroupStageInitResult:
    groups_created: int
    standings_created: int
    matches_created: int
    rounds_created: int


def _build_round_robin_schedule(teams: list, *, round_trip: bool) -> list[list[tuple]]:
    entries = teams.copy()
    if len(entries) % 2 != 0:
        entries.append(None)

    total = len(entries)
    rounds: list[list[tuple]] = []

    for round_idx in range(total - 1):
        pairings: list[tuple] = []
        for i in range(total // 2):
            left = entries[i]
            right = entries[total - 1 - i]
            if left is None or right is None:
                continue
            if round_idx % 2 == 0:
                pairings.append((left, right))
            else:
                pairings.append((right, left))
        rounds.append(pairings)
        entries = [entries[0]] + [entries[-1]] + entries[1:-1]

    if round_trip:
        mirrored = [[(away, home) for home, away in round_matches] for round_matches in rounds]
        rounds.extend(mirrored)

    return rounds


def _iter_group_names(num_groups: int) -> Iterable[str]:
    for index in range(num_groups):
        yield f'Grupo {chr(65 + index)}'


def _get_group_teams(group: Group):
    return [standing.team for standing in group.standings.select_related('team').order_by('team__id')]


def _build_expected_match_counts(groups: list[Group], *, round_trip: bool) -> dict[tuple[int, int], int]:
    expected: dict[tuple[int, int], int] = defaultdict(int)
    for group in groups:
        teams = _get_group_teams(group)
        rounds = _build_round_robin_schedule(teams, round_trip=round_trip)
        for pairings in rounds:
            for home_team, away_team in pairings:
                expected[(home_team.id, away_team.id)] += 1
    return expected


def _validate_existing_group_stage_matches(
    championship: Championship,
    groups: list[Group],
    *,
    round_trip: bool,
) -> dict[tuple[int, int], int]:
    expected_counts = _build_expected_match_counts(groups, round_trip=round_trip)
    actual_counts: dict[tuple[int, int], int] = defaultdict(int)

    for match in Match.objects.filter(championship=championship).only('id', 'home_team_id', 'away_team_id'):
        key = (match.home_team_id, match.away_team_id)
        if key not in expected_counts:
            raise ValueError(
                'O campeonato já possui partidas fora da grade prevista da fase de grupos. Corrija antes de continuar.'
            )
        actual_counts[key] += 1
        if actual_counts[key] > expected_counts[key]:
            raise ValueError(
                'O campeonato já possui partidas duplicadas na fase de grupos. Corrija antes de continuar.'
            )

    return actual_counts


@transaction.atomic
def initialize_group_stage(championship: Championship, *, days_between_rounds: int = 7) -> GroupStageInitResult:
    if championship.championship_type != Championship.Type.GROUPS_KNOCKOUT:
        raise ValueError('Este serviço é apenas para campeonatos Grupos + Mata-Mata.')

    num_groups = championship.num_groups or 0
    teams_per_group = championship.teams_per_group or 0
    if not num_groups or not teams_per_group:
        raise ValueError('Configuração de grupos incompleta para o campeonato.')

    enrollments = list(
        ChampionshipEnrollment.objects.filter(
            championship=championship,
            status=ChampionshipEnrollment.Status.APPROVED,
        ).select_related('team').order_by('approved_at', 'id')
    )

    expected_total = num_groups * teams_per_group
    if len(enrollments) != expected_total:
        raise ValueError(
            f'Fase de grupos requer exatamente {expected_total} times aprovados. Atualmente: {len(enrollments)}.'
        )

    existing_groups = list(Group.objects.filter(championship=championship).order_by('order'))
    existing_matches = Match.objects.filter(championship=championship)
    if existing_matches.exists() and not existing_groups:
        raise ValueError('O campeonato já possui partidas, mas não possui grupos configurados.')

    groups_created = 0
    standings_created = 0

    if not existing_groups:
        for order, name in enumerate(_iter_group_names(num_groups), start=1):
            Group.objects.create(championship=championship, name=name, order=order)
            groups_created += 1
        existing_groups = list(Group.objects.filter(championship=championship).order_by('order'))

        for index, enrollment in enumerate(enrollments):
            group = existing_groups[index // teams_per_group]
            _, created = GroupStandings.objects.get_or_create(group=group, team=enrollment.team)
            if created:
                standings_created += 1
    else:
        for group in existing_groups:
            team_count = group.standings.count()
            if team_count != teams_per_group:
                raise ValueError(
                    f'{group.name} possui {team_count} times vinculados, esperado {teams_per_group}. Corrija antes de gerar partidas.'
                )

    round_trip = championship.group_stage_format == Championship.GroupStageFormat.ROUND_TRIP
    existing_counts = _validate_existing_group_stage_matches(
        championship,
        existing_groups,
        round_trip=round_trip,
    )
    matches_created = 0
    rounds_created = 0
    max_round = 0

    for group in existing_groups:
        teams = _get_group_teams(group)
        rounds = _build_round_robin_schedule(teams, round_trip=round_trip)
        rounds_created = max(rounds_created, len(rounds))
        for round_offset, pairings in enumerate(rounds, start=1):
            max_round = max(max_round, round_offset)
            round_date = resolve_championship_round_datetime(
                championship,
                round_offset,
                start_date=championship.start_date,
                days_between_rounds=days_between_rounds,
            )
            for home_team, away_team in pairings:
                key = (home_team.id, away_team.id)
                if existing_counts.get(key, 0) >= 1:
                    continue
                Match.objects.create(
                    championship=championship,
                    home_team=home_team,
                    away_team=away_team,
                    match_type='CHAMPIONSHIP',
                    round_number=round_offset,
                    scheduled_date=round_date,
                    status=Match.Status.SCHEDULED,
                )
                existing_counts[key] = existing_counts.get(key, 0) + 1
                matches_created += 1

    return GroupStageInitResult(
        groups_created=groups_created,
        standings_created=standings_created,
        matches_created=matches_created,
        rounds_created=max_round,
    )


@transaction.atomic
def recompute_group_standings_for_championship(championship: Championship) -> None:
    if not championship or championship.championship_type != Championship.Type.GROUPS_KNOCKOUT:
        return

    standings = list(
        GroupStandings.objects.filter(group__championship=championship).select_related('group', 'team')
    )
    if not standings:
        return

    by_group_team: dict[tuple[int, int], GroupStandings] = {
        (standing.group_id, standing.team_id): standing for standing in standings
    }
    groups_by_team: dict[int, int] = {standing.team_id: standing.group_id for standing in standings}

    for standing in standings:
        standing.matches_played = 0
        standing.wins = 0
        standing.draws = 0
        standing.losses = 0
        standing.goals_for = 0
        standing.goals_against = 0
        standing.points = 0
        standing.position = None
        standing.qualified = False

    finished_matches = Match.objects.filter(
        championship=championship,
        status=Match.Status.FINISHED,
    ).order_by('finished_at', 'id')

    for match in finished_matches:
        home_group = groups_by_team.get(match.home_team_id)
        away_group = groups_by_team.get(match.away_team_id)
        if not home_group or home_group != away_group:
            continue

        home = by_group_team[(home_group, match.home_team_id)]
        away = by_group_team[(away_group, match.away_team_id)]

        home.matches_played += 1
        away.matches_played += 1
        home.goals_for += match.home_score
        home.goals_against += match.away_score
        away.goals_for += match.away_score
        away.goals_against += match.home_score

        if match.home_score > match.away_score:
            home.wins += 1
            home.points += 3
            away.losses += 1
        elif match.home_score < match.away_score:
            away.wins += 1
            away.points += 3
            home.losses += 1
        else:
            home.draws += 1
            away.draws += 1
            home.points += 1
            away.points += 1

    qualified_limit = championship.qualified_per_group or 2
    grouped = defaultdict(list)
    for standing in standings:
        grouped[standing.group_id].append(standing)

    updated: list[GroupStandings] = []
    for group_id, rows in grouped.items():
        rows.sort(
            key=lambda item: (
                -item.points,
                -(item.goals_for - item.goals_against),
                -item.goals_for,
                item.team.name.lower(),
            )
        )
        for idx, standing in enumerate(rows, start=1):
            standing.position = idx
            standing.qualified = idx <= qualified_limit
            updated.append(standing)

    GroupStandings.objects.bulk_update(
        updated,
        [
            'matches_played', 'wins', 'draws', 'losses', 'goals_for',
            'goals_against', 'points', 'position', 'qualified', 'updated_at',
        ]
    )
