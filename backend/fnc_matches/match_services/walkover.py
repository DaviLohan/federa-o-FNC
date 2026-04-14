"""
Serviço para gerenciamento de Walk-Over (WO) em partidas.

Walk-Over (WO) ocorre quando um time não comparece à partida,
resultando em vitória automática para o adversário (geralmente 3x0).
"""
from typing import Tuple, Optional
from django.db import transaction
from django.utils import timezone
from fnc_matches.models import Match
from fnc_teams.models import Team


class WalkOverService:
    """
    Serviço para declarar Walk-Over (WO) em partidas.
    
    Um WO pode ser declarado quando:
    - Um time não comparece à partida agendada
    - Um time desiste antes da partida
    - Admin declara WO manualmente
    """
    
    # Placar padrão para WO
    DEFAULT_WO_SCORE = 3
    
    def __init__(self, match: Match):
        """
        Inicializa o serviço de WO.
        
        Args:
            match: Partida em que o WO será aplicado
        """
        self.match = match
    
    def can_declare_wo(self) -> Tuple[bool, str]:
        """
        Verifica se é possível declarar WO para a partida.
        
        Returns:
            Tuple[bool, str]: (pode_declarar, mensagem_erro)
        """
        # Verifica se a partida já foi finalizada
        if self.match.status == 'FINISHED':
            return False, 'Partida já foi finalizada normalmente'
        
        # Verifica se a partida foi cancelada
        if self.match.status == 'CANCELLED':
            return False, 'Partida já foi cancelada'
        
        # Verifica se já tem resultado registrado (não WO)
        if self.match.home_score > 0 or self.match.away_score > 0:
            return False, 'Partida já possui placar registrado'
        
        return True, 'OK'
    
    @transaction.atomic
    def declare_wo_home_team(self, reason: str = '') -> dict:
        """
        Declara WO contra o time da casa (home team não compareceu).
        Time visitante vence por WO.
        
        Args:
            reason: Motivo do WO (opcional)
        
        Returns:
            dict: Resultado da operação com success, message, winner, score
        
        Raises:
            ValueError: Se não for possível declarar WO
        """
        can_declare, error_msg = self.can_declare_wo()
        if not can_declare:
            return {
                'success': False,
                'message': error_msg
            }
        
        # Time visitante vence por WO
        self.match.home_score = 0
        self.match.away_score = self.DEFAULT_WO_SCORE
        self.match.status = 'FINISHED'
        self.match.finished_at = timezone.now()
        self.match.is_walkover = True
        self.match.walkover_team_id = self.match.home_team.id
        self.match.walkover_reason = reason or f'Time {self.match.home_team.name} não compareceu'
        self.match.save()
        
        # Atualizar estatísticas
        # Import here to avoid circular dependency
        import fnc_matches.services as match_services
        match_services.update_player_statistics(self.match)
        match_services.update_team_statistics(self.match)
        match_services.update_team_performance(self.match)
        match_services.update_standings(self.match)
        match_services.update_top_scorers(self.match)
        
        return {
            'success': True,
            'message': f'WO declarado. {self.match.away_team.name} vence por WO.',
            'winner': self.match.away_team,
            'score': f'{self.match.home_score}x{self.match.away_score}'
        }
    
    @transaction.atomic
    def declare_wo_away_team(self, reason: str = '') -> dict:
        """
        Declara WO contra o time visitante (away team não compareceu).
        Time da casa vence por WO.
        
        Args:
            reason: Motivo do WO (opcional)
        
        Returns:
            dict: Resultado da operação com success, message, winner, score
        
        Raises:
            ValueError: Se não for possível declarar WO
        """
        can_declare, error_msg = self.can_declare_wo()
        if not can_declare:
            return {
                'success': False,
                'message': error_msg
            }
        
        # Time da casa vence por WO
        self.match.home_score = self.DEFAULT_WO_SCORE
        self.match.away_score = 0
        self.match.status = 'FINISHED'
        self.match.finished_at = timezone.now()
        self.match.is_walkover = True
        self.match.walkover_team_id = self.match.away_team.id
        self.match.walkover_reason = reason or f'Time {self.match.away_team.name} não compareceu'
        self.match.save()
        
        # Atualizar estatísticas
        import fnc_matches.services as match_services
        match_services.update_player_statistics(self.match)
        match_services.update_team_statistics(self.match)
        match_services.update_team_performance(self.match)
        match_services.update_standings(self.match)
        match_services.update_top_scorers(self.match)
        
        return {
            'success': True,
            'message': f'WO declarado. {self.match.home_team.name} vence por WO.',
            'winner': self.match.home_team,
            'score': f'{self.match.home_score}x{self.match.away_score}'
        }
    
    @transaction.atomic
    def declare_wo(self, team: Team, reason: str = '') -> dict:
        """
        Declara WO contra um time específico.
        
        Args:
            team: Time que não compareceu / recebeu WO
            reason: Motivo do WO
        
        Returns:
            dict: Resultado da operação
        
        Raises:
            ValueError: Se o time não faz parte da partida
        """
        # Verifica qual time é
        if team.id == self.match.home_team.id:
            return self.declare_wo_home_team(reason)
        elif team.id == self.match.away_team.id:
            return self.declare_wo_away_team(reason)
        else:
            return {
                'success': False,
                'message': 'Time não faz parte desta partida'
            }
    
    @transaction.atomic
    def cancel_match(self, reason: str = '') -> dict:
        """
        Cancela a partida sem declarar WO.
        
        Args:
            reason: Motivo do cancelamento
        
        Returns:
            dict: Resultado da operação
        """
        if self.match.status == 'FINISHED':
            return {
                'success': False,
                'message': 'Não é possível cancelar partida já finalizada'
            }
        
        self.match.status = 'CANCELLED'
        self.match.cancelled_at = timezone.now()
        self.match.cancelled_reason = reason or 'Partida cancelada pela administração'
        self.match.save()
        
        return {
            'success': True,
            'message': 'Partida cancelada com sucesso'
        }


