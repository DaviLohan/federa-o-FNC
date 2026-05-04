from datetime import datetime, timezone as dt_timezone

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from conftest import MatchFactory, TeamFactory, UserFactory
from ea_integration.date_utils import LOCAL_TIMEZONE
from ea_integration.models import EAClub, EAMatch
from ea_integration.report_service import MatchReportEAError, MatchReportEAService
from ea_integration.services import MatchSyncService
from fnc_matches.models import Goal, MatchReport


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


@pytest.mark.django_db
def test_confirm_report_blocks_critical_irregularities_without_explicit_confirmation():
    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='5001', platform='common-gen5', name='Critical Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='5002', platform='common-gen5', name='Critical Away')
    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=played_at,
    )
    raw_match = build_raw_match('ea-report-critical', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(
        client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}),
        validator=NoOpValidator(),
        sync_service=MatchSyncService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}), validator=NoOpValidator()),
    )

    preview = service.fetch_ea_report(match, home_team.owner)
    ea_match = EAMatch.objects.get(pk=preview['ea_match_id'])
    ea_match.validation_notes = [{'severity': 'error', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}]
    ea_match.save(update_fields=['validation_notes'])

    with pytest.raises(Exception, match='irregularidades detectadas'):
        service.confirm_report(match, ea_match.pk, home_team.owner)


@pytest.mark.django_db
def test_confirm_irregular_result_preserves_match_data_and_flags_confirmation():
    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='6001', platform='common-gen5', name='Preserve Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='6002', platform='common-gen5', name='Preserve Away')
    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=played_at,
    )
    raw_match = build_raw_match('ea-report-preserve', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(
        client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}),
        validator=NoOpValidator(),
        sync_service=MatchSyncService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}), validator=NoOpValidator()),
    )

    preview = service.fetch_ea_report(match, away_team.owner)
    ea_match = EAMatch.objects.get(pk=preview['ea_match_id'])
    ea_match.validation_notes = [{'severity': 'critical', 'detail': 'Gamertag irregular', 'type': 'gamertag_mismatch'}]
    ea_match.save(update_fields=['validation_notes'])

    updated_match = service.confirm_report(
        match,
        ea_match.pk,
        away_team.owner,
        allow_irregular_confirmation=True,
        decision_reason='Adversário aceitou manter o resultado apesar da irregularidade.',
    )

    updated_match.refresh_from_db()
    assert updated_match.status == 'FINISHED'
    assert updated_match.irregularity_flag is True
    assert updated_match.match_result_confirmed is True
    assert updated_match.confirmed_by_team == away_team
    assert updated_match.admin_override is False
    assert updated_match.decision_reason == 'Adversário aceitou manter o resultado apesar da irregularidade.'
    assert Goal.objects.filter(match=updated_match).count() >= 0
    assert MatchReport.objects.filter(match=updated_match).exists()


@pytest.mark.django_db
def test_preview_with_irregularities_does_not_create_auto_contestation():
    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='7001', platform='common-gen5', name='Preview Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='7002', platform='common-gen5', name='Preview Away')
    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=played_at,
    )
    raw_match = build_raw_match('ea-report-no-auto-contest', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}))

    preview = service.fetch_ea_report(match, home_team.owner)

    match.refresh_from_db()
    assert preview['has_irregularity'] is True
    assert preview['can_confirm'] is False
    assert preview['can_confirm_with_irregularity'] is True
    assert match.contestations.count() == 0
    assert match.status == 'IN_PROGRESS'


@pytest.mark.django_db
def test_only_winner_can_confirm_result():
    home_team = TeamFactory()
    away_team = TeamFactory()
    home_club = EAClub.objects.create(team=home_team, ea_club_id='8001', platform='common-gen5', name='Winner Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='8002', platform='common-gen5', name='Loser Away')
    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=played_at,
    )
    raw_match = build_raw_match('ea-report-winner-only', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(
        client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}),
        validator=NoOpValidator(),
        sync_service=MatchSyncService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}), validator=NoOpValidator()),
    )

    preview = service.fetch_ea_report(match, home_team.owner)

    with pytest.raises(MatchReportEAError, match='Apenas o dono do time vencedor'):
        service.confirm_report(match, preview['ea_match_id'], away_team.owner)


@pytest.mark.django_db
def test_winner_with_supervisor_access_can_confirm_irregular_without_confirmed_team_id():
    winner_owner = UserFactory(user_type='SUPERVISOR')
    loser_owner = UserFactory(user_type='TEAM_OWNER')
    home_team = TeamFactory(owner=winner_owner)
    away_team = TeamFactory(owner=loser_owner)
    home_club = EAClub.objects.create(team=home_team, ea_club_id='8301', platform='common-gen5', name='Supervisor Winner Home')
    away_club = EAClub.objects.create(team=away_team, ea_club_id='8302', platform='common-gen5', name='Supervisor Winner Away')
    played_at = datetime(2026, 4, 29, 2, 30, tzinfo=dt_timezone.utc)
    match = MatchFactory(
        home_team=home_team,
        away_team=away_team,
        status='IN_PROGRESS',
        scheduled_date=played_at,
    )
    raw_match = build_raw_match('ea-report-supervisor-winner', home_club.ea_club_id, away_club.ea_club_id, played_at=played_at)
    service = MatchReportEAService(
        client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}),
        validator=NoOpValidator(),
        sync_service=MatchSyncService(client=RecordingEAClient({'leagueMatch': [raw_match], 'friendlyMatch': []}), validator=NoOpValidator()),
    )

    preview = service.fetch_ea_report(match, winner_owner)
    ea_match = EAMatch.objects.get(pk=preview['ea_match_id'])
    ea_match.validation_notes = [{'severity': 'critical', 'detail': 'Jogador irregular', 'type': 'player_not_in_roster'}]
    ea_match.save(update_fields=['validation_notes'])

    updated_match = service.confirm_report(
        match,
        ea_match.pk,
        winner_owner,
        allow_irregular_confirmation=True,
        decision_reason='Confirmação do vencedor com acesso de supervisão sem contestação.',
    )

    updated_match.refresh_from_db()
    assert updated_match.status == 'FINISHED'
    assert updated_match.match_result_confirmed is True
    assert updated_match.confirmed_by_team == home_team
