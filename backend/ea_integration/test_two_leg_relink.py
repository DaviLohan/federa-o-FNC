"""
Testes do desbloqueio de fixtures presas a EAMatch não-aplicado (re-link), do
detach do vínculo antigo, do avanço automático via auto-aplicação EA e da
notificação de resultado de mata-mata irregular.
"""
import pytest
from django.utils import timezone

from conftest import AdminUserFactory, KnockoutChampionshipFactory, MatchFactory, TeamFactory
from ea_integration.models import EAClub, EAMatch
from ea_integration.validation import (
    MatchValidationService,
    ValidationIssue,
    ValidationResult,
)
from fnc_championships.models import Bracket
from fnc_matches.models import MatchReport
from fnc_notifications.models import Notification

pytestmark = pytest.mark.django_db


def _club(team, ea_id):
    return EAClub.objects.create(
        team=team, ea_club_id=str(ea_id), platform='common-gen5', name=team.name,
    )


def _ea_match(ea_id, home_club, away_club, *, home_score, away_score,
              validation_status='pending', linked_match=None, played_at=None):
    return EAMatch.objects.create(
        ea_match_id=str(ea_id),
        match_type='friendlyMatch',
        played_at=played_at or timezone.now(),
        home_club=home_club,
        home_club_name=home_club.name,
        away_club=away_club,
        away_club_name=away_club.name,
        home_score=home_score,
        away_score=away_score,
        validation_status=validation_status,
        linked_match=linked_match,
    )


def test_find_linked_match_allows_reclaim_of_contested_fixture():
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 101), _club(team_b, 102)
    fixture = MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=timezone.now(),
    )
    # EAMatch antigo CONTESTED preso à fixture (ex.: resultado por desconexão)
    _ea_match(201, club_a, club_b, home_score=0, away_score=3,
              validation_status='contested', linked_match=fixture)
    # Novo EAMatch limpo, ainda sem vínculo
    new_ea = _ea_match(202, club_a, club_b, home_score=2, away_score=1)

    match, _issues = MatchValidationService()._find_linked_match(new_ea, team_a, team_b)

    assert match is not None
    assert match.id == fixture.id


def test_find_linked_match_excludes_validated_linked_fixture():
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 111), _club(team_b, 112)
    fixture = MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=timezone.now(),
    )
    # Vínculo VALIDATED é legítimo: a fixture não deve ser "roubada".
    _ea_match(211, club_a, club_b, home_score=2, away_score=0,
              validation_status='validated', linked_match=fixture)
    new_ea = _ea_match(212, club_a, club_b, home_score=1, away_score=1)

    match, _issues = MatchValidationService()._find_linked_match(new_ea, team_a, team_b)

    assert match is None


def test_find_linked_match_excludes_game_played_well_before_schedule():
    """Janela assimétrica: um jogo jogado bem antes da data agendada (ex.: revanche do
    mesmo dia da ida) NÃO deve ser elegível para uma mão agendada para outro dia."""
    from datetime import timedelta
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 151), _club(team_b, 152)
    played = timezone.now()
    # Volta agendada 24h DEPOIS do jogo EA → fora da margem de antecedência (3h).
    MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=played + timedelta(hours=24),
    )
    ea = _ea_match(251, club_a, club_b, home_score=2, away_score=1, played_at=played)

    match, _issues = MatchValidationService()._find_linked_match(ea, team_a, team_b)

    assert match is None


def test_find_linked_match_accepts_game_played_after_schedule():
    """Jogo atrasado (jogado depois do horário agendado) continua elegível."""
    from datetime import timedelta
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 161), _club(team_b, 162)
    played = timezone.now()
    # Partida agendada 20h ANTES do jogo (atraso) → dentro da janela (até 48h depois).
    fixture = MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=played - timedelta(hours=20),
    )
    ea = _ea_match(261, club_a, club_b, home_score=2, away_score=1, played_at=played)

    match, _issues = MatchValidationService()._find_linked_match(ea, team_a, team_b)

    assert match is not None and match.id == fixture.id


