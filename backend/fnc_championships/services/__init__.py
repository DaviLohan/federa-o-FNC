"""
Serviços para geração de chaveamento e tabela de campeonatos.
"""
import math
import random
from django.db.models import Q
from fnc_championships.models import Championship, ChampionshipEnrollment, Bracket, Standings
from fnc_matches.models import Match


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
                scheduled_date=championship.start_date,
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
    
    # Opcionalmente: Gera todas as partidas do campeonato (ida e volta)
    _create_league_matches(championship, [e.team for e in enrollments])
    
    return standings_created


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
    current_date = championship.start_date
    
    # Algoritmo round-robin para gerar confrontos
    for round_num in range(1, num_rounds + 1):
        round_matches = _generate_round_robin_round(teams, round_num)
        
        for home_team, away_team in round_matches:
            matches_to_create.append(
                Match(
                    home_team=home_team,
                    away_team=away_team,
                    championship=championship,
                    match_type='CHAMPIONSHIP',
                    round_number=round_num,
                    scheduled_date=current_date,
                    status='SCHEDULED'
                )
            )
        
        # Avança uma semana para a próxima rodada
        current_date += datetime.timedelta(days=7)
    
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
    
    if match.championship.championship_type != 'KNOCKOUT':
        return
    
    if match.status != 'FINISHED':
        return
    
    winner = match.winner
    if not winner:
        # Empate em mata-mata - precisa de desempate
        # Por enquanto, não faz nada
        return
    
    try:
        bracket = Bracket.objects.get(championship=match.championship)
    except Bracket.DoesNotExist:
        return
    
    # Atualiza o bracket com o vencedor
    structure = bracket.structure
    
    # Procura a partida no bracket
    for round_data in structure['rounds']:
        for match_data in round_data['matches']:
            if match_data.get('match_id') == match.id:
                # Atualiza o vencedor
                match_data['winner_id'] = winner.id
                match_data['winner_name'] = winner.name
                
                # Avança o vencedor para a próxima rodada
                _advance_winner_to_next_round(structure, round_data, match_data, winner)
                break
    
    bracket.structure = structure
    bracket.save()


def _advance_winner_to_next_round(structure, current_round, current_match, winner):
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
    
    # Calcula em qual partida da próxima rodada o vencedor deve ir
    match_number = current_match['match_number']
    next_match_number = (match_number + 1) // 2
    next_match = next_round['matches'][next_match_number - 1]
    
    # Adiciona o vencedor à próxima partida
    # Se for número ímpar, vai como home, se par, vai como away
    if match_number % 2 == 1:
        next_match['home_team_id'] = winner.id
        next_match['home_team_name'] = winner.name
    else:
        next_match['away_team_id'] = winner.id
        next_match['away_team_name'] = winner.name
    
    # Se ambos os times já estão definidos, cria a partida
    if next_match['home_team_id'] and next_match['away_team_id']:
        from fnc_teams.models import Team
        from fnc_championships.models import Championship
        
        home_team = Team.objects.get(id=next_match['home_team_id'])
        away_team = Team.objects.get(id=next_match['away_team_id'])
        championship = Championship.objects.get(id=structure.get('championship_id'))
        
        # Cria a partida da próxima rodada
        match = Match.objects.create(
            home_team=home_team,
            away_team=away_team,
            championship=championship,
            match_type='PLAYOFF' if next_round_num < len(structure['rounds']) else 'FINAL',
            round_number=next_round_num,
            scheduled_date=championship.start_date,  # Ajustar data depois
            status='SCHEDULED'
        )
        
        next_match['match_id'] = match.id
