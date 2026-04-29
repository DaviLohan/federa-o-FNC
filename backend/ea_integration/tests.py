from datetime import datetime, timezone as dt_timezone

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from conftest import MatchFactory, TeamFactory, UserFactory
from ea_integration.date_utils import LOCAL_TIMEZONE
from ea_integration.models import EAClub, EAMatch
from ea_integration.report_service import MatchReportEAService
from ea_integration.services import MatchSyncService


class RecordingEAClient:
    def __init__(self, matches_by_type=None):
        self.matches_by_type = matches_by_type or {}
        self.calls = []

    def get_matches(self, club_id, platform='common-gen5', match_type='leagueMatch', max_results=10):
        self.calls.append({
            'club_id': club_id,
            'platform': platform,
            'match_type': match_type,
            'max_results': max_results,
        })
        return list(self.matches_by_type.get(match_type, []))


class NoOpValidator:
    def validate(self, ea_match):
        return None


def build_raw_match(match_id: str, home_club_id: str, away_club_id: str, *, played_at: datetime, match_type: str = 'leagueMatch'):
    timestamp = int(played_at.timestamp())
    return {
        'matchId': match_id,
        'timestamp': timestamp,
        'clubs': {
            str(home_club_id): {
                'goals': '2',
                'details': {'name': f'Club {home_club_id}'},
            },
            str(away_club_id): {
                'goals': '1',
                'details': {'name': f'Club {away_club_id}'},
            },
        },
        'players': {},
        'matchType': match_type,
    }


@pytest.mark.django_db
def test_ea_match_list_filters_yesterday_by_local_date(monkeypatch):
    viewer = UserFactory()
    client = APIClient()
    client.force_authenticate(viewer)

    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='1001', platform='common-gen5', name='Home Club')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='1002', platform='common-gen5', name='Away Club')

    yesterday_local = timezone.make_aware(datetime(2026, 4, 28, 23, 30), LOCAL_TIMEZONE).astimezone(dt_timezone.utc)
    today_local = timezone.make_aware(datetime(2026, 4, 29, 12, 0), LOCAL_TIMEZONE).astimezone(dt_timezone.utc)

    EAMatch.objects.create(
        ea_match_id='ea-yesterday',
        match_type='leagueMatch',
        played_at=yesterday_local,
        home_club=home_club,
        home_club_name=home_club.name,
        home_score=2,
        away_club=away_club,
        away_club_name=away_club.name,
        away_score=1,
        raw_data={},
    )
    EAMatch.objects.create(
        ea_match_id='ea-today',
        match_type='leagueMatch',
        played_at=today_local,
        home_club=home_club,
        home_club_name=home_club.name,
        home_score=1,
        away_club=away_club,
        away_club_name=away_club.name,
        away_score=0,
        raw_data={},
    )

    fixed_now = timezone.make_aware(datetime(2026, 4, 29, 15, 0), dt_timezone.utc)
    monkeypatch.setattr('ea_integration.date_utils.timezone.now', lambda: fixed_now)

    response = client.get(reverse('ea-match-list'), {'period': 'yesterday'})

    assert response.status_code == 200
    assert [item['ea_match_id'] for item in response.json()['results']] == ['ea-yesterday']


@pytest.mark.django_db
def test_ea_match_list_filters_custom_local_date_range(monkeypatch):
    viewer = UserFactory()
    client = APIClient()
    client.force_authenticate(viewer)

    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='2001', platform='common-gen5', name='Home Club 2')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='2002', platform='common-gen5', name='Away Club 2')

    boundary_match = timezone.make_aware(datetime(2026, 4, 29, 2, 30), dt_timezone.utc)
    outside_match = timezone.make_aware(datetime(2026, 4, 30, 2, 30), dt_timezone.utc)

    EAMatch.objects.create(
        ea_match_id='ea-boundary',
        match_type='leagueMatch',
        played_at=boundary_match,
        home_club=home_club,
        home_club_name=home_club.name,
        home_score=3,
        away_club=away_club,
        away_club_name=away_club.name,
        away_score=2,
        raw_data={},
    )
    EAMatch.objects.create(
        ea_match_id='ea-outside',
        match_type='leagueMatch',
        played_at=outside_match,
        home_club=home_club,
        home_club_name=home_club.name,
        home_score=1,
        away_club=away_club,
        away_club_name=away_club.name,
        away_score=1,
        raw_data={},
    )

    response = client.get(reverse('ea-match-list'), {'date_from': '2026-04-28', 'date_to': '2026-04-28'})

    assert response.status_code == 200
    assert [item['ea_match_id'] for item in response.json()['results']] == ['ea-boundary']


@pytest.mark.django_db
def test_report_service_finds_match_played_yesterday_local_even_if_utc_today():
    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='3001', platform='common-gen5', name='Report Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='3002', platform='common-gen5', name='Report Away')

    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=timezone.make_aware(datetime(2026, 4, 28, 23, 20), LOCAL_TIMEZONE),
    )

    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    raw_match = build_raw_match('ea-report-1', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(
        client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}),
        validator=NoOpValidator(),
        sync_service=MatchSyncService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}), validator=NoOpValidator()),
    )

    preview = service.fetch_ea_report(match, home_team.owner)

    assert preview['ea_match_id_external'] == 'ea-report-1'
    assert EAMatch.objects.filter(ea_match_id='ea-report-1').exists()


@pytest.mark.django_db
def test_match_sync_service_defaults_to_league_and_friendly_match_types():
    team = TeamFactory()
    club = EAClub.objects.create(team=team, ea_club_id='4001', platform='common-gen5', name='Sync Club')
    client = RecordingEAClient({'leagueMatch': [], 'friendlyMatch': []})
    service = MatchSyncService(client=client, validator=NoOpValidator())

    result = service.sync_club(club)

    assert result['errors'] == 0
    assert [call['match_type'] for call in client.calls] == ['leagueMatch', 'friendlyMatch']
