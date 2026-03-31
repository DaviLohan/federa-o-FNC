"""
Serviço para geração automática de partidas em campeonatos formato LEAGUE (Pontos Corridos).
Implementa algoritmo round-robin para garantir que todos os times joguem entre si.
"""
from datetime import datetime, timedelta
from typing import List, Tuple
from django.db import transaction
from fnc_championships.models import Championship, ChampionshipEnrollment
from fnc_matches.models import Match
from fnc_teams.models import Team


class LeagueMatchGenerator:
    """
    Gerador de partidas para campeonatos no formato Liga (pontos corridos).
    
    Utiliza algoritmo round-robin para criar todas as partidas necessárias,
    garantindo que cada time enfrente todos os outros times.
    """
    
    def __init__(self, championship: Championship):
        """
        Inicializa o gerador de partidas.
        
        Args:
            championship: Campeonato no formato LEAGUE
        """
        if championship.championship_type != 'LEAGUE':
            raise ValueError('Este gerador é apenas para campeonatos formato LEAGUE')
        
        self.championship = championship
        self.teams = []
        self.matches = []
    
    def generate(self, days_between_rounds: int = 7, start_date: datetime = None) -> List[Match]:
        """
        Gera todas as partidas do campeonato usando algoritmo round-robin.
        
        Args:
            days_between_rounds: Dias entre cada rodada (padrão: 7 dias/1 semana)
            start_date: Data de início do campeonato (padrão: championship.start_date)
        
        Returns:
            List[Match]: Lista de partidas criadas
        
        Raises:
            ValueError: Se não houver times suficientes
        """
        # Buscar times aprovados
        self.teams = self._get_approved_teams()
        
        if len(self.teams) < 2:
            raise ValueError('É necessário pelo menos 2 times para gerar partidas')
        
        # Data de início
        if start_date is None:
            start_date = self.championship.start_date
        
        # Gerar rodadas usando algoritmo round-robin
        rounds = self._generate_round_robin_schedule()
        
        # Criar objetos Match para cada rodada
        with transaction.atomic():
            self._create_matches(rounds, start_date, days_between_rounds)
        
        return self.matches
    
    def _get_approved_teams(self) -> List[Team]:
        """
        Busca todos os times aprovados no campeonato.
        
        Returns:
            List[Team]: Lista de times aprovados
        """
        enrollments = ChampionshipEnrollment.objects.filter(
            championship=self.championship,
            status='APPROVED'
        ).select_related('team').order_by('enrolled_at')
        
        return [enrollment.team for enrollment in enrollments]
    
    def _generate_round_robin_schedule(self) -> List[List[Tuple[Team, Team]]]:
        """
        Gera o calendário round-robin (todos contra todos).
        
        Algoritmo: Circle Method (Método do Círculo)
        - Fixa um time e rotaciona os outros em sentido horário
        - Garante que cada time jogue exatamente uma vez por rodada
        - Número de rodadas = n-1 (onde n é o número de times)
        - Se n for ímpar, adiciona um "bye" (time fantasma)
        
        Returns:
            List[List[Tuple[Team, Team]]]: Lista de rodadas, onde cada rodada
                                            contém lista de confrontos (time_a, time_b)
        """
        teams = self.teams.copy()
        num_teams = len(teams)
        
        # Se número ímpar de times, adiciona um "bye" (None)
        if num_teams % 2 != 0:
            teams.append(None)
            num_teams += 1
        
        rounds = []
        
        # Número de rodadas = n-1
        for round_num in range(num_teams - 1):
            round_matches = []
            
            # Primeira metade vs segunda metade
            for i in range(num_teams // 2):
                team_a = teams[i]
                team_b = teams[num_teams - 1 - i]
                
                # Pular se algum time é "bye" (None)
                if team_a is not None and team_b is not None:
                    # Alterna mando de campo: rodadas pares = team_a casa, ímpares = team_b casa
                    if round_num % 2 == 0:
                        round_matches.append((team_a, team_b))
                    else:
                        round_matches.append((team_b, team_a))
            
            rounds.append(round_matches)
            
            # Rotaciona times (exceto o primeiro que fica fixo)
            teams = [teams[0]] + [teams[-1]] + teams[1:-1]
        
        return rounds
    
    def _create_matches(
        self,
        rounds: List[List[Tuple[Team, Team]]],
        start_date: datetime,
        days_between_rounds: int
    ) -> None:
        """
        Cria os objetos Match no banco de dados.
        
        Args:
            rounds: Lista de rodadas geradas pelo round-robin
            start_date: Data de início da primeira rodada
            days_between_rounds: Intervalo em dias entre rodadas
        """
        current_date = start_date
        
        for round_number, round_matches in enumerate(rounds, start=1):
            for home_team, away_team in round_matches:
                match = Match.objects.create(
                    championship=self.championship,
                    home_team=home_team,
                    away_team=away_team,
                    match_type='CHAMPIONSHIP',
                    round_number=round_number,
                    scheduled_date=current_date,
                    status='SCHEDULED'
                )
                self.matches.append(match)
            
            # Avançar para próxima rodada
            current_date += timedelta(days=days_between_rounds)
    
    def get_schedule_summary(self) -> dict:
        """
        Retorna resumo do calendário gerado.
        
        Returns:
            dict: Dicionário com estatísticas do calendário
        """
        if not self.matches:
            return {}
        
        num_teams = len(self.teams)
        num_rounds = (num_teams - 1) if num_teams % 2 == 0 else num_teams
        total_matches = len(self.matches)
        expected_matches = (num_teams * (num_teams - 1)) // 2
        
        return {
            'num_teams': num_teams,
            'num_rounds': num_rounds,
            'total_matches': total_matches,
            'expected_matches': expected_matches,
            'matches_per_round': total_matches / num_rounds if num_rounds > 0 else 0,
            'first_match_date': self.matches[0].scheduled_date if self.matches else None,
            'last_match_date': self.matches[-1].scheduled_date if self.matches else None,
        }


# ========== Funções utilitárias ==========

def generate_league_matches(
    championship: Championship,
    days_between_rounds: int = 7,
    start_date: datetime = None
) -> dict:
    """
    Função helper para gerar partidas de campeonato LEAGUE.
    
    Args:
        championship: Campeonato no formato LEAGUE
        days_between_rounds: Dias entre rodadas (padrão: 7)
        start_date: Data de início (padrão: championship.start_date)
    
    Returns:
        dict: Dicionário com matches criadas e resumo
    
    Example:
        >>> result = generate_league_matches(championship)
        >>> print(f"Criadas {len(result['matches'])} partidas em {result['summary']['num_rounds']} rodadas")
    """
    generator = LeagueMatchGenerator(championship)
    matches = generator.generate(days_between_rounds, start_date)
    summary = generator.get_schedule_summary()
    
    return {
        'matches': matches,
        'summary': summary,
        'success': True
    }


def can_generate_league_matches(championship: Championship) -> Tuple[bool, str]:
    """
    Verifica se é possível gerar partidas para o campeonato.
    
    Args:
        championship: Campeonato a ser verificado
    
    Returns:
        Tuple[bool, str]: (pode_gerar, mensagem_erro)
    """
    # Verifica tipo
    if championship.championship_type != 'LEAGUE':
        return False, 'Campeonato não é do tipo LEAGUE'
    
    # Verifica status
    if championship.status != 'OPEN':
        return False, f'Campeonato não está OPEN (status atual: {championship.status})'
    
    # Verifica se já tem partidas
    if Match.objects.filter(championship=championship).exists():
        return False, 'Campeonato já possui partidas geradas'
    
    # Verifica número de times
    approved_count = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    ).count()
    
    if approved_count < 2:
        return False, f'Mínimo de 2 times necessário (aprovados: {approved_count})'
    
    if championship.min_teams and approved_count < championship.min_teams:
        return False, f'Mínimo de {championship.min_teams} times necessário (aprovados: {approved_count})'
    
    return True, 'OK'
