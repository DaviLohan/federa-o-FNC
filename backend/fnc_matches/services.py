"""
Serviços para atualização automática de estatísticas após partidas.
"""
from django.db.models import Sum, Count, Q, F
from django.utils import timezone
from fnc_matches.models import Match, Goal, Card
from player_stats.models import PlayerStatistics, TeamStatistics, TopScorer
from player_stats.team_performance_sync import TeamPerformanceSyncService
from fnc_championships.models import Standings, ChampionshipEnrollment
from fnc_teams.models import TeamMembership


def sync_matches_ready_to_start(now=None):
    """Libera automaticamente partidas ao chegar o horário oficial agendado."""
    now = now or timezone.now()

    with_started_at = Match.objects.filter(
        status=Match.Status.SCHEDULED,
        scheduled_date__lte=now,
        started_at__isnull=True,
    ).update(status=Match.Status.IN_PROGRESS, started_at=F('scheduled_date'))

    without_started_at = Match.objects.filter(
        status=Match.Status.SCHEDULED,
        scheduled_date__lte=now,
    ).exclude(started_at__isnull=True).update(status=Match.Status.IN_PROGRESS)

    return with_started_at + without_started_at


def update_player_statistics(match):
    """
    Atualiza as estatísticas dos jogadores após a finalização de uma partida.
    
    Args:
        match: Instância do modelo Match
    """
    if not match.championship:
        # Não atualiza estatísticas de amistosos
        return
    
    # Pega todos os jogadores que participaram da partida
    # (através dos gols, assistências e cartões)
    players_in_match = set()
    
    # Adiciona todos os jogadores dos times que jogaram
    # (assumindo que todos jogaram - pode ser refinado depois)
    home_team_players = match.home_team.players.filter(
        teammembership__is_active=True
    )
    away_team_players = match.away_team.players.filter(
        teammembership__is_active=True
    )
    
    # Atualiza estatísticas de jogadores do time da casa
    for player in home_team_players:
        _update_player_stats_for_match(
            player=player,
            team=match.home_team,
            match=match,
            is_home=True
        )
    
    # Atualiza estatísticas de jogadores do time visitante
    for player in away_team_players:
        _update_player_stats_for_match(
            player=player,
            team=match.away_team,
            match=match,
            is_home=False
        )


def _update_player_stats_for_match(player, team, match, is_home):
    """
    Atualiza ou cria estatísticas de um jogador específico para uma partida.
    
    Args:
        player: Instância do PlayerProfile
        team: Instância do Team
        match: Instância do Match
        is_home: Boolean indicando se é o time da casa
    """
    # Busca ou cria as estatísticas do jogador no campeonato
    stats, created = PlayerStatistics.objects.get_or_create(
        player=player,
        championship=match.championship,
        team=team
    )
    
    # Atualiza partidas jogadas
    stats.matches_played += 1
    
    # Atualiza vitórias/empates/derrotas
    winner = match.winner
    if winner == team:
        stats.matches_won += 1
    elif match.is_draw:
        stats.matches_drawn += 1
    else:
        stats.matches_lost += 1
    
    # Conta gols do jogador nesta partida
    goals_in_match = Goal.objects.filter(
        match=match,
        scorer=player,
        team=team
    ).exclude(goal_type='OWN_GOAL').count()
    stats.goals += goals_in_match
    
    # Conta assistências do jogador nesta partida
    assists_in_match = Goal.objects.filter(
        match=match,
        team=team,
        assist__assistant=player
    ).count()
    stats.assists += assists_in_match
    
    # Conta cartões do jogador nesta partida
    yellow_cards = Card.objects.filter(
        match=match,
        player=player,
        team=team,
        card_type='YELLOW'
    ).count()
    red_cards = Card.objects.filter(
        match=match,
        player=player,
        team=team,
        card_type='RED'
    ).count()
    stats.yellow_cards += yellow_cards
    stats.red_cards += red_cards
    
    # Assume que jogou 90 minutos (pode ser refinado depois)
    stats.minutes_played += 90
    
    # Verifica se foi clean sheet (para goleiros)
    if player.primary_position == 'GK':
        if is_home and match.away_score == 0:
            stats.clean_sheets += 1
        elif not is_home and match.home_score == 0:
            stats.clean_sheets += 1
    
    stats.save()


