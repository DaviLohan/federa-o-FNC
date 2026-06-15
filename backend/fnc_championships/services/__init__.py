"""
Serviços para geração de chaveamento e tabela de campeonatos.
"""
import logging
import math
import random
from django.utils import timezone
from django.db import transaction
from fnc_championships.models import Championship, ChampionshipEnrollment, Bracket, Standings
from fnc_matches.models import Match

from .league_match_generator import generate_league_matches, can_generate_league_matches
from .schedule_utils import (
    align_datetime_to_championship_schedule,
    resolve_championship_round_datetime,
    resolve_next_championship_slot,
)
from .group_stage_service import initialize_group_stage, recompute_group_standings_for_championship

logger = logging.getLogger(__name__)


@transaction.atomic
def finalize_championship_if_completed(championship):
    """Finaliza automaticamente o campeonato quando todas as partidas estiverem finalizadas."""
    if not championship:
        return False
    if championship.status != Championship.Status.IN_PROGRESS:
        return False

    matches = Match.objects.filter(championship=championship)
    if not matches.exists():
        return False

    has_unfinished = matches.exclude(status=Match.Status.FINISHED).exists()
    if has_unfinished:
        return False

    championship.status = Championship.Status.FINISHED
    championship.end_date = timezone.now()
    championship.save(update_fields=['status', 'end_date', 'updated_at'])
    logger.info('Championship id=%s auto-finished after all matches finished', championship.id)
    return True


def generate_knockout_bracket(championship):
    """
    Gera o chaveamento de mata-mata para um campeonato.
    Cria a estrutura JSON do bracket e as partidas da primeira rodada.
    
    Args:
        championship: Instância do Championship
        
    Returns:
        Bracket: Instância do modelo Bracket criado
    """
    # Busca todos os times aprovados
    enrollments = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    ).select_related('team')
    
    teams = [enrollment.team for enrollment in enrollments]
    num_teams = len(teams)
    
    if num_teams < championship.min_teams:
        raise ValueError(
            f'Número insuficiente de times. Mínimo: {championship.min_teams}, Atual: {num_teams}'
        )
    
    # Calcula o número de rodadas necessárias
    # Próxima potência de 2
    bracket_size = 2 ** math.ceil(math.log2(num_teams))
    num_rounds = int(math.log2(bracket_size))
    
    # Embaralha os times para sortear os confrontos
    random.shuffle(teams)
    
    # Cria a estrutura do bracket
    bracket_structure = {
        'championship_id': championship.id,
        'rounds': [],
        'bracket_size': bracket_size,
        'num_teams': num_teams
    }
    
    # Cria as rodadas
    for round_num in range(1, num_rounds + 1):
        round_name = _get_round_name(round_num, num_rounds)
        bracket_structure['rounds'].append({
            'round_number': round_num,
            'round_name': round_name,
            'matches': []
        })
    
    # Preenche a primeira rodada com os times
    first_round = bracket_structure['rounds'][0]
    matches_in_first_round = bracket_size // 2
    
    team_index = 0
    for match_num in range(matches_in_first_round):
        # Pega dois times, se disponível
        home_team = teams[team_index] if team_index < num_teams else None
        team_index += 1
        away_team = teams[team_index] if team_index < num_teams else None
        team_index += 1
        
        match_data = {
            'match_number': match_num + 1,
            'home_team_id': home_team.id if home_team else None,
            'home_team_name': home_team.name if home_team else 'BYE',
            'away_team_id': away_team.id if away_team else None,
            'away_team_name': away_team.name if away_team else 'BYE',
            'match_id': None,  # Será preenchido quando a partida for criada
            'winner_id': None,
            'winner_name': None
        }
        
        # Se um dos times for None (BYE), o outro avança automaticamente
        if home_team and not away_team:
            match_data['winner_id'] = home_team.id
            match_data['winner_name'] = home_team.name
        elif away_team and not home_team:
            match_data['winner_id'] = away_team.id
            match_data['winner_name'] = away_team.name
        
        first_round['matches'].append(match_data)
    
    # Salva o bracket
    bracket, created = Bracket.objects.update_or_create(
        championship=championship,
        defaults={'structure': bracket_structure}
    )
    
    # Cria as partidas reais da primeira rodada (apenas onde há dois times)
    _create_knockout_matches(championship, bracket, first_round)
    
    return bracket


