from datetime import timedelta

import pytest
from django.utils import timezone

from conftest import ChampionshipEnrollmentFactory, GroupsKnockoutChampionshipFactory, GroupFactory, GroupStandingsFactory, MatchFactory, TeamFactory
from fnc_championships.models import Group, GroupStandings
from fnc_championships.services.group_stage_service import initialize_group_stage, recompute_group_standings_for_championship
from fnc_matches.models import Match


@pytest.mark.django_db
def test_initialize_group_stage_generates_single_round_matches():
    championship = GroupsKnockoutChampionshipFactory(
        num_groups=2,
        teams_per_group=2,
        max_teams=4,
        min_teams=4,
        start_date=timezone.now(),
        group_stage_format='SINGLE_ROUND',
    )
    teams = TeamFactory.create_batch(4)
    for team in teams:
        ChampionshipEnrollmentFactory(championship=championship, team=team)

    result = initialize_group_stage(championship, days_between_rounds=7)

    assert result.groups_created == 2
    assert result.standings_created == 4
    assert result.matches_created == 2
    assert result.rounds_created == 1
    assert Group.objects.filter(championship=championship).count() == 2
    assert Match.objects.filter(championship=championship).count() == 2


@pytest.mark.django_db
def test_initialize_group_stage_round_trip_is_idempotent():
    championship = GroupsKnockoutChampionshipFactory(
        num_groups=2,
        teams_per_group=2,
        max_teams=4,
        min_teams=4,
        start_date=timezone.now(),
        group_stage_format='ROUND_TRIP',
    )
    teams = TeamFactory.create_batch(4)
    for team in teams:
        ChampionshipEnrollmentFactory(championship=championship, team=team)

    first = initialize_group_stage(championship, days_between_rounds=7)
    second = initialize_group_stage(championship, days_between_rounds=7)

    assert first.matches_created == 4
    assert first.rounds_created == 2
    assert second.groups_created == 0
    assert second.standings_created == 0
    assert second.matches_created == 0
    assert Match.objects.filter(championship=championship).count() == 4


@pytest.mark.django_db
def test_recompute_group_standings_counts_both_legs():
    championship = GroupsKnockoutChampionshipFactory(
        num_groups=2,
        teams_per_group=2,
        max_teams=4,
        min_teams=4,
        start_date=timezone.now(),
        group_stage_format='ROUND_TRIP',
    )
    group_a = GroupFactory(championship=championship, name='Grupo A', order=1)
    group_b = GroupFactory(championship=championship, name='Grupo B', order=2)

    team_a = TeamFactory(name='Alpha')
    team_b = TeamFactory(name='Beta')
    team_c = TeamFactory(name='Gamma')
    team_d = TeamFactory(name='Delta')

    standing_a = GroupStandingsFactory(group=group_a, team=team_a)
    standing_b = GroupStandingsFactory(group=group_a, team=team_b)
    GroupStandingsFactory(group=group_b, team=team_c)
    GroupStandingsFactory(group=group_b, team=team_d)

    MatchFactory(
        championship=championship,
        home_team=team_a,
        away_team=team_b,
        round_number=1,
        scheduled_date=timezone.now() - timedelta(days=7),
        status=Match.Status.FINISHED,
        home_score=2,
        away_score=0,
        started_at=timezone.now() - timedelta(days=7, hours=1),
        finished_at=timezone.now() - timedelta(days=7),
    )
    MatchFactory(
        championship=championship,
        home_team=team_b,
        away_team=team_a,
        round_number=2,
        scheduled_date=timezone.now() - timedelta(days=1),
        status=Match.Status.FINISHED,
        home_score=1,
        away_score=0,
        started_at=timezone.now() - timedelta(days=1, hours=1),
        finished_at=timezone.now() - timedelta(days=1),
    )

    recompute_group_standings_for_championship(championship)

    standing_a.refresh_from_db()
    standing_b.refresh_from_db()

    assert standing_a.matches_played == 2
    assert standing_a.wins == 1
    assert standing_a.losses == 1
    assert standing_a.draws == 0
    assert standing_a.goals_for == 2
    assert standing_a.goals_against == 1
    assert standing_a.points == 3

    assert standing_b.matches_played == 2
    assert standing_b.wins == 1
    assert standing_b.losses == 1
    assert standing_b.goals_for == 1
    assert standing_b.goals_against == 2
    assert standing_b.points == 3


@pytest.mark.django_db
def test_initialize_group_stage_blocks_unexpected_existing_pairing():
    championship = GroupsKnockoutChampionshipFactory(
        num_groups=2,
        teams_per_group=2,
        max_teams=4,
        min_teams=4,
        start_date=timezone.now(),
        group_stage_format='SINGLE_ROUND',
    )
    teams = TeamFactory.create_batch(4)
    for team in teams:
        ChampionshipEnrollmentFactory(championship=championship, team=team)

    group_a = GroupFactory(championship=championship, name='Grupo A', order=1)
    group_b = GroupFactory(championship=championship, name='Grupo B', order=2)
    GroupStandingsFactory(group=group_a, team=teams[0])
    GroupStandingsFactory(group=group_a, team=teams[1])
    GroupStandingsFactory(group=group_b, team=teams[2])
    GroupStandingsFactory(group=group_b, team=teams[3])

    MatchFactory(
        championship=championship,
        home_team=teams[0],
        away_team=teams[2],
        round_number=1,
        scheduled_date=timezone.now(),
        status=Match.Status.SCHEDULED,
    )

    with pytest.raises(ValueError, match='fora da grade prevista'):
        initialize_group_stage(championship, days_between_rounds=7)
