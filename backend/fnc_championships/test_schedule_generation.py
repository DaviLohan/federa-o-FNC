from datetime import datetime, time

import pytest
from django.utils import timezone

from conftest import ChampionshipEnrollmentFactory, ChampionshipFactory, TeamFactory
from fnc_championships.services import reschedule_championship_matches
from fnc_championships.services.league_match_generator import LeagueMatchGenerator
from fnc_championships.services.schedule_utils import resolve_championship_round_datetime
from fnc_matches.models import Match


@pytest.mark.django_db
def test_league_generation_uses_championship_game_schedule():
    tz = timezone.get_current_timezone()
    championship = ChampionshipFactory(
        championship_type='LEAGUE',
        game_days=['MON', 'THU'],
        game_start_time=time(21, 10),
        game_end_time=time(21, 40),
        start_date=timezone.make_aware(datetime(2026, 4, 26, 10, 0), tz),  # domingo
        min_teams=2,
    )

    teams = [TeamFactory() for _ in range(4)]
    for team in teams:
        ChampionshipEnrollmentFactory(championship=championship, team=team, status='APPROVED')

    generator = LeagueMatchGenerator(championship)
    matches = generator.generate()

    assert matches
    first_round_dates = sorted({match.scheduled_date for match in matches if match.round_number == 1})
    second_round_dates = sorted({match.scheduled_date for match in matches if match.round_number == 2})

    assert len(first_round_dates) == 1
    assert first_round_dates[0].weekday() == 0
    assert first_round_dates[0].hour == 21
    assert first_round_dates[0].minute == 10

    assert len(second_round_dates) == 1
    assert second_round_dates[0].weekday() == 3
    assert second_round_dates[0].hour == 21
    assert second_round_dates[0].minute == 10


@pytest.mark.django_db
def test_reschedule_championship_matches_reapplies_official_schedule():
    tz = timezone.get_current_timezone()
    championship = ChampionshipFactory(
        championship_type='LEAGUE',
        game_days=['MON', 'THU'],
        game_start_time=time(21, 10),
        game_end_time=time(21, 40),
        start_date=timezone.make_aware(datetime(2026, 4, 26, 0, 0), tz),
        min_teams=2,
    )

    round_one = Match.objects.create(
        championship=championship,
        home_team=TeamFactory(),
        away_team=TeamFactory(),
        match_type='CHAMPIONSHIP',
        round_number=1,
        scheduled_date=timezone.make_aware(datetime(2026, 4, 27, 3, 0), tz),
        status='FINISHED',
    )
    round_two = Match.objects.create(
        championship=championship,
        home_team=TeamFactory(),
        away_team=TeamFactory(),
        match_type='CHAMPIONSHIP',
        round_number=2,
        scheduled_date=timezone.make_aware(datetime(2026, 4, 30, 3, 0), tz),
        status='SCHEDULED',
    )

    result = reschedule_championship_matches(championship)

    round_one.refresh_from_db()
    round_two.refresh_from_db()
    round_one_local = timezone.localtime(round_one.scheduled_date, tz)
    round_two_local = timezone.localtime(round_two.scheduled_date, tz)

    assert result['updated_count'] == 2
    assert round_one_local.weekday() == 0
    assert round_one_local.hour == 21
    assert round_one_local.minute == 10
    assert round_two_local.weekday() == 3
    assert round_two_local.hour == 21
    assert round_two_local.minute == 10
    assert round_two_local.day == 30


@pytest.mark.django_db
def test_round_dates_cycle_through_all_configured_game_days():
    tz = timezone.get_current_timezone()
    championship = ChampionshipFactory(
        championship_type='LEAGUE',
        game_days=['MON', 'TUE', 'THU'],
        game_start_time=time(21, 10),
        game_end_time=time(21, 40),
        start_date=timezone.make_aware(datetime(2026, 4, 26, 10, 0), tz),  # domingo
        min_teams=2,
    )

    round_dates = [
        timezone.localtime(resolve_championship_round_datetime(championship, round_number), tz)
        for round_number in range(1, 7)
    ]

    assert [round_date.weekday() for round_date in round_dates] == [0, 1, 3, 0, 1, 3]
    assert [round_date.day for round_date in round_dates] == [27, 28, 30, 4, 5, 7]
    assert all(round_date.hour == 21 for round_date in round_dates)
    assert all(round_date.minute == 10 for round_date in round_dates)


@pytest.mark.django_db
def test_round_dates_keep_rotation_when_start_date_already_matches_schedule():
    tz = timezone.get_current_timezone()
    championship = ChampionshipFactory(
        championship_type='LEAGUE',
        game_days=['MON', 'TUE', 'THU'],
        game_start_time=time(21, 10),
        game_end_time=time(21, 40),
        start_date=timezone.make_aware(datetime(2026, 4, 30, 10, 0), tz),  # quinta
        min_teams=2,
    )

    round_dates = [
        timezone.localtime(resolve_championship_round_datetime(championship, round_number), tz)
        for round_number in range(1, 5)
    ]

    assert [round_date.weekday() for round_date in round_dates] == [3, 0, 1, 3]
    assert [round_date.day for round_date in round_dates] == [30, 4, 5, 7]


@pytest.mark.django_db
def test_reschedule_redistributes_rounds_across_all_configured_days():
    tz = timezone.get_current_timezone()
    championship = ChampionshipFactory(
        championship_type='LEAGUE',
        game_days=['MON', 'TUE', 'THU'],
        game_start_time=time(21, 10),
        game_end_time=time(21, 40),
        start_date=timezone.make_aware(datetime(2026, 4, 23, 0, 0), tz),  # quinta
        min_teams=2,
    )

    round_one = Match.objects.create(
        championship=championship,
        home_team=TeamFactory(),
        away_team=TeamFactory(),
        match_type='CHAMPIONSHIP',
        round_number=1,
        scheduled_date=timezone.make_aware(datetime(2026, 4, 23, 21, 10), tz),
        status='FINISHED',
    )
    round_two = Match.objects.create(
        championship=championship,
        home_team=TeamFactory(),
        away_team=TeamFactory(),
        match_type='CHAMPIONSHIP',
        round_number=2,
        scheduled_date=timezone.make_aware(datetime(2026, 4, 30, 21, 10), tz),
        status='SCHEDULED',
    )
    round_three = Match.objects.create(
        championship=championship,
        home_team=TeamFactory(),
        away_team=TeamFactory(),
        match_type='CHAMPIONSHIP',
        round_number=3,
        scheduled_date=timezone.make_aware(datetime(2026, 5, 7, 21, 10), tz),
        status='SCHEDULED',
    )

    result = reschedule_championship_matches(championship)

    round_one.refresh_from_db()
    round_two.refresh_from_db()
    round_three.refresh_from_db()

    round_one_local = timezone.localtime(round_one.scheduled_date, tz)
    round_two_local = timezone.localtime(round_two.scheduled_date, tz)
    round_three_local = timezone.localtime(round_three.scheduled_date, tz)

    assert result['updated_count'] == 3
    assert (round_one_local.weekday(), round_one_local.day) == (3, 23)
    assert (round_two_local.weekday(), round_two_local.day) == (0, 27)
    assert (round_three_local.weekday(), round_three_local.day) == (1, 28)
    assert all(round_date.hour == 21 for round_date in [round_one_local, round_two_local, round_three_local])
    assert all(round_date.minute == 10 for round_date in [round_one_local, round_two_local, round_three_local])