def _get_round_name(round_num, total_rounds):
    """
    Retorna o nome da rodada baseado na posição.
    
    Args:
        round_num: Número da rodada (1, 2, 3...)
        total_rounds: Total de rodadas no bracket
        
    Returns:
        str: Nome da rodada (ex: "Oitavas", "Quartas", "Semi-final", "Final")
    """
    rounds_from_end = total_rounds - round_num
    
    if rounds_from_end == 0:
        return "Final"
    elif rounds_from_end == 1:
        return "Semi-final"
    elif rounds_from_end == 2:
        return "Quartas de final"
    elif rounds_from_end == 3:
        return "Oitavas de final"
    else:
        return f"Rodada {round_num}"


def _create_knockout_matches(championship, bracket, first_round_data):
    """
    Cria as partidas da primeira rodada do mata-mata.
    
    Args:
        championship: Instância do Championship
        bracket: Instância do Bracket
        first_round_data: Dados da primeira rodada do bracket
    """
    from fnc_teams.models import Team
    
    for match_data in first_round_data['matches']:
        home_team_id = match_data['home_team_id']
        away_team_id = match_data['away_team_id']
        
        # Só cria a partida se houver dois times
        if home_team_id and away_team_id:
            home_team = Team.objects.get(id=home_team_id)
            away_team = Team.objects.get(id=away_team_id)
            
            # Cria a partida
            match = Match.objects.create(
                home_team=home_team,
                away_team=away_team,
                championship=championship,
                match_type='CHAMPIONSHIP',
                round_number=1,
                scheduled_date=resolve_championship_round_datetime(championship, 1),
                status='SCHEDULED'
            )
            
            # Atualiza o bracket com o ID da partida
            match_data['match_id'] = match.id
    
    # Salva o bracket atualizado
    bracket.structure = bracket.structure  # Força update
    bracket.save()


def generate_league_table(championship):
    """
    Gera a tabela de classificação inicial para campeonato de pontos corridos.
    Cria entradas de Standings para todos os times aprovados.
    
    Args:
        championship: Instância do Championship
        
    Returns:
        int: Número de times adicionados à tabela
    """
    # Busca todos os times aprovados
    enrollments = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    ).select_related('team')
    
    num_teams = enrollments.count()
    
    if num_teams < championship.min_teams:
        raise ValueError(
            f'Número insuficiente de times. Mínimo: {championship.min_teams}, Atual: {num_teams}'
        )
    
    # Cria standings para cada time
    standings_created = 0
    for enrollment in enrollments:
        standing, created = Standings.objects.get_or_create(
            championship=championship,
            team=enrollment.team,
            defaults={
                'matches_played': 0,
                'wins': 0,
                'draws': 0,
                'losses': 0,
                'goals_for': 0,
                'goals_against': 0,
                'points': 0
            }
        )
        if created:
            standings_created += 1
    
    return standings_created


@transaction.atomic
def initialize_league_championship(championship, *, days_between_rounds: int = 7, source: str = 'manual'):
    """Inicializa campeonato LEAGUE com standings e partidas de forma idempotente."""
    can_generate, error_msg = can_generate_league_matches(championship)
    if not can_generate:
        raise ValueError(error_msg)

    logger.info(
        'Initializing LEAGUE championship id=%s name=%s source=%s status=%s',
        championship.id,
        championship.name,
        source,
        championship.status,
    )

    standings_count = generate_league_table(championship)
    result = generate_league_matches(
        championship=championship,
        days_between_rounds=days_between_rounds,
    )

    championship.status = Championship.Status.IN_PROGRESS
    championship.save(update_fields=['status', 'updated_at'])

    return {
        'standings_count': standings_count,
        'matches_result': result,
    }


