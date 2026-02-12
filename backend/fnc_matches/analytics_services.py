"""
Serviços de análise e estatísticas avançadas para partidas e campeonatos.
"""
from django.db.models import Count, Sum, Avg, Q, F, Case, When, IntegerField, FloatField
from django.db.models.functions import Coalesce
from .models import Match, Goal, Card, Penalty
from fnc_teams.models import Team
from users.models import PlayerProfile


class PlayerStats:
    """Estatísticas de jogadores."""
    
    @staticmethod
    def get_player_overall_stats(player_id, championship_id=None):
        """
        Estatísticas gerais de um jogador.
        
        Args:
            player_id: ID do jogador
            championship_id: ID do campeonato (opcional, se None retorna todas)
        
        Returns:
            dict: Estatísticas do jogador
        """
        filters = {'scorer_id': player_id}
        if championship_id:
            filters['match__championship_id'] = championship_id
        
        goals = Goal.objects.filter(**filters, match__status='FINISHED')
        
        # Contar gols por tipo
        total_goals = goals.count()
        regular_goals = goals.filter(goal_type='REGULAR').count()
        free_kick_goals = goals.filter(goal_type='FREE_KICK').count()
        penalty_goals = goals.filter(goal_type='PENALTY').count()
        header_goals = goals.filter(goal_type='HEADER').count()
        own_goals = goals.filter(goal_type='OWN_GOAL').count()
        
        # Assistências
        from .models import Assist
        assist_filters = {'assistant_id': player_id}
        if championship_id:
            assist_filters['goal__match__championship_id'] = championship_id
        
        total_assists = Assist.objects.filter(
            **assist_filters,
            goal__match__status='FINISHED'
        ).count()
        
        # Cartões
        card_filters = {'player_id': player_id}
        if championship_id:
            card_filters['match__championship_id'] = championship_id
        
        cards = Card.objects.filter(**card_filters, match__status='FINISHED')
        yellow_cards = cards.filter(card_type='YELLOW').count()
        red_cards = cards.filter(card_type='RED').count()
        
        # Partidas jogadas (estimativa baseada em eventos)
        matches_played = Match.objects.filter(
            Q(goals__scorer_id=player_id) | Q(cards__player_id=player_id),
            status='FINISHED'
        ).distinct().count()
        
        # Média de gols por partida
        goals_per_match = total_goals / matches_played if matches_played > 0 else 0
        
        # Penalidades
        penalty_filters = {'target_type': 'PLAYER', 'player_id': player_id}
        if championship_id:
            penalty_filters['championship_id'] = championship_id
        
        suspensions = Penalty.objects.filter(**penalty_filters)
        total_suspensions = suspensions.count()
        games_suspended = suspensions.aggregate(
            total=Coalesce(Sum('games_suspended'), 0)
        )['total']
        
        return {
            'player_id': player_id,
            'matches_played': matches_played,
            'goals': {
                'total': total_goals,
                'regular': regular_goals,
                'free_kick': free_kick_goals,
                'penalty': penalty_goals,
                'header': header_goals,
                'own_goal': own_goals,
                'per_match': round(goals_per_match, 2)
            },
            'assists': total_assists,
            'cards': {
                'yellow': yellow_cards,
                'red': red_cards,
                'total': yellow_cards + red_cards
            },
            'penalties': {
                'total': total_suspensions,
                'games_suspended': games_suspended
            }
        }
    
    @staticmethod
    def get_top_scorers(championship_id=None, limit=10):
        """
        Retorna os artilheiros do campeonato ou geral.
        
        Args:
            championship_id: ID do campeonato (opcional)
            limit: Número máximo de resultados
        
        Returns:
            list: Lista de jogadores com suas estatísticas
        """
        filters = {'match__status': 'FINISHED'}
        if championship_id:
            filters['match__championship_id'] = championship_id
        
        top_scorers = Goal.objects.filter(**filters).values(
            'scorer_id',
            'scorer__player_name',
            'scorer__gamer_tag'
        ).annotate(
            total_goals=Count('id'),
            penalties=Count(Case(When(goal_type='PENALTY', then=1))),
            free_kicks=Count(Case(When(goal_type='FREE_KICK', then=1))),
            headers=Count(Case(When(goal_type='HEADER', then=1)))
        ).order_by('-total_goals')[:limit]
        
        return list(top_scorers)
    
    @staticmethod
    def get_top_assisters(championship_id=None, limit=10):
        """Retorna os maiores assistentes."""
        from .models import Assist
        
        filters = {'goal__match__status': 'FINISHED'}
        if championship_id:
            filters['goal__match__championship_id'] = championship_id
        
        top_assisters = Assist.objects.filter(**filters).values(
            'assistant_id',
            'assistant__player_name',
            'assistant__gamer_tag'
        ).annotate(
            total_assists=Count('id')
        ).order_by('-total_assists')[:limit]
        
        return list(top_assisters)
    
    @staticmethod
    def get_most_disciplined(championship_id=None, limit=10):
        """Retorna jogadores com menos cartões (jogadores disciplinados)."""
        filters = {'match__status': 'FINISHED'}
        if championship_id:
            filters['match__championship_id'] = championship_id
        
        # Jogadores com participação mas menos cartões
        disciplined_players = Card.objects.filter(**filters).values(
            'player_id',
            'player__player_name'
        ).annotate(
            total_cards=Count('id'),
            yellow_cards=Count(Case(When(card_type='YELLOW', then=1))),
            red_cards=Count(Case(When(card_type='RED', then=1)))
        ).order_by('total_cards')[:limit]
        
        return list(disciplined_players)


