"""Testes de regressão para o command ``fix_two_leg_tie``.

Cobre o cenário crítico: corrigir o placar de um confronto ida/volta de forma que
o vencedor agregado MUDE, quando a partida da próxima fase JÁ EXISTE com o time
errado — caso em que ``_advance_winner_to_next_round`` não atualiza o Match real
(fnc_championships/services/__init__.py:664-665) e o command precisa sincronizar.
"""

import pytest
from django.core.management import call_command

from fnc_championships.models import Bracket
from fnc_matches.models import Match

from conftest import KnockoutChampionshipFactory, MatchFactory, TeamFactory


def _team_dict(team):
    return {'id': team.id, 'name': team.name, 'abbreviation': team.abbreviation, 'logo': None}


@pytest.fixture
def wrong_winner_scenario(db):
    """Monta um mata-mata onde o time A avançou indevidamente sobre B.

    Estado inicial (ERRADO): ida A 2x0 B, volta (B casa) 0x0 A -> agregado A 2x0 ->
    A avançou e a final (round 2) já existe com A x C. O correto será B avançar.
    """
    champ = KnockoutChampionshipFactory()
    team_a = TeamFactory(name='Alpha FC')
    team_b = TeamFactory(name='Beta FC')
    team_c = TeamFactory(name='Gamma FC')  # adversário já classificado na final

    # Pernas do confronto A x B (round 1, PLAYOFF, FINISHED) — placar inicial errado.
    ida = MatchFactory(
        championship=champ, home_team=team_a, away_team=team_b,
        match_type='PLAYOFF', round_number=1, status='FINISHED',
        home_score=2, away_score=0,
    )
    volta = MatchFactory(
        championship=champ, home_team=team_b, away_team=team_a,
        match_type='PLAYOFF', round_number=1, status='FINISHED',
        home_score=0, away_score=0,
    )

    # Final (round 2) JÁ criada com o vencedor errado (A) — simula o bug :664-665.
    final = MatchFactory(
        championship=champ, home_team=team_a, away_team=team_c,
        match_type='FINAL', round_number=2, status='SCHEDULED',
        home_score=0, away_score=0,
    )

    structure = {
        'championship_id': champ.id,
        'rounds': [
            {
                'round_number': 1,
                'matches': [{
                    'match_number': 1,
                    'team1': _team_dict(team_a),
                    'team2': _team_dict(team_b),
                    'match_id': ida.id,
                    'winner': _team_dict(team_a),  # errado
                    'score': '2-0',
                }],
            },
            {
                'round_number': 2,
                'matches': [{
                    'match_number': 1,
                    'home_team_id': team_a.id, 'home_team_name': team_a.name,
                    'away_team_id': team_c.id, 'away_team_name': team_c.name,
                    'team1': _team_dict(team_a),
                    'team2': _team_dict(team_c),
                    'match_id': final.id,
                    'winner': None, 'winner_id': None, 'winner_name': None,
                    'score': None,
                }],
            },
        ],
    }
    Bracket.objects.create(championship=champ, structure=structure)
    return {
        'champ': champ, 'team_a': team_a, 'team_b': team_b, 'team_c': team_c,
        'ida': ida, 'volta': volta, 'final': final,
    }


@pytest.mark.django_db
def test_corrige_placar_inverte_vencedor_e_reavanca_final(wrong_winner_scenario):
    s = wrong_winner_scenario

    call_command(
        'fix_two_leg_tie', s['champ'].id,
        '--team-a', 'Alpha', '--team-b', 'Beta',
        '--ida-a-score', '0', '--ida-b-score', '1',
        '--volta-a-score', '1', '--volta-b-score', '1',
        '--apply',
    )

    ida = Match.objects.get(id=s['ida'].id)
    volta = Match.objects.get(id=s['volta'].id)
    final = Match.objects.get(id=s['final'].id)

    # Placar gravado conforme o mando real de cada perna.
    assert (ida.home_score, ida.away_score) == (0, 1)      # casa A 0 x 1 B fora
    assert (volta.home_score, volta.away_score) == (1, 1)  # casa B 1 x 1 A fora
    assert ida.admin_override and volta.admin_override

    # Agregado A 1 x 2 B -> B venceu.
    agg_a = ida.home_score + volta.away_score
    agg_b = ida.away_score + volta.home_score
    assert (agg_a, agg_b) == (1, 2)

    # Bracket: vencedor do confronto vira B.
    structure = Bracket.objects.get(championship=s['champ']).structure
    tie_node = structure['rounds'][0]['matches'][0]
    assert (tie_node['winner'] or {}).get('id') == s['team_b'].id

    # PONTO CRÍTICO: a final (que já existia com A) foi corrigida para B x C.
    assert final.home_team_id == s['team_b'].id
    assert final.away_team_id == s['team_c'].id


@pytest.mark.django_db
def test_apply_e_idempotente(wrong_winner_scenario):
    s = wrong_winner_scenario
    args = [
        s['champ'].id, '--team-a', 'Alpha', '--team-b', 'Beta',
        '--ida-a-score', '0', '--ida-b-score', '1',
        '--volta-a-score', '1', '--volta-b-score', '1', '--apply',
    ]
    call_command('fix_two_leg_tie', *args)
    call_command('fix_two_leg_tie', *args)  # segunda vez não deve quebrar nem divergir

    final = Match.objects.get(id=s['final'].id)
    assert final.home_team_id == s['team_b'].id
    assert final.away_team_id == s['team_c'].id


@pytest.mark.django_db
def test_recusa_final_jogo_unico(wrong_winner_scenario):
    """match_type=FINAL (jogo único) não pode ser tratado como ida/volta."""
    s = wrong_winner_scenario
    # Transforma as 'pernas' em FINAL para simular uso indevido.
    Match.objects.filter(id__in=[s['ida'].id, s['volta'].id]).update(match_type='FINAL')
    with pytest.raises(Exception) as exc:
        call_command(
            'fix_two_leg_tie', s['champ'].id,
            '--team-a', 'Alpha', '--team-b', 'Beta',
            '--ida-a-score', '0', '--ida-b-score', '1',
            '--volta-a-score', '1', '--volta-b-score', '1',
            '--apply',
        )
    assert 'PLAYOFF' in str(exc.value)


@pytest.mark.django_db
def test_recusa_empate_no_agregado(wrong_winner_scenario):
    s = wrong_winner_scenario
    with pytest.raises(Exception) as exc:
        call_command(
            'fix_two_leg_tie', s['champ'].id,
            '--team-a', 'Alpha', '--team-b', 'Beta',
            '--ida-a-score', '1', '--ida-b-score', '1',
            '--volta-a-score', '0', '--volta-b-score', '0',
            '--apply',
        )
    assert 'EMPATE' in str(exc.value)
