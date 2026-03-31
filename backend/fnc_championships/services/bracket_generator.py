"""
Serviço para geração de chaveamento a partir de grupos.
"""
from typing import List, Dict, Tuple
from django.db import transaction
from django.utils.translation import gettext_lazy as _
from ..models import Championship, Group, GroupStandings, Bracket


class BracketGeneratorService:
    """Serviço para gerar chaveamento de mata-mata a partir dos grupos."""
    
    def __init__(self, championship: Championship):
        self.championship = championship
    
    def can_generate(self) -> Tuple[bool, str]:
        """
        Verifica se o chaveamento pode ser gerado.
        
        Returns:
            Tuple[bool, str]: (pode_gerar, mensagem)
        """
        # Verifica tipo do campeonato
        if self.championship.championship_type != 'GROUPS_KNOCKOUT':
            return False, 'Campeonato não é do tipo Grupos + Mata-Mata'
        
        # Verifica fase atual
        if self.championship.current_phase != 'GROUPS':
            return False, 'Campeonato não está na fase de grupos'
        
        # Verifica se grupos existem
        groups = Group.objects.filter(championship=self.championship)
        if not groups.exists():
            return False, 'Nenhum grupo encontrado para este campeonato'
        
        # Verifica se todos os grupos têm times classificados
        for group in groups:
            qualified_count = GroupStandings.objects.filter(
                group=group,
                qualified=True
            ).count()
            
            expected_qualified = self.championship.qualified_per_group or 2
            if qualified_count < expected_qualified:
                return False, f'Grupo {group.name} não tem times classificados suficientes'
        
        # Verifica se já existe bracket
        if hasattr(self.championship, 'bracket'):
            return False, 'Chaveamento já foi gerado para este campeonato'
        
        return True, 'OK'
    
    def get_qualified_teams(self) -> List[Dict]:
        """
        Obtém lista de times classificados ordenados por grupo.
        
        Returns:
            List[Dict]: Lista com informações dos times classificados
        """
        groups = Group.objects.filter(
            championship=self.championship
        ).order_by('order')
        
        qualified = []
        
        for group in groups:
            # Obtém times classificados do grupo (top 2 por padrão)
            standings = GroupStandings.objects.filter(
                group=group,
                qualified=True
            ).order_by('position')[:self.championship.qualified_per_group or 2]
            
            for standing in standings:
                qualified.append({
                    'group': group.name,
                    'group_order': group.order,
                    'position': standing.position,
                    'team': standing.team
                })
        
        return qualified
    
    def generate_matchups(self, qualified_teams: List[Dict]) -> List[Dict]:
        """
        Gera os confrontos do chaveamento baseado nos times classificados.
        
        Args:
            qualified_teams: Lista de times classificados
            
        Returns:
            List[Dict]: Lista de confrontos da primeira rodada
        """
        num_groups = self.championship.num_groups
        matchups = []
        
        # Organiza times por grupo e posição
        teams_by_group = {}
        for team_data in qualified_teams:
            group_name = team_data['group']
            if group_name not in teams_by_group:
                teams_by_group[group_name] = {}
            teams_by_group[group_name][team_data['position']] = team_data['team']
        
        group_names = sorted(teams_by_group.keys())
        
        # Gera confrontos baseado no número de grupos
        if num_groups == 2:
            # 4 times total: Semi-finais direto
            A, B = group_names[0], group_names[1]
            matchups = [
                {
                    'team1': teams_by_group[A][1],
                    'team2': teams_by_group[B][2],
                    'round_name': 'Semi-Final'
                },
                {
                    'team1': teams_by_group[B][1],
                    'team2': teams_by_group[A][2],
                    'round_name': 'Semi-Final'
                },
            ]
        
        elif num_groups == 4:
            # 8 times total: Quartas de final
            A, B, C, D = group_names[0], group_names[1], group_names[2], group_names[3]
            matchups = [
                {
                    'team1': teams_by_group[A][1],
                    'team2': teams_by_group[D][2],
                    'round_name': 'Quartas de Final'
                },
                {
                    'team1': teams_by_group[B][1],
                    'team2': teams_by_group[C][2],
                    'round_name': 'Quartas de Final'
                },
                {
                    'team1': teams_by_group[C][1],
                    'team2': teams_by_group[B][2],
                    'round_name': 'Quartas de Final'
                },
                {
                    'team1': teams_by_group[D][1],
                    'team2': teams_by_group[A][2],
                    'round_name': 'Quartas de Final'
                },
            ]
        
        elif num_groups == 8:
            # 16 times total: Oitavas de final
            matchups = [
                {
                    'team1': teams_by_group[group_names[0]][1],
                    'team2': teams_by_group[group_names[7]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[1]][1],
                    'team2': teams_by_group[group_names[6]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[2]][1],
                    'team2': teams_by_group[group_names[5]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[3]][1],
                    'team2': teams_by_group[group_names[4]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[4]][1],
                    'team2': teams_by_group[group_names[3]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[5]][1],
                    'team2': teams_by_group[group_names[2]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[6]][1],
                    'team2': teams_by_group[group_names[1]][2],
                    'round_name': 'Oitavas de Final'
                },
                {
                    'team1': teams_by_group[group_names[7]][1],
                    'team2': teams_by_group[group_names[0]][2],
                    'round_name': 'Oitavas de Final'
                },
            ]
        
        return matchups
    
    @transaction.atomic
    def create_bracket(self) -> Bracket:
        """
        Cria a estrutura do chaveamento e atualiza a fase do campeonato.
        
        Returns:
            Bracket: Objeto do chaveamento criado
        """
        qualified = self.get_qualified_teams()
        matchups = self.generate_matchups(qualified)
        
        # Constrói estrutura de rodadas
        rounds = []
        round_num = 1
        
        # Primeira rodada com os confrontos dos classificados
        first_round_matches = []
        for matchup in matchups:
            team1 = matchup['team1']
            team2 = matchup['team2']
            
            match_data = {
                'match_id': None,
                'team1': {
                    'id': team1.id,
                    'name': team1.name,
                    'abbreviation': team1.abbreviation,
                    'logo': team1.logo.url if team1.logo else None
                },
                'team2': {
                    'id': team2.id,
                    'name': team2.name,
                    'abbreviation': team2.abbreviation,
                    'logo': team2.logo.url if team2.logo else None
                },
                'winner': None,
                'score': None
            }
            first_round_matches.append(match_data)
        
        first_round = {
            'round_number': round_num,
            'round_name': matchups[0]['round_name'],
            'matches': first_round_matches
        }
        rounds.append(first_round)
        
        # Gera rodadas subsequentes (times TBD)
        num_matches = len(matchups)
        while num_matches > 1:
            num_matches = num_matches // 2
            round_num += 1
            
            # Define nome da rodada
            if num_matches == 1:
                round_name = 'Final'
            elif num_matches == 2:
                round_name = 'Semi-Final'
            elif num_matches == 4:
                round_name = 'Quartas de Final'
            elif num_matches == 8:
                round_name = 'Oitavas de Final'
            else:
                round_name = f'Rodada {round_num}'
            
            rounds.append({
                'round_number': round_num,
                'round_name': round_name,
                'matches': [
                    {
                        'match_id': None,
                        'team1': None,
                        'team2': None,
                        'winner': None,
                        'score': None
                    } for _ in range(num_matches)
                ]
            })
        
        # Adiciona disputa de 3º lugar se habilitada
        if self.championship.has_third_place_match:
            rounds.append({
                'round_number': round_num + 1,
                'round_name': 'Disputa de 3º Lugar',
                'matches': [{
                    'match_id': None,
                    'team1': None,
                    'team2': None,
                    'winner': None,
                    'score': None
                }]
            })
        
        # Cria o bracket no banco de dados
        bracket = Bracket.objects.create(
            championship=self.championship,
            structure={'rounds': rounds}
        )
        
        # Atualiza fase do campeonato
        self.championship.current_phase = 'KNOCKOUT'
        self.championship.save(update_fields=['current_phase'])
        
        return bracket
