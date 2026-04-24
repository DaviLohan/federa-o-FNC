from datetime import datetime, time

import pytest
from django.utils import timezone

from conftest import ChampionshipEnrollmentFactory, ChampionshipFactory, TeamFactory
from fnc_championships.services.league_match_generator import LeagueMatchGenerator


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