def test_persist_result_detaches_stale_contested_link():
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 121), _club(team_b, 122)
    fixture = MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=timezone.now(),
    )
    old_ea = _ea_match(221, club_a, club_b, home_score=0, away_score=3,
                       validation_status='contested', linked_match=fixture)
    new_ea = _ea_match(222, club_a, club_b, home_score=2, away_score=1)

    result = ValidationResult(status='validated', issues=[], linked_match=fixture)
    MatchValidationService()._persist_result(new_ea, result)

    old_ea.refresh_from_db()
    new_ea.refresh_from_db()
    assert old_ea.linked_match_id is None  # vínculo antigo solto, registro preservado
    assert new_ea.linked_match_id == fixture.id
    assert new_ea.validation_status == 'validated'


def test_apply_result_to_match_triggers_bracket_advance():
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 131), _club(team_b, 132)

    leg1 = MatchFactory(
        championship=championship, home_team=team_a, away_team=team_b,
        match_type='PLAYOFF', round_number=1, status='FINISHED',
        home_score=2, away_score=0,
    )
    leg2 = MatchFactory(
        championship=championship, home_team=team_b, away_team=team_a,
        match_type='PLAYOFF', round_number=1, status='SCHEDULED',
        scheduled_date=timezone.now(),
    )
    Bracket.objects.create(championship=championship, structure={
        'rounds': [
            {'round_number': 1, 'round_name': 'Semi-final', 'matches': [{
                'match_number': 1, 'match_id': leg1.id,
                'team1': {'id': team_a.id, 'name': team_a.name, 'abbreviation': team_a.abbreviation, 'logo': None},
                'team2': {'id': team_b.id, 'name': team_b.name, 'abbreviation': team_b.abbreviation, 'logo': None},
                'winner': None, 'score': None,
            }]},
            {'round_number': 2, 'round_name': 'Final', 'matches': []},
        ],
    })

    # Volta jogada na EA: B 0 x 1 A → agregado A=3, B=0.
    ea_match = _ea_match(231, club_b, club_a, home_score=0, away_score=1, validation_status='validated')

    MatchValidationService()._apply_result_to_match(ea_match, leg2)

    leg2.refresh_from_db()
    assert leg2.status == 'FINISHED'
    assert leg2.home_score == 0 and leg2.away_score == 1
    assert MatchReport.objects.filter(match=leg2).exists()

    structure = Bracket.objects.get(championship=championship).structure
    tie = structure['rounds'][0]['matches'][0]
    final_matches = structure['rounds'][1]['matches']
    assert tie['winner'] is not None and tie['winner']['id'] == team_a.id
    assert final_matches and final_matches[0]['team1']['id'] == team_a.id


def test_notify_irregular_knockout_creates_admin_notification():
    admin = AdminUserFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    club_a, club_b = _club(team_a, 141), _club(team_b, 142)
    fixture = MatchFactory(
        home_team=team_a, away_team=team_b, match_type='PLAYOFF',
        round_number=2, status='SCHEDULED', scheduled_date=timezone.now(),
    )
    ea_match = _ea_match(241, club_a, club_b, home_score=0, away_score=3,
                         validation_status='contested', linked_match=fixture)
    issues = [ValidationIssue('potential_disconnect_override', 'critical', 'placar sem gols')]

    service = MatchValidationService()
    service._notify_irregular_knockout(ea_match, fixture, issues)
    first = Notification.objects.filter(
        notification_type='MATCH_CONTESTED', related_match_id=fixture.id,
    ).count()
    service._notify_irregular_knockout(ea_match, fixture, issues)  # não duplica
    second = Notification.objects.filter(
        notification_type='MATCH_CONTESTED', related_match_id=fixture.id,
    ).count()

    assert first >= 1
    assert second == first
    assert Notification.objects.filter(
        user=admin, notification_type='MATCH_CONTESTED', related_match_id=fixture.id,
    ).exists()