def update_team_statistics(match):
    """
    Atualiza as estatísticas dos times após a finalização de uma partida.
    
    Args:
        match: Instância do modelo Match
    """
    if not match.championship:
        # Não atualiza estatísticas de amistosos
        return
    
    # Atualiza estatísticas do time da casa
    _update_team_stats_for_match(
        team=match.home_team,
        match=match,
        goals_scored=match.home_score,
        goals_conceded=match.away_score,
        is_winner=(match.winner == match.home_team if match.winner else None)
    )
    
    # Atualiza estatísticas do time visitante
    _update_team_stats_for_match(
        team=match.away_team,
        match=match,
        goals_scored=match.away_score,
        goals_conceded=match.home_score,
        is_winner=(match.winner == match.away_team if match.winner else None)
    )


def _update_team_stats_for_match(team, match, goals_scored, goals_conceded, is_winner):
    """
    Atualiza ou cria estatísticas de um time específico para uma partida.
    
    Args:
        team: Instância do Team
        match: Instância do Match
        goals_scored: Gols marcados pelo time
        goals_conceded: Gols sofridos pelo time
        is_winner: True se venceu, False se perdeu, None se empatou
    """
    # Busca ou cria as estatísticas do time no campeonato
    stats, created = TeamStatistics.objects.get_or_create(
        team=team,
        championship=match.championship
    )
    
    # Atualiza partidas jogadas
    stats.matches_played += 1
    
    # Atualiza vitórias/empates/derrotas e sequências
    if is_winner is True:
        stats.matches_won += 1
        stats.current_win_streak += 1
        stats.current_unbeaten_streak += 1
        if stats.current_win_streak > stats.longest_win_streak:
            stats.longest_win_streak = stats.current_win_streak
        if stats.current_unbeaten_streak > stats.longest_unbeaten_streak:
            stats.longest_unbeaten_streak = stats.current_unbeaten_streak
    elif is_winner is None:
        stats.matches_drawn += 1
        stats.current_win_streak = 0  # Reset win streak
        stats.current_unbeaten_streak += 1
        if stats.current_unbeaten_streak > stats.longest_unbeaten_streak:
            stats.longest_unbeaten_streak = stats.current_unbeaten_streak
    else:
        stats.matches_lost += 1
        stats.current_win_streak = 0  # Reset streaks
        stats.current_unbeaten_streak = 0
    
    # Atualiza gols
    stats.goals_scored += goals_scored
    stats.goals_conceded += goals_conceded
    
    # Atualiza clean sheets
    if goals_conceded == 0:
        stats.clean_sheets += 1
    
    # Atualiza maior vitória/derrota
    goal_difference = goals_scored - goals_conceded
    if goal_difference > 0 and goal_difference > stats.biggest_win_margin:
        stats.biggest_win_margin = goal_difference
    elif goal_difference < 0 and abs(goal_difference) > stats.biggest_loss_margin:
        stats.biggest_loss_margin = abs(goal_difference)
    
    # Conta cartões do time nesta partida
    yellow_cards = Card.objects.filter(
        match=match,
        team=team,
        card_type='YELLOW'
    ).count()
    red_cards = Card.objects.filter(
        match=match,
        team=team,
        card_type='RED'
    ).count()
    stats.yellow_cards += yellow_cards
    stats.red_cards += red_cards
    
    stats.save()


def update_standings(match):
    """
    Atualiza a classificação do campeonato após a finalização de uma partida.
    Apenas para campeonatos do tipo LEAGUE (pontos corridos).
    
    Args:
        match: Instância do modelo Match
    """
    if not match.championship:
        return
    
    # Só atualiza standings para campeonatos de pontos corridos
    if match.championship.championship_type != 'LEAGUE':
        return
    
    recompute_standings_for_championship(match.championship)


def _update_standing_for_match(team, championship, goals_for, goals_against, is_winner):
    """
    Atualiza ou cria a classificação de um time no campeonato.
    
    Args:
        team: Instância do Team
        championship: Instância do Championship
        goals_for: Gols marcados
        goals_against: Gols sofridos
        is_winner: True se venceu, False se perdeu, None se empatou
    """
    # Busca ou cria o standing
    standing, created = Standings.objects.get_or_create(
        team=team,
        championship=championship
    )
    
    # Atualiza estatísticas
    standing.matches_played += 1
    standing.goals_for += goals_for
    standing.goals_against += goals_against
    
    # Atualiza pontos e resultados
    if is_winner is True:
        standing.wins += 1
        standing.points += 3
    elif is_winner is None:
        standing.draws += 1
        standing.points += 1
    else:
        standing.losses += 1
    
    standing.save()