class TeamStats:
    """Estatísticas de times."""
    
    @staticmethod
    def get_team_overall_stats(team_id, championship_id=None):
        """
        Estatísticas gerais de um time.
        
        Args:
            team_id: ID do time
            championship_id: ID do campeonato (opcional)
        
        Returns:
            dict: Estatísticas do time
        """
        filters = Q(home_team_id=team_id) | Q(away_team_id=team_id)
        if championship_id:
            filters &= Q(championship_id=championship_id)
        
        matches = Match.objects.filter(filters, status='FINISHED')
        
        total_matches = matches.count()
        
        # Vitórias, empates, derrotas
        wins = matches.filter(
            Q(home_team_id=team_id, home_score__gt=F('away_score')) |
            Q(away_team_id=team_id, away_score__gt=F('home_score'))
        ).count()
        
        draws = matches.filter(home_score=F('away_score')).count()
        
        losses = total_matches - wins - draws
        
        # Gols marcados e sofridos
        home_stats = matches.filter(home_team_id=team_id).aggregate(
            scored=Coalesce(Sum('home_score'), 0),
            conceded=Coalesce(Sum('away_score'), 0)
        )
        
        away_stats = matches.filter(away_team_id=team_id).aggregate(
            scored=Coalesce(Sum('away_score'), 0),
            conceded=Coalesce(Sum('home_score'), 0)
        )
        
        goals_scored = home_stats['scored'] + away_stats['scored']
        goals_conceded = home_stats['conceded'] + away_stats['conceded']
        goal_difference = goals_scored - goals_conceded
        
        # Médias
        goals_per_match = goals_scored / total_matches if total_matches > 0 else 0
        conceded_per_match = goals_conceded / total_matches if total_matches > 0 else 0
        
        # Série atual
        recent_matches = matches.order_by('-scheduled_date')[:5]
        current_form = []
        for match in recent_matches:
            if (match.home_team_id == team_id and match.home_score > match.away_score) or \
               (match.away_team_id == team_id and match.away_score > match.home_score):
                current_form.append('W')
            elif match.home_score == match.away_score:
                current_form.append('D')
            else:
                current_form.append('L')
        
        # Cartões
        cards_home = Card.objects.filter(
            match__home_team_id=team_id,
            match__status='FINISHED',
            match__in=matches
        ).aggregate(
            yellow=Count(Case(When(card_type='YELLOW', then=1))),
            red=Count(Case(When(card_type='RED', then=1)))
        )
        
        cards_away = Card.objects.filter(
            match__away_team_id=team_id,
            match__status='FINISHED',
            match__in=matches
        ).aggregate(
            yellow=Count(Case(When(card_type='YELLOW', then=1))),
            red=Count(Case(When(card_type='RED', then=1)))
        )
        
        total_yellow = cards_home['yellow'] + cards_away['yellow']
        total_red = cards_home['red'] + cards_away['red']
        
        # Clean sheets (sem sofrer gols)
        clean_sheets = matches.filter(
            Q(home_team_id=team_id, away_score=0) |
            Q(away_team_id=team_id, home_score=0)
        ).count()
        
        # Win rate
        win_rate = (wins / total_matches * 100) if total_matches > 0 else 0
        
        return {
            'team_id': team_id,
            'matches': {
                'total': total_matches,
                'wins': wins,
                'draws': draws,
                'losses': losses,
                'win_rate': round(win_rate, 2)
            },
            'goals': {
                'scored': goals_scored,
                'conceded': goals_conceded,
                'difference': goal_difference,
                'per_match': round(goals_per_match, 2),
                'conceded_per_match': round(conceded_per_match, 2)
            },
            'cards': {
                'yellow': total_yellow,
                'red': total_red,
                'total': total_yellow + total_red
            },
            'clean_sheets': clean_sheets,
            'current_form': current_form[:5]  # Últimos 5 jogos
        }
    
    @staticmethod
    def get_team_rankings(championship_id):
        """
        Retorna classificação dos times em um campeonato.
        
        Args:
            championship_id: ID do campeonato
        
        Returns:
            list: Times ordenados por pontos
        """
        from fnc_championships.models import ChampionshipEnrollment
        
        enrollments = ChampionshipEnrollment.objects.filter(
            championship_id=championship_id,
            status='APPROVED'
        ).select_related('team')
        
        rankings = []
        
        for enrollment in enrollments:
            team = enrollment.team
            stats = TeamStats.get_team_overall_stats(team.id, championship_id)
            
            # Calcular pontos (3 vitória, 1 empate)
            points = stats['matches']['wins'] * 3 + stats['matches']['draws']
            
            # Deduzir pontos de penalidades
            penalties_deduction = Penalty.objects.filter(
                target_type='TEAM',
                team=team,
                championship_id=championship_id,
                status='ACTIVE'
            ).aggregate(total=Coalesce(Sum('points_deducted'), 0))['total']
            
            points -= penalties_deduction
            
            rankings.append({
                'team_id': team.id,
                'team_name': team.name,
                'points': max(0, points),  # Não permitir pontos negativos
                'matches_played': stats['matches']['total'],
                'wins': stats['matches']['wins'],
                'draws': stats['matches']['draws'],
                'losses': stats['matches']['losses'],
                'goals_scored': stats['goals']['scored'],
                'goals_conceded': stats['goals']['conceded'],
                'goal_difference': stats['goals']['difference'],
                'penalties_deducted': penalties_deduction
            })
        
        # Ordenar por pontos, saldo de gols, gols marcados
        rankings.sort(
            key=lambda x: (-x['points'], -x['goal_difference'], -x['goals_scored'])
        )
        
        # Adicionar posição
        for i, ranking in enumerate(rankings, 1):
            ranking['position'] = i
        
        return rankings