# ========== Funções utilitárias ==========

def declare_walkover(
    match: Match,
    team_not_present: Team,
    reason: str = ''
) -> dict:
    """
    Função helper para declarar WO.
    
    Args:
        match: Partida
        team_not_present: Time que não compareceu
        reason: Motivo do WO
    
    Returns:
        dict: Resultado com success, message, winner, score
    
    Example:
        >>> match = Match.objects.get(id=1)
        >>> team = match.home_team
        >>> result = declare_walkover(match, team, "Time não compareceu")
        >>> if result['success']:
        >>>     print(f"Winner: {result['winner'].name}")
    """
    service = WalkOverService(match)
    return service.declare_wo(team_not_present, reason)


def auto_detect_walkover(match: Match) -> Optional[Match]:
    """
    Detecta automaticamente se uma partida deveria ser WO.
    
    Critérios:
    - Partida agendada passou há mais de 24 horas
    - Status ainda é SCHEDULED
    - Nenhum placar registrado
    
    Args:
        match: Partida a ser verificada
    
    Returns:
        Optional[Match]: Match se WO foi declarado, None caso contrário
    
    Note:
        Esta função NÃO declara WO automaticamente, apenas detecta.
        O admin deve confirmar manualmente.
    """
    from datetime import timedelta
    
    now = timezone.now()
    grace_period = timedelta(hours=24)
    
    # Verifica se passou o prazo
    if match.status == 'SCHEDULED' and match.scheduled_date < (now - grace_period):
        # Partida atrasada mais de 24h
        if match.home_score == 0 and match.away_score == 0:
            # Nenhum placar registrado
            return match
    
    return None


def get_matches_pending_wo(championship=None) -> list:
    """
    Retorna lista de partidas que podem precisar de WO.
    
    Args:
        championship: Filtrar por campeonato (opcional)
    
    Returns:
        list[Match]: Lista de partidas suspeitas de WO
    """
    from datetime import timedelta
    
    now = timezone.now()
    grace_period = timedelta(hours=24)
    cutoff_date = now - grace_period
    
    queryset = Match.objects.filter(
        status='SCHEDULED',
        scheduled_date__lt=cutoff_date,
        home_score=0,
        away_score=0
    ).select_related('home_team', 'away_team', 'championship')
    
    if championship:
        queryset = queryset.filter(championship=championship)
    
    return list(queryset)