def recompute_standings_for_championship(championship):
    """Recalcula a classificação completa do campeonato a partir das partidas válidas."""
    if not championship or championship.championship_type != 'LEAGUE':
        return

    team_ids = list(
        ChampionshipEnrollment.objects.filter(
            championship=championship,
            status='APPROVED',
        ).values_list('team_id', flat=True)
    )

    if not team_ids:
        team_ids = list(
            Match.objects.filter(championship=championship).values_list('home_team_id', flat=True)
        ) + list(
            Match.objects.filter(championship=championship).values_list('away_team_id', flat=True)
        )

    unique_team_ids = sorted(set(team_ids))
    if not unique_team_ids:
        Standings.objects.filter(championship=championship).delete()
        return

    existing = {
        standing.team_id: standing
        for standing in Standings.objects.filter(championship=championship)
    }

    touched_ids = set()
    for team_id in unique_team_ids:
        standing = existing.get(team_id)
        if not standing:
            standing = Standings.objects.create(championship=championship, team_id=team_id)
            existing[team_id] = standing

        standing.matches_played = 0
        standing.wins = 0
        standing.draws = 0
        standing.losses = 0
        standing.goals_for = 0
        standing.goals_against = 0
        standing.points = 0
        standing.save(update_fields=[
            'matches_played', 'wins', 'draws', 'losses',
            'goals_for', 'goals_against', 'points', 'updated_at',
        ])
        touched_ids.add(team_id)

    finished_matches = Match.objects.filter(
        championship=championship,
        status=Match.Status.FINISHED,
    ).order_by('finished_at', 'id')

    for match in finished_matches:
        _update_standing_for_match(
            team=match.home_team,
            championship=championship,
            goals_for=match.home_score,
            goals_against=match.away_score,
            is_winner=(match.winner == match.home_team if match.winner else None),
        )
        _update_standing_for_match(
            team=match.away_team,
            championship=championship,
            goals_for=match.away_score,
            goals_against=match.home_score,
            is_winner=(match.winner == match.away_team if match.winner else None),
        )

    Standings.objects.filter(championship=championship).exclude(team_id__in=touched_ids).delete()


def update_top_scorers(match):
    """
    Atualiza o ranking de artilheiros após a finalização de uma partida.
    
    Args:
        match: Instância do modelo Match
    """
    if not match.championship:
        return
    
    # Busca todos os jogadores que marcaram gols nesta partida
    goals = Goal.objects.filter(
        match=match
    ).exclude(goal_type='OWN_GOAL')
    
    players_who_scored = set(goals.values_list('scorer_id', flat=True))
    
    # Atualiza o ranking para cada jogador que marcou
    for player_id in players_who_scored:
        from users.models import PlayerProfile
        player = PlayerProfile.objects.get(id=player_id)
        
        # Determina o time do jogador nesta partida
        goal = goals.filter(scorer_id=player_id).first()
        team = goal.team if goal else None
        
        if not team:
            continue
        
        # Busca ou cria o registro de artilheiro
        top_scorer, created = TopScorer.objects.get_or_create(
            championship=match.championship,
            player=player,
            defaults={
                'team': team,
                'position': 0  # Será recalculado depois
            }
        )
        
        # Atualiza o time se mudou
        if top_scorer.team != team:
            top_scorer.team = team
        
        # Conta total de gols no campeonato (apenas partidas finalizadas)
        total_goals = Goal.objects.filter(
            match__championship=match.championship,
            match__status='FINISHED',
            scorer=player,
            team=team
        ).exclude(goal_type='OWN_GOAL').count()
        
        # Conta total de assistências no campeonato (apenas partidas finalizadas)
        total_assists = Goal.objects.filter(
            match__championship=match.championship,
            match__status='FINISHED',
            team=team,
            assist__assistant=player
        ).count()
        
        # Conta partidas jogadas
        matches_played = Match.objects.filter(
            Q(home_team=team) | Q(away_team=team),
            championship=match.championship,
            status='FINISHED'
        ).count()
        
        top_scorer.goals = total_goals
        top_scorer.assists = total_assists
        top_scorer.matches_played = matches_played
        top_scorer.save()
    
    # Recalcula as posições de todos os artilheiros do campeonato
    _recalculate_top_scorer_positions(match.championship)