@transaction.atomic
def reschedule_championship_matches(championship, *, days_between_rounds: int = 7, include_finished: bool = True):
    """Reaplica a agenda oficial do campeonato nas partidas já geradas."""
    matches = Match.objects.filter(championship=championship).order_by('round_number', 'id')
    if not include_finished:
        matches = matches.exclude(status=Match.Status.FINISHED)

    updated = []
    for match in matches:
        if match.round_number is None:
            continue

        new_scheduled_date = resolve_championship_round_datetime(
            championship,
            match.round_number,
            start_date=championship.start_date,
            days_between_rounds=days_between_rounds,
        )

        if new_scheduled_date is None:
            new_scheduled_date = align_datetime_to_championship_schedule(match.scheduled_date, championship)

        if match.scheduled_date == new_scheduled_date:
            continue

        previous = match.scheduled_date
        match.scheduled_date = new_scheduled_date
        match.save(update_fields=['scheduled_date', 'updated_at'])
        updated.append({
            'match_id': match.id,
            'round_number': match.round_number,
            'previous': previous,
            'current': new_scheduled_date,
            'status': match.status,
        })

    logger.info(
        'Rescheduled %s matches for championship id=%s name=%s include_finished=%s',
        len(updated),
        championship.id,
        championship.name,
        include_finished,
    )

    return {
        'championship_id': championship.id,
        'championship_name': championship.name,
        'updated_count': len(updated),
        'updated_matches': updated,
    }


def auto_initialize_due_league_championships(*, now=None, days_between_rounds: int = 7):
    """Fluxo legado desativado: campeonatos devem iniciar manualmente por admin/supervisor."""
    logger.info('Automatic league initialization is disabled. Manual start is required.')
    return {
        'checked': 0,
        'initialized': [],
        'skipped': [],
        'errors': [],
    }


def _create_league_matches(championship, teams):
    """
    Gera todas as partidas de um campeonato de pontos corridos.
    Cada time joga contra todos os outros times (turno único ou ida e volta).
    
    Args:
        championship: Instância do Championship
        teams: Lista de times participantes
    """
    import datetime
    
    num_teams = len(teams)
    
    # Número de rodadas = número de times - 1 (para turno único)
    # Se quiser ida e volta, multiplica por 2
    num_rounds = (num_teams - 1) * 2  # Ida e volta
    
    # Gera os confrontos usando algoritmo de round-robin
    matches_to_create = []
    # Algoritmo round-robin para gerar confrontos
    for round_num in range(1, num_rounds + 1):
        round_matches = _generate_round_robin_round(teams, round_num)
        round_date = resolve_championship_round_datetime(
            championship,
            round_num,
            start_date=championship.start_date,
            days_between_rounds=7,
        )
        
        for home_team, away_team in round_matches:
            matches_to_create.append(
                Match(
                    home_team=home_team,
                    away_team=away_team,
                    championship=championship,
                    match_type='CHAMPIONSHIP',
                    round_number=round_num,
                    scheduled_date=round_date,
                    status='SCHEDULED'
                )
            )
    
    # Cria todas as partidas de uma vez
    Match.objects.bulk_create(matches_to_create)