class MatchStats:
    """Estatísticas de partidas."""
    
    @staticmethod
    def get_match_detailed_stats(match_id):
        """
        Estatísticas detalhadas de uma partida específica.
        
        Args:
            match_id: ID da partida
        
        Returns:
            dict: Estatísticas detalhadas
        """
        try:
            match = Match.objects.get(id=match_id)
        except Match.DoesNotExist:
            return None
        
        # Gols
        goals = Goal.objects.filter(match=match).select_related('scorer', 'team')
        home_goals = goals.filter(team=match.home_team)
        away_goals = goals.filter(team=match.away_team)
        
        # Cartões
        cards = Card.objects.filter(match=match).select_related('player')
        home_cards = cards.filter(
            Q(match__home_team=match.home_team) |
            Q(player__user__in=match.home_team.members.values('user'))
        )
        away_cards = cards.filter(
            Q(match__away_team=match.away_team) |
            Q(player__user__in=match.away_team.members.values('user'))
        )
        
        return {
            'match_id': match.id,
            'home_team': {
                'id': match.home_team.id,
                'name': match.home_team.name,
                'score': match.home_score,
                'goals': list(home_goals.values(
                    'scorer__player_name',
                    'minute',
                    'goal_type'
                )),
                'cards': {
                    'yellow': home_cards.filter(card_type='YELLOW').count(),
                    'red': home_cards.filter(card_type='RED').count()
                }
            },
            'away_team': {
                'id': match.away_team.id,
                'name': match.away_team.name,
                'score': match.away_score,
                'goals': list(away_goals.values(
                    'scorer__player_name',
                    'minute',
                    'goal_type'
                )),
                'cards': {
                    'yellow': away_cards.filter(card_type='YELLOW').count(),
                    'red': away_cards.filter(card_type='RED').count()
                }
            },
            'total_goals': goals.count(),
            'total_cards': cards.count()
        }


class ChampionshipStats:
    """Estatísticas de campeonatos."""
    
    @staticmethod
    def get_championship_overview(championship_id):
        """
        Visão geral das estatísticas do campeonato.
        
        Args:
            championship_id: ID do campeonato
        
        Returns:
            dict: Estatísticas gerais do campeonato
        """
        matches = Match.objects.filter(
            championship_id=championship_id,
            status='FINISHED'
        )
        
        total_matches = matches.count()
        total_goals = Goal.objects.filter(
            match__championship_id=championship_id,
            match__status='FINISHED'
        ).count()
        
        total_cards = Card.objects.filter(
            match__championship_id=championship_id,
            match__status='FINISHED'
        ).count()
        
        yellow_cards = Card.objects.filter(
            match__championship_id=championship_id,
            match__status='FINISHED',
            card_type='YELLOW'
        ).count()
        
        red_cards = Card.objects.filter(
            match__championship_id=championship_id,
            match__status='FINISHED',
            card_type='RED'
        ).count()
        
        # Médias
        avg_goals_per_match = total_goals / total_matches if total_matches > 0 else 0
        avg_cards_per_match = total_cards / total_matches if total_matches > 0 else 0
        
        # Top artilheiro
        top_scorer = PlayerStats.get_top_scorers(championship_id, limit=1)
        top_assister = PlayerStats.get_top_assisters(championship_id, limit=1)
        
        return {
            'championship_id': championship_id,
            'matches_played': total_matches,
            'goals': {
                'total': total_goals,
                'average_per_match': round(avg_goals_per_match, 2)
            },
            'cards': {
                'total': total_cards,
                'yellow': yellow_cards,
                'red': red_cards,
                'average_per_match': round(avg_cards_per_match, 2)
            },
            'top_scorer': top_scorer[0] if top_scorer else None,
            'top_assister': top_assister[0] if top_assister else None
        }