def _recalculate_top_scorer_positions(championship):
    """
    Recalcula as posições no ranking de artilheiros.
    
    Args:
        championship: Instância do Championship
    """
    # Busca todos os artilheiros ordenados por gols (depois assistências)
    top_scorers = TopScorer.objects.filter(
        championship=championship
    ).order_by('-goals', '-assists', 'matches_played')
    
    # Atualiza as posições
    for position, scorer in enumerate(top_scorers, start=1):
        if scorer.position != position:
            scorer.position = position
            scorer.save(update_fields=['position'])


def reverse_match_result(match, admin_user):
    """
    Reverte o resultado de uma partida contestada.
    Remove todas as estatísticas geradas pela partida e retorna a partida
    ao status de agendada para ser jogada novamente.
    
    Args:
        match: Instância do modelo Match
        admin_user: Usuário admin que está revertendo
    
    Returns:
        dict: Dicionário com informações sobre a reversão
    """
    if not match.championship:
        return {
            'success': False,
            'message': 'Apenas partidas de campeonato podem ser revertidas.'
        }
    
    # Capture match state BEFORE checking status (winner depends on status being FINISHED)
    # So we need to temporarily check if it was finished by looking at scores and finished_at
    original_home_score = match.home_score
    original_away_score = match.away_score
    original_is_draw = (original_home_score == original_away_score)
    
    if original_home_score > original_away_score:
        original_winner = match.home_team
    elif original_away_score > original_home_score:
        original_winner = match.away_team
    else:
        original_winner = None
    
    if match.status != 'CONTESTED':
        return {
            'success': False,
            'message': 'Apenas partidas com status CONTESTED podem ser revertidas.'
        }
    
    # 1. Reverter estatísticas de jogadores
    home_team_players = match.home_team.players.filter(
        teammembership__is_active=True
    )
    away_team_players = match.away_team.players.filter(
        teammembership__is_active=True
    )
    
    for player in home_team_players:
        _reverse_player_stats_for_match(
            player=player,
            team=match.home_team,
            match=match,
            is_home=True,
            original_winner=original_winner,
            original_is_draw=original_is_draw
        )
    
    for player in away_team_players:
        _reverse_player_stats_for_match(
            player=player,
            team=match.away_team,
            match=match,
            is_home=False,
            original_winner=original_winner,
            original_is_draw=original_is_draw
        )
    
    # 2. Reverter estatísticas dos times
    _reverse_team_stats(match.home_team, match)
    _reverse_team_stats(match.away_team, match)
    
    # 3. Recalcular artilheiros
    update_top_scorers(match)

    # 4. Resetar a partida
    match.status = 'SCHEDULED'
    match.home_score = 0
    match.away_score = 0
    match.finished_at = None
    match.save(update_fields=['status', 'home_score', 'away_score', 'finished_at', 'updated_at'])

    recompute_standings_for_championship(match.championship)

    # 5. Remover súmula se existir
    try:
        if hasattr(match, 'report'):
            match.report.delete()
    except:
        pass
    
    return {
        'success': True,
        'message': f'Resultado revertido. Partida retornou ao status SCHEDULED.',
        'match_id': match.id
    }


def _reverse_player_stats_for_match(player, team, match, is_home, original_winner, original_is_draw):
    """
    Reverte as estatísticas de um jogador específico para uma partida.
    
    Args:
        player: PlayerProfile instance
        team: Team instance
        match: Match instance
        is_home: Boolean indicating if this is the home team
        original_winner: The winner before reversal (or None if draw)
        original_is_draw: Boolean indicating if it was a draw
    """
    try:
        stats = PlayerStatistics.objects.get(
            player=player,
            championship=match.championship,
            team=team
        )
        
        # Reverte partidas jogadas
        if stats.matches_played > 0:
            stats.matches_played -= 1
        
        # Reverte vitórias/empates/derrotas using ORIGINAL match state
        if original_winner == team and stats.matches_won > 0:
            stats.matches_won -= 1
        elif original_is_draw and stats.matches_drawn > 0:
            stats.matches_drawn -= 1
        elif original_winner and original_winner != team and stats.matches_lost > 0:
            stats.matches_lost -= 1
        
        # Reverte gols
        goals_in_match = Goal.objects.filter(
            match=match,
            scorer=player,
            team=team
        ).exclude(goal_type='OWN_GOAL').count()
        
        if stats.goals >= goals_in_match:
            stats.goals -= goals_in_match
        
        # Reverte gols contra (own_goals doesn't exist in PlayerStatistics, skip it)
        
        # Reverte assistências
        assists_in_match = Goal.objects.filter(
            match=match,
            team=team,
            assist__assistant=player
        ).count()
        
        if stats.assists >= assists_in_match:
            stats.assists -= assists_in_match
        
        # Reverte cartões
        yellow_cards = Card.objects.filter(
            match=match,
            player=player,
            card_type='YELLOW'
        ).count()
        
        red_cards = Card.objects.filter(
            match=match,
            player=player,
            card_type='RED'
        ).count()
        
        if stats.yellow_cards >= yellow_cards:
            stats.yellow_cards -= yellow_cards
        
        if stats.red_cards >= red_cards:
            stats.red_cards -= red_cards
        
        stats.save()
        
    except PlayerStatistics.DoesNotExist:
        pass