def _generate_round_robin_round(teams, round_num):
    """
    Gera os confrontos de uma rodada usando algoritmo round-robin.
    
    Args:
        teams: Lista de times
        round_num: Número da rodada
        
    Returns:
        list: Lista de tuplas (home_team, away_team)
    """
    num_teams = len(teams)
    
    # Se número ímpar de times, adiciona um "BYE"
    if num_teams % 2 != 0:
        teams = teams + [None]
        num_teams += 1
    
    # Cria uma cópia para manipular
    teams_copy = list(teams)
    
    # Roda o algoritmo round-robin
    # Fixa o primeiro time e rotaciona os outros
    for _ in range(round_num - 1):
        teams_copy = [teams_copy[0]] + [teams_copy[-1]] + teams_copy[1:-1]
    
    # Gera os confrontos desta rodada
    matches = []
    for i in range(num_teams // 2):
        home = teams_copy[i]
        away = teams_copy[num_teams - 1 - i]
        
        # Pula se algum time for None (BYE)
        if home is not None and away is not None:
            # Alterna mando de campo baseado na rodada
            if round_num <= (num_teams - 1):
                matches.append((home, away))
            else:
                matches.append((away, home))
    
    return matches


def update_bracket_after_match(match):
    """
    Atualiza o bracket após uma partida de mata-mata ser finalizada.
    Avança o vencedor para a próxima rodada.
    
    Args:
        match: Instância do Match finalizado
    """
    if not match.championship:
        return
    
    if match.championship.championship_type not in {'KNOCKOUT', 'GROUPS_KNOCKOUT'}:
        return
    
    if match.status != 'FINISHED':
        return
    
    winner = match.winner
    
    try:
        bracket = Bracket.objects.get(championship=match.championship)
    except Bracket.DoesNotExist:
        return
    
    # Atualiza o bracket com o vencedor
    structure = bracket.structure

    def _compute_two_leg_winner(current_match_data):
        from django.db.models import Q

        related = list(
            Match.objects.filter(
                championship=match.championship,
                round_number=match.round_number,
                match_type=match.match_type,
            )
            .filter(
                Q(home_team=match.home_team, away_team=match.away_team)
                | Q(home_team=match.away_team, away_team=match.home_team)
            )
            .order_by('id')
        )

        if len(related) < 2:
            return winner, None

        legs = related[:2]
        if not all(leg.status == Match.Status.FINISHED for leg in legs):
            return None, 'pending_second_leg'

        team1_data = current_match_data.get('team1') or {}
        team2_data = current_match_data.get('team2') or {}
        team1_id = team1_data.get('id')
        team2_id = team2_data.get('id')

        if not team1_id or not team2_id:
            team1_id = legs[0].home_team_id
            team2_id = legs[0].away_team_id

        agg_team1 = 0
        agg_team2 = 0
        for leg in legs:
            if leg.home_team_id == team1_id and leg.away_team_id == team2_id:
                agg_team1 += leg.home_score
                agg_team2 += leg.away_score
            elif leg.home_team_id == team2_id and leg.away_team_id == team1_id:
                agg_team1 += leg.away_score
                agg_team2 += leg.home_score

        if agg_team1 == agg_team2:
            # Empate no agregado: só avança se um admin já definiu o classificado
            # (pênaltis). Caso contrário, fica pendente de decisão manual.
            manual_id = current_match_data.get('manual_qualifier_id')
            if manual_id in (team1_id, team2_id):
                qualifier = match.home_team.__class__.objects.get(id=manual_id)
                return qualifier, f'{agg_team1}-{agg_team2} (pen)'
            return None, 'aggregate_tie'

        if agg_team1 > agg_team2:
            return match.home_team.__class__.objects.get(id=team1_id), f'{agg_team1}-{agg_team2}'
        return match.home_team.__class__.objects.get(id=team2_id), f'{agg_team2}-{agg_team1}'
    
    def _is_same_tie(match_data):
        team1 = (match_data.get('team1') or {}).get('id')
        team2 = (match_data.get('team2') or {}).get('id')
        if not team1 or not team2:
            return False
        pair_a = {team1, team2}
        pair_b = {match.home_team_id, match.away_team_id}
        return pair_a == pair_b

    # Procura a partida/confronto no bracket
    for round_data in structure.get('rounds', []):
        for match_index, match_data in enumerate(round_data.get('matches', []), start=1):
            if match_data.get('match_id') == match.id or (
                round_data.get('round_number') == match.round_number and _is_same_tie(match_data)
            ):
                resolved_winner, resolution_note = _compute_two_leg_winner(match_data)

                # Confronto de ida/volta ainda em andamento: não define vencedor nem avança
                if resolution_note == 'pending_second_leg':
                    match_data['score'] = f'{match.home_score}-{match.away_score}'
                    if 'winner' in match_data:
                        match_data['winner'] = None
                    else:
                        match_data['winner_id'] = None
                        match_data['winner_name'] = None
                    match_data.pop('needs_manual_decision', None)
                    match_data.pop('resolution_note', None)
                    break

                if resolution_note == 'aggregate_tie':
                    match_data['score'] = f'{match.home_score}-{match.away_score}'
                    if 'winner' in match_data:
                        match_data['winner'] = None
                    else:
                        match_data['winner_id'] = None
                        match_data['winner_name'] = None
                    # Empate no agregado: não avança sozinho — marca pendente de decisão
                    # manual (pênaltis/classificado) e notifica os admins uma única vez.
                    already_flagged = bool(match_data.get('needs_manual_decision'))
                    match_data['needs_manual_decision'] = True
                    match_data['resolution_note'] = 'aggregate_tie'
                    if not already_flagged:
                        _notify_aggregate_tie(match)
                    break

                if not resolved_winner:
                    break

                # Vencedor decidido: limpa qualquer marcação de pendência anterior.
                match_data.pop('needs_manual_decision', None)
                match_data.pop('resolution_note', None)

                # Atualiza o vencedor
                if 'winner' in match_data:
                    match_data['winner'] = {
                        'id': resolved_winner.id,
                        'name': resolved_winner.name,
                        'abbreviation': resolved_winner.abbreviation,
                        'logo': resolved_winner.logo.url if resolved_winner.logo else None,
                    }
                    match_data['score'] = f'{match.home_score}-{match.away_score}'
                else:
                    match_data['winner_id'] = resolved_winner.id
                    match_data['winner_name'] = resolved_winner.name
                    match_data['score'] = f'{match.home_score}-{match.away_score}'

                # Avança o vencedor para a próxima rodada
                _advance_winner_to_next_round(
                    structure,
                    round_data,
                    match_data,
                    resolved_winner,
                    championship=match.championship,
                    match_index=match_index,
                )
                break
    
    bracket.structure = structure
    bracket.save()


def _advance_winner_to_next_round(structure, current_round, current_match, winner, *, championship=None, match_index=None):
    """
    Avança o vencedor para a próxima rodada do bracket.
    
    Args:
        structure: Estrutura do bracket
        current_round: Dados da rodada atual
        current_match: Dados da partida atual
        winner: Time vencedor
    """
    current_round_num = current_round['round_number']
    next_round_num = current_round_num + 1
    
    # Verifica se existe próxima rodada
    if next_round_num > len(structure['rounds']):
        # É a final, não há próxima rodada
        return
    
    # Encontra a próxima rodada
    next_round = structure['rounds'][next_round_num - 1]
    next_round_matches = next_round.setdefault('matches', [])

    # Calcula em qual partida da próxima rodada o vencedor deve ir
    match_number = current_match.get('match_number') or match_index
    if not match_number:
        return
    next_match_number = (match_number + 1) // 2

    while len(next_round_matches) < next_match_number:
        next_round_matches.append({
            'match_number': len(next_round_matches) + 1,
            'home_team_id': None,
            'home_team_name': 'TBD',
            'away_team_id': None,
            'away_team_name': 'TBD',
            'team1': None,
            'team2': None,
            'match_id': None,
            'winner_id': None,
            'winner_name': None,
            'winner': None,
            'score': None,
        })

    next_match = next_round_matches[next_match_number - 1]

    # Adiciona o vencedor à próxima partida
    # Se for número ímpar, vai como home, se par, vai como away
    if match_number % 2 == 1:
        next_match['home_team_id'] = winner.id
        next_match['home_team_name'] = winner.name
        next_match['team1'] = {
            'id': winner.id,
            'name': winner.name,
            'abbreviation': winner.abbreviation,
            'logo': winner.logo.url if winner.logo else None,
        }
    else:
        next_match['away_team_id'] = winner.id
        next_match['away_team_name'] = winner.name
        next_match['team2'] = {
            'id': winner.id,
            'name': winner.name,
            'abbreviation': winner.abbreviation,
            'logo': winner.logo.url if winner.logo else None,
        }

    # Se ambos os times já estão definidos, cria a partida
    if next_match.get('match_id'):
        return

    if next_match.get('home_team_id') and next_match.get('away_team_id'):
        from fnc_teams.models import Team
        from fnc_championships.models import Championship
        
        home_team = Team.objects.get(id=next_match['home_team_id'])
        away_team = Team.objects.get(id=next_match['away_team_id'])
        if not championship:
            championship_id = structure.get('championship_id')
            if championship_id:
                championship = Championship.objects.get(id=championship_id)
        if not championship:
            return
        
        latest_round_match = (
            Match.objects.filter(championship=championship, round_number=current_round_num)
            .order_by('-scheduled_date', '-id')
            .first()
        )
        if latest_round_match:
            next_date = resolve_next_championship_slot(championship, latest_round_match.scheduled_date)
        else:
            next_date = resolve_championship_round_datetime(championship, next_round_num)

        # Cria a partida da próxima rodada
        match = Match.objects.create(
            home_team=home_team,
            away_team=away_team,
            championship=championship,
            match_type='PLAYOFF' if next_round_num < len(structure['rounds']) else 'FINAL',
            round_number=next_round_num,
            scheduled_date=next_date,
            status='SCHEDULED'
        )
        
        next_match['match_id'] = match.id


def recompute_after_match(match, *, advance_bracket=True):
    """Recalcula os dados derivados após uma partida ser aplicada/confirmada.

    Centraliza o recompute usado tanto no fluxo manual (``confirm_report``) quanto no
    automático (validação EA), evitando divergência entre os dois caminhos:
    tabela/classificação, standings de grupo, avanço de chaveamento e performance.

    A consistência estrita de standings (que pode levantar exceção) continua sendo
    responsabilidade do chamador manual; aqui o objetivo é recomputar sem derrubar
    tarefas em background.
    """
    from fnc_matches.services import (
        recompute_match_derived_data_for_championship,
        update_team_performance,
    )

    if match.championship:
        recompute_match_derived_data_for_championship(match.championship)

        if match.championship.championship_type == Championship.Type.GROUPS_KNOCKOUT:
            recompute_group_standings_for_championship(match.championship)

        if (
            advance_bracket
            and match.status == Match.Status.FINISHED
            and match.championship.championship_type in {
                Championship.Type.KNOCKOUT,
                Championship.Type.GROUPS_KNOCKOUT,
            }
        ):
            update_bracket_after_match(match)
    else:
        from player_stats.global_ranking_service import recompute_global_team_ranking
        recompute_global_team_ranking()

    try:
        update_team_performance(match)
    except Exception:
        logger.exception('Erro ao atualizar performance para Match PK=%s', match.pk)


def _notify_aggregate_tie(match):
    """Notifica admins/supervisores (in-app) que um confronto de ida/volta empatou no
    agregado e precisa de decisão manual (pênaltis/classificado) para avançar."""
    try:
        from django.db.models import Q
        from fnc_notifications.models import Notification
        from users.models import User

        admins = User.objects.filter(is_active=True).filter(
            Q(user_type__in=[User.UserType.ADMIN, User.UserType.SUPERVISOR])
            | Q(is_supervisor=True)
        )
        championship_name = match.championship.name if match.championship else ''
        title = 'Empate no agregado — decisão manual necessária'
        message = (
            f'O confronto {match.home_team.name} x {match.away_team.name} '
            f'({championship_name}) terminou empatado no agregado. '
            'Defina o classificado (pênaltis) para avançar o chaveamento.'
        )
        notifications = [
            Notification(
                user=admin,
                notification_type='SYSTEM',
                title=title,
                message=message,
                action_url=f'/matches/{match.id}',
                related_match_id=match.id,
                related_championship_id=match.championship_id,
            )
            for admin in admins
        ]
        if notifications:
            Notification.objects.bulk_create(notifications)
            logger.info(
                'Empate de agregado notificado para %d admin(s): Match PK=%s',
                len(notifications), match.pk,
            )
    except Exception:
        logger.exception('Falha ao notificar empate de agregado para Match PK=%s', match.pk)


def resolve_aggregate_tie(match, qualifier_team_id, *, penalty_home=None, penalty_away=None):
    """Resolve manualmente um empate de agregado (ida/volta) definindo o classificado.

    Grava o classificado (e, opcionalmente, o placar de pênaltis) no confronto do
    chaveamento e dispara o avanço do vencedor. Levanta ValueError em entradas inválidas.
    """
    qualifier_team_id = int(qualifier_team_id)
    if qualifier_team_id not in (match.home_team_id, match.away_team_id):
        raise ValueError('O classificado deve ser um dos dois times do confronto.')
    if not match.championship:
        raise ValueError('Partida não pertence a um campeonato.')

    try:
        bracket = Bracket.objects.get(championship=match.championship)
    except Bracket.DoesNotExist:
        raise ValueError('Chaveamento não encontrado para este campeonato.')

    structure = bracket.structure or {}
    target_pair = {match.home_team_id, match.away_team_id}
    found = False
    for round_data in structure.get('rounds', []):
        if round_data.get('round_number') != match.round_number:
            continue
        for match_data in round_data.get('matches', []):
            t1 = (match_data.get('team1') or {}).get('id')
            t2 = (match_data.get('team2') or {}).get('id')
            if t1 and t2 and {t1, t2} == target_pair:
                match_data['manual_qualifier_id'] = qualifier_team_id
                if penalty_home is not None and penalty_away is not None:
                    match_data['penalty_score'] = f'{int(penalty_home)}-{int(penalty_away)}'
                found = True
                break
        if found:
            break

    if not found:
        raise ValueError('Confronto não encontrado no chaveamento.')

    bracket.structure = structure
    bracket.save()

    # Avança o classificado agora que o desempate foi definido.
    update_bracket_after_match(match)
