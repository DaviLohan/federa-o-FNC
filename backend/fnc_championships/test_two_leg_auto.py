"""
Testes do avanço automático de chaveamento em confrontos de ida/volta e do
tratamento de empate no agregado (decisão manual).
"""
import pytest

from conftest import AdminUserFactory, KnockoutChampionshipFactory, MatchFactory, TeamFactory
from fnc_championships.models import Bracket
from fnc_championships.services import (
    recompute_after_match,
    resolve_aggregate_tie,
    update_bracket_after_match,
)
from fnc_notifications.models import Notification

pytestmark = pytest.mark.django_db


def _team_dict(team):
    return {
        'id': team.id,
        'name': team.name,
        'abbreviation': team.abbreviation,
        'logo': None,
    }


def _build_two_leg_bracket(championship, team_a, team_b, first_leg_id):
    """Cria um bracket com uma semi (ida/volta) e uma final vazia."""
    structure = {
        'rounds': [
            {
                'round_number': 1,
                'round_name': 'Semi-final',
                'matches': [
                    {
                        'match_number': 1,
                        'match_id': first_leg_id,
                        'team1': _team_dict(team_a),
                        'team2': _team_dict(team_b),
                        'winner': None,
                        'score': None,
                    },
                ],
            },
            {
                'round_number': 2,
                'round_name': 'Final',
                'matches': [],
            },
        ],
    }
    return Bracket.objects.create(championship=championship, structure=structure)


def _make_legs(championship, team_a, team_b, leg1_scores, leg2_scores):
    """Cria ida (A x B) e volta (B x A) finalizadas com os placares dados."""
    leg1 = MatchFactory(
        championship=championship, home_team=team_a, away_team=team_b,
        match_type='PLAYOFF', round_number=1, status='FINISHED',
        home_score=leg1_scores[0], away_score=leg1_scores[1],
    )
    leg2 = MatchFactory(
        championship=championship, home_team=team_b, away_team=team_a,
        match_type='PLAYOFF', round_number=1, status='FINISHED',
        home_score=leg2_scores[0], away_score=leg2_scores[1],
    )
    return leg1, leg2


def _reload_tie(championship):
    structure = Bracket.objects.get(championship=championship).structure
    return structure, structure['rounds'][0]['matches'][0], structure['rounds'][1]['matches']


def test_two_leg_decisive_winner_advances():
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    # Agregado: A = 2+1 = 3, B = 0+0 = 0 → A avança
    leg1, leg2 = _make_legs(championship, team_a, team_b, (2, 0), (0, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)

    update_bracket_after_match(leg2)

    _, tie, final_matches = _reload_tie(championship)
    assert tie['winner'] is not None
    assert tie['winner']['id'] == team_a.id
    # Vencedor propagado para a final (match_number 1 → mando)
    assert final_matches and final_matches[0]['team1']['id'] == team_a.id


def test_two_leg_aggregate_tie_flags_and_notifies():
    admin = AdminUserFactory()
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    # Agregado: A = 1+1 = 2, B = 1+1 = 2 → empate
    leg1, leg2 = _make_legs(championship, team_a, team_b, (1, 1), (1, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)

    update_bracket_after_match(leg2)

    _, tie, final_matches = _reload_tie(championship)
    assert tie['winner'] is None
    assert tie.get('needs_manual_decision') is True
    assert tie.get('resolution_note') == 'aggregate_tie'
    # Não avançou ninguém
    assert not final_matches
    # Admin notificado
    assert Notification.objects.filter(
        user=admin, notification_type='SYSTEM', related_match_id=leg2.id,
    ).exists()


def test_aggregate_tie_notifies_admin_only_once():
    AdminUserFactory()
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    leg1, leg2 = _make_legs(championship, team_a, team_b, (1, 1), (1, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)

    notif_qs = Notification.objects.filter(notification_type='SYSTEM', related_match_id=leg2.id)

    update_bracket_after_match(leg2)
    count_after_first = notif_qs.count()
    update_bracket_after_match(leg2)  # recompute repetido não deve duplicar aviso
    count_after_second = notif_qs.count()

    assert count_after_first >= 1
    assert count_after_second == count_after_first


def test_resolve_aggregate_tie_advances_qualifier():
    AdminUserFactory()
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    leg1, leg2 = _make_legs(championship, team_a, team_b, (1, 1), (1, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)
    update_bracket_after_match(leg2)  # entra em empate pendente

    resolve_aggregate_tie(leg2, team_b.id, penalty_home=4, penalty_away=2)

    _, tie, final_matches = _reload_tie(championship)
    assert tie['winner'] is not None
    assert tie['winner']['id'] == team_b.id
    assert not tie.get('needs_manual_decision')
    assert tie.get('penalty_score') == '4-2'
    assert final_matches and final_matches[0]['team1']['id'] == team_b.id


def test_resolve_aggregate_tie_rejects_team_outside_tie():
    championship = KnockoutChampionshipFactory()
    team_a, team_b, intruder = TeamFactory(), TeamFactory(), TeamFactory()
    leg1, leg2 = _make_legs(championship, team_a, team_b, (1, 1), (1, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)

    with pytest.raises(ValueError):
        resolve_aggregate_tie(leg2, intruder.id)


def test_recompute_after_match_triggers_bracket_advance():
    championship = KnockoutChampionshipFactory()
    team_a, team_b = TeamFactory(), TeamFactory()
    leg1, leg2 = _make_legs(championship, team_a, team_b, (3, 0), (0, 1))
    _build_two_leg_bracket(championship, team_a, team_b, leg1.id)

    # Helper compartilhado deve recomputar e avançar o vencedor.
    recompute_after_match(leg2)

    _, tie, final_matches = _reload_tie(championship)
    assert tie['winner'] is not None
    assert tie['winner']['id'] == team_a.id
    assert final_matches and final_matches[0]['team1']['id'] == team_a.id