def _reverse_team_stats(team, match):
    """
    Reverte as estatísticas de um time para uma partida.
    """
    try:
        stats = TeamStatistics.objects.get(
            team=team,
            championship=match.championship
        )
        
        # Reverte partidas jogadas
        if stats.matches_played > 0:
            stats.matches_played -= 1
        
        # Reverte vitórias/empates/derrotas
        winner = match.winner
        if winner == team and stats.matches_won > 0:
            stats.matches_won -= 1
        elif match.is_draw and stats.matches_drawn > 0:
            stats.matches_drawn -= 1
        elif winner and winner != team and stats.matches_lost > 0:
            stats.matches_lost -= 1
        
        # Reverte gols
        is_home = match.home_team == team
        team_goals = match.home_score if is_home else match.away_score
        opponent_goals = match.away_score if is_home else match.home_score
        
        if stats.goals_scored >= team_goals:
            stats.goals_scored -= team_goals
        
        if stats.goals_conceded >= opponent_goals:
            stats.goals_conceded -= opponent_goals
        
        stats.save()
        
    except TeamStatistics.DoesNotExist:
        pass


def _reverse_standings(match, original_winner, original_is_draw, original_home_score, original_away_score):
    """
    Reverte a classificação após reverter uma partida.
    
    Args:
        match: Match instance
        original_winner: The winner before reversal
        original_is_draw: Boolean indicating if it was a draw
        original_home_score: Original home team score
        original_away_score: Original away team score
    """
    try:
        home_standing = Standings.objects.get(
            championship=match.championship,
            team=match.home_team
        )
        
        away_standing = Standings.objects.get(
            championship=match.championship,
            team=match.away_team
        )
        
        # Reverte partidas jogadas
        if home_standing.matches_played > 0:
            home_standing.matches_played -= 1
        if away_standing.matches_played > 0:
            away_standing.matches_played -= 1
        
        # Reverte vitórias/empates/derrotas e pontos using ORIGINAL match state
        if original_winner == match.home_team:
            if home_standing.wins > 0:
                home_standing.wins -= 1
            if home_standing.points >= 3:
                home_standing.points -= 3
            
            if away_standing.losses > 0:
                away_standing.losses -= 1
        
        elif original_winner == match.away_team:
            if away_standing.wins > 0:
                away_standing.wins -= 1
            if away_standing.points >= 3:
                away_standing.points -= 3
            
            if home_standing.losses > 0:
                home_standing.losses -= 1
        
        elif original_is_draw:
            if home_standing.draws > 0:
                home_standing.draws -= 1
            if home_standing.points >= 1:
                home_standing.points -= 1
            
            if away_standing.draws > 0:
                away_standing.draws -= 1
            if away_standing.points >= 1:
                away_standing.points -= 1
        
        # Reverte gols using ORIGINAL scores
        if home_standing.goals_for >= original_home_score:
            home_standing.goals_for -= original_home_score
        if home_standing.goals_against >= original_away_score:
            home_standing.goals_against -= original_away_score
        
        if away_standing.goals_for >= original_away_score:
            away_standing.goals_for -= original_away_score
        if away_standing.goals_against >= original_home_score:
            away_standing.goals_against -= original_home_score
        
        home_standing.save()
        away_standing.save()
        
    except Standings.DoesNotExist:
        pass


def update_team_performance(match):
    """Atualiza snapshots persistidos de desempenho do time para a partida."""
    if not match or match.status != Match.Status.FINISHED:
        return
    TeamPerformanceSyncService.sync_match(match)
