"""
Serviços para gerenciamento automático de penalidades.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Card, Match, Penalty
from fnc_championships.models import Championship


def apply_automatic_card_penalty(card):
    """
    Aplica penalidade automática baseada em cartões.
    
    Regras:
    - Cartão Vermelho: 1 jogo de suspensão
    - 2 Cartões Amarelos no mesmo jogo: 1 jogo de suspensão  
    - 3 Cartões Amarelos acumulados: 1 jogo de suspensão
    - 5 Cartões Amarelos acumulados: 2 jogos de suspensão
    """
    from django.db.models import Count, Q
    
    player = card.player
    match = card.match
    championship = match.championship
    
    if not championship:
        return None
    
    # Cartão Vermelho Direto
    if card.card_type == 'RED':
        penalty, created = Penalty.objects.get_or_create(
            target_type='PLAYER',
            player=player,
            match=match,
            championship=championship,
            penalty_type='RED_CARD',
            defaults={
                'reason': f'Cartão vermelho recebido na partida {match}',
                'games_suspended': 1,
                'status': 'ACTIVE'
            }
        )
        return penalty
    
    # Cartão Amarelo
    elif card.card_type == 'YELLOW':
        # Verificar se já tem 2 amarelos no mesmo jogo (vermelho indireto)
        yellows_in_match = Card.objects.filter(
            player=player,
            match=match,
            card_type='YELLOW'
        ).count()
        
        if yellows_in_match >= 2:
            penalty, created = Penalty.objects.get_or_create(
                target_type='PLAYER',
                player=player,
                match=match,
                championship=championship,
                penalty_type='YELLOW_CARD',
                defaults={
                    'reason': f'2 cartões amarelos na partida {match}',
                    'games_suspended': 1,
                    'status': 'ACTIVE'
                }
            )
            if created:
                return penalty
        
        # Verificar cartões amarelos acumulados no campeonato
        # Contar apenas cartões de partidas finalizadas
        total_yellows = Card.objects.filter(
            player=player,
            match__championship=championship,
            match__status='FINISHED',
            card_type='YELLOW'
        ).count()
        
        # 3 amarelos = 1 jogo
        if total_yellows == 3:
            # Verificar se já não foi aplicada penalidade por 3 amarelos
            existing = Penalty.objects.filter(
                target_type='PLAYER',
                player=player,
                championship=championship,
                penalty_type='YELLOW_CARD',
                reason__contains='3 cartões amarelos'
            ).exists()
            
            if not existing:
                penalty = Penalty.objects.create(
                    target_type='PLAYER',
                    player=player,
                    championship=championship,
                    penalty_type='YELLOW_CARD',
                    reason=f'3 cartões amarelos acumulados no campeonato {championship.name}',
                    games_suspended=1,
                    status='ACTIVE'
                )
                return penalty
        
        # 5 amarelos = 2 jogos
        elif total_yellows == 5:
            existing = Penalty.objects.filter(
                target_type='PLAYER',
                player=player,
                championship=championship,
                penalty_type='YELLOW_CARD',
                reason__contains='5 cartões amarelos'
            ).exists()
            
            if not existing:
                penalty = Penalty.objects.create(
                    target_type='PLAYER',
                    player=player,
                    championship=championship,
                    penalty_type='YELLOW_CARD',
                    reason=f'5 cartões amarelos acumulados no campeonato {championship.name}',
                    games_suspended=2,
                    status='ACTIVE'
                )
                return penalty
    
    return None


def apply_walkover_penalty(match, walkover_team):
    """
    Aplica penalidade automática por Walk-Over.
    
    Penalidade: 1 ponto de dedução + advertência
    """
    championship = match.championship
    
    if not championship:
        return None
    
    penalty, created = Penalty.objects.get_or_create(
        target_type='TEAM',
        team=walkover_team,
        match=match,
        championship=championship,
        penalty_type='WALKOVER',
        defaults={
            'reason': f'Walk-Over declarado na partida {match}',
            'points_deducted': 1,
            'status': 'ACTIVE'
        }
    )
    
    return penalty


def apply_no_show_penalty(match, team):
    """
    Aplica penalidade por não comparecimento.
    
    Penalidade: 2 pontos de dedução + multa de R$ 500
    """
    championship = match.championship
    
    if not championship:
        return None
    
    penalty, created = Penalty.objects.get_or_create(
        target_type='TEAM',
        team=team,
        match=match,
        championship=championship,
        penalty_type='NO_SHOW',
        defaults={
            'reason': f'Não comparecimento na partida {match}',
            'points_deducted': 2,
            'fine_amount': 500.00,
            'status': 'ACTIVE'
        }
    )
    
    return penalty


def check_player_suspension(player, championship):
    """
    Verifica se um jogador está suspenso em determinado campeonato.
    
    Returns:
        tuple: (is_suspended: bool, penalties: QuerySet)
    """
    from django.db.models import F
    
    active_suspensions = Penalty.objects.filter(
        target_type='PLAYER',
        player=player,
        championship=championship,
        status='ACTIVE',
        games_suspended__gt=F('games_served')
    )
    
    is_suspended = active_suspensions.exists()
    
    return is_suspended, active_suspensions


def check_team_suspension(team, championship):
    """
    Verifica se um time está suspenso em determinado campeonato.
    
    Returns:
        tuple: (is_suspended: bool, penalties: QuerySet)
    """
    from django.db.models import F
    
    active_suspensions = Penalty.objects.filter(
        target_type='TEAM',
        team=team,
        championship=championship,
        status='ACTIVE',
        games_suspended__gt=F('games_served')
    )
    
    is_suspended = active_suspensions.exists()
    
    return is_suspended, active_suspensions


def increment_suspension_games(match):
    """
    Incrementa jogos cumpridos para todas as suspensões ativas
    dos jogadores/times que participaram da partida.
    
    Deve ser chamado quando uma partida é finalizada.
    """
    from django.db.models import F
    from users.models import PlayerProfile
    
    if match.status != 'FINISHED':
        return
    
    championship = match.championship
    if not championship:
        return
    
    # Buscar todos os jogadores que participaram (goals + cards)
    player_ids = set()
    
    # Jogadores que marcaram gols
    from .models import Goal
    goal_players = Goal.objects.filter(match=match).values_list('scorer_id', flat=True)
    player_ids.update(goal_players)
    
    # Jogadores que receberam cartões
    card_players = Card.objects.filter(match=match).values_list('player_id', flat=True)
    player_ids.update(card_players)
    
    # Incrementar suspensões dos jogadores
    for player_id in player_ids:
        if not player_id:
            continue
            
        active_penalties = Penalty.objects.filter(
            target_type='PLAYER',
            player_id=player_id,
            championship=championship,
            status='ACTIVE',
            games_suspended__gt=F('games_served')
        )
        
        for penalty in active_penalties:
            penalty.increment_games_served()
    
    # Incrementar suspensões dos times
    for team in [match.home_team, match.away_team]:
        active_penalties = Penalty.objects.filter(
            target_type='TEAM',
            team=team,
            championship=championship,
            status='ACTIVE',
            games_suspended__gt=F('games_served')
        )
        
        for penalty in active_penalties:
            penalty.increment_games_served()


# ============================================================================
# SIGNALS - Aplicação automática de penalidades
# ============================================================================

@receiver(post_save, sender=Card)
def auto_apply_card_penalty(sender, instance, created, **kwargs):
    """
    Signal para aplicar penalidade automática quando cartão é criado.
    """
    if created:
        apply_automatic_card_penalty(instance)


@receiver(post_save, sender=Match)
def auto_increment_suspensions(sender, instance, created, **kwargs):
    """
    Signal para incrementar suspensões quando partida é finalizada.
    """
    if not created:
        # Verificar se mudou para FINISHED
        if instance.status == 'FINISHED':
            try:
                old_match = Match.objects.get(pk=instance.pk)
                # Se não estava FINISHED antes, incrementar
                if hasattr(instance, '_old_status') and instance._old_status != 'FINISHED':
                    increment_suspension_games(instance)
            except Match.DoesNotExist:
                pass


# Track status changes
from django.db.models.signals import pre_save

@receiver(pre_save, sender=Match)
def track_match_status(sender, instance, **kwargs):
    """Rastreia mudanças de status da partida."""
    if instance.pk:
        try:
            old_instance = Match.objects.get(pk=instance.pk)
            instance._old_status = old_instance.status
        except Match.DoesNotExist:
            instance._old_status = None
    else:
        instance._old_status = None
