#!/usr/bin/env python
"""
Script aprimorado de testes para o sistema FNC Championship
Cria dados massivos para testes completos:
- 220+ jogadores com nomes brasileiros realistas
- 16 novos times com 15 jogadores cada
- 7 novos campeonatos (4 LEAGUE, 3 KNOCKOUT)
- Estatísticas completas (gols, assistências, cartões)
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal
import random

# Setup Django
sys.path.insert(0, '/home/davilohan/projects/FNC/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from users.models import User, PlayerProfile
from fnc_teams.models import Team, TeamMembership
from fnc_championships.models import Championship, ChampionshipEnrollment, Standings
from fnc_matches.models import Match, Goal, Assist, Card
from django.utils import timezone
from django.db import transaction

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    MAGENTA = '\033[95m'
    END = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text.center(80)}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'='*80}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.CYAN}ℹ {text}{Colors.END}")

def print_stats(text):
    print(f"{Colors.MAGENTA}📊 {text}{Colors.END}")

# ============================================================================
# GERAÇÃO DE NOMES BRASILEIROS REALISTAS
# ============================================================================

FIRST_NAMES = [
    'João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Felipe', 
    'Bruno', 'Guilherme', 'Thiago', 'Rodrigo', 'Diego', 'André', 'Fernando',
    'Marcelo', 'Carlos', 'Daniel', 'Eduardo', 'Leandro', 'Ricardo',
    'Vinícius', 'Gustavo', 'Leonardo', 'Henrique', 'Caio', 'Fábio',
    'Alexandre', 'Renato', 'Paulo', 'Roberto', 'Júlio', 'César',
    'Antônio', 'José', 'Marcos', 'Igor', 'Murilo', 'Otávio', 'Raul',
    'Victor', 'Wesley', 'Yuri', 'Wallace', 'Edson', 'Neymar', 'Cristiano',
    'Ronaldo', 'Romário', 'Kaká', 'Rivaldo', 'Zico', 'Sócrates', 'Falcão'
]

LAST_NAMES = [
    'Silva', 'Santos', 'Oliveira', 'Costa', 'Souza', 'Lima', 'Pereira',
    'Ferreira', 'Rodrigues', 'Alves', 'Nascimento', 'Araújo', 'Carvalho',
    'Ribeiro', 'Martins', 'Rocha', 'Mendes', 'Barbosa', 'Cardoso', 'Dias',
    'Fernandes', 'Gomes', 'Castro', 'Cavalcanti', 'Monteiro', 'Teixeira',
    'Moreira', 'Correia', 'Soares', 'Freitas', 'Nunes', 'Campos',
    'Vieira', 'Batista', 'Moura', 'Ramos', 'Farias', 'Melo', 'Barros',
    'Azevedo', 'Machado', 'Lopes', 'Pinto', 'Duarte', 'Miranda', 'Cunha'
]

TEAM_NAMES = [
    'Atlético Vencedor', 'Cruzeiro Digital', 'São Paulo FC Pro',
    'Palmeiras Elite', 'Flamengo Virtual', 'Corinthians Legends',
    'Santos FC Stars', 'Vasco da Gama United', 'Botafogo Campeões',
    'Grêmio Warriors', 'Internacional Fighters', 'Fluminense Masters',
    'Bahia Tricolor', 'Sport Recife Power', 'Ceará Vozão',
    'Fortaleza Leão', 'Athletico Paranaense', 'Coritiba FC',
    'Atlético Mineiro Galo', 'América MG Coelho'
]

CITIES = [
    'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Porto Alegre',
    'Brasília', 'Salvador', 'Fortaleza', 'Curitiba', 'Recife', 'Manaus',
    'Belém', 'Goiânia', 'Campinas', 'São Luís', 'Maceió', 'Natal'
]

# ============================================================================
# FUNÇÃO 1: CRIAR JOGADORES
# ============================================================================

def create_players(count=240):
    """Cria jogadores com nomes brasileiros realistas"""
    print_header("FASE 1: CRIANDO JOGADORES")
    print_info(f"Criando {count} novos jogadores...")
    
    created_players = []
    existing_count = User.objects.filter(user_type='PLAYER').count()
    
    with transaction.atomic():
        for i in range(count):
            # Gerar nome único
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            
            # Email único
            email = f"player{existing_count + i + 1}@fnc.com"
            
            # Verificar se já existe
            if User.objects.filter(email=email).exists():
                continue
            
            # Criar usuário
            platforms = ['PS', 'XBOX', 'PC']
            user = User.objects.create_user(
                email=email,
                password='player123',
                first_name=first_name,
                last_name=last_name,
                user_type='PLAYER',
                platform=random.choice(platforms),
                is_active=True
            )
            
            # Criar perfil de jogador
            positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'CF']
            player = PlayerProfile.objects.create(
                user=user,
                player_name=full_name,
                gamer_tag=f"{first_name.lower()}{random.randint(10, 99)}",
                primary_position=random.choice(positions),
                shirt_number=random.randint(1, 99)
            )
            
            created_players.append(player)
            
            if (i + 1) % 50 == 0:
                print_success(f"  Criados {i + 1}/{count} jogadores...")
    
    print_success(f"✓ {len(created_players)} jogadores criados com sucesso!")
    print_stats(f"Total de jogadores no sistema: {PlayerProfile.objects.count()}")
    
    return created_players

# ============================================================================
# FUNÇÃO 2: CRIAR TIMES
# ============================================================================

def create_teams(count=16, players_per_team=15):
    """Cria times com jogadores distribuídos"""
    print_header("FASE 2: CRIANDO TIMES")
    print_info(f"Criando {count} novos times com {players_per_team} jogadores cada...")
    
    # Pegar todos os jogadores disponíveis
    all_players = list(PlayerProfile.objects.all())
    random.shuffle(all_players)
    
    # Pegar dono padrão (admin)
    owner = User.objects.filter(user_type='ADMIN').first()
    if not owner:
        owner = User.objects.filter(user_type='TEAM_OWNER').first()
    
    existing_teams_count = Team.objects.count()
    created_teams = []
    player_index = 0
    
    with transaction.atomic():
        for i in range(count):
            team_name = TEAM_NAMES[i] if i < len(TEAM_NAMES) else f"Time Virtual {existing_teams_count + i + 1}"
            abbreviation = ''.join([word[0] for word in team_name.split()[:3]]).upper()
            
            # Verificar se já existe
            if Team.objects.filter(name=team_name).exists():
                print_warning(f"  Time '{team_name}' já existe, pulando...")
                continue
            
            # Criar time
            team = Team.objects.create(
                name=team_name,
                abbreviation=abbreviation[:4],
                owner=owner,
                description=f"Time virtual de {random.choice(CITIES)}"
            )
            
            # Adicionar jogadores ao time
            players_added = 0
            while players_added < players_per_team and player_index < len(all_players):
                player = all_players[player_index]
                player_index += 1
                
                # Verificar se jogador já está em um time
                if TeamMembership.objects.filter(player=player, is_active=True).exists():
                    continue
                
                # Adicionar ao time
                TeamMembership.objects.create(
                    team=team,
                    player=player,
                    role='PLAYER',
                    is_active=True
                )
                players_added += 1
            
            created_teams.append(team)
            print_success(f"  ✓ {team.name} criado com {players_added} jogadores")
    
    print_success(f"\n✓ {len(created_teams)} times criados com sucesso!")
    print_stats(f"Total de times no sistema: {Team.objects.count()}")
    
    return created_teams

# ============================================================================
# FUNÇÃO 3: CRIAR CAMPEONATOS
# ============================================================================

def create_championships():
    """Cria 7 novos campeonatos (4 LEAGUE, 3 KNOCKOUT)"""
    print_header("FASE 3: CRIANDO CAMPEONATOS")
    print_info("Criando 7 novos campeonatos (4 LEAGUE, 3 KNOCKOUT)...")
    
    admin = User.objects.filter(user_type='ADMIN').first()
    
    championships_data = [
        # 2 LEAGUE FINALIZADOS
        {
            'name': 'Brasileirão Virtual 2025',
            'type': 'LEAGUE',
            'status': 'FINISHED',
            'description': 'Campeonato Brasileiro virtual completo com pontos corridos',
            'prize_pool': Decimal('2000.00')
        },
        {
            'name': 'Champions Cup Brazil',
            'type': 'LEAGUE',
            'status': 'FINISHED',
            'description': 'Copa dos campeões brasileiros em formato de liga',
            'prize_pool': Decimal('1500.00')
        },
        # 2 LEAGUE EM PROGRESSO
        {
            'name': 'Liga Nacional FNC 2026',
            'type': 'LEAGUE',
            'status': 'IN_PROGRESS',
            'description': 'Liga nacional com os melhores times do país',
            'prize_pool': Decimal('3000.00')
        },
        {
            'name': 'Campeonato Estadual Virtual',
            'type': 'LEAGUE',
            'status': 'OPEN',
            'description': 'Campeonato estadual aberto para inscrições',
            'prize_pool': Decimal('1000.00')
        },
        # 1 KNOCKOUT FINALIZADO
        {
            'name': 'Copa Libertadores Virtual 2025',
            'type': 'KNOCKOUT',
            'status': 'FINISHED',
            'description': 'A maior competição da América do Sul em formato mata-mata',
            'prize_pool': Decimal('5000.00')
        },
        # 2 KNOCKOUT EM PROGRESSO
        {
            'name': 'Mundial de Clubes 2026',
            'type': 'KNOCKOUT',
            'status': 'IN_PROGRESS',
            'description': 'Torneio mundial eliminatório entre os melhores clubes',
            'prize_pool': Decimal('10000.00')
        },
        {
            'name': 'Copa América Digital',
            'type': 'KNOCKOUT',
            'status': 'OPEN',
            'description': 'Torneio continental em formato mata-mata',
            'prize_pool': Decimal('4000.00')
        },
    ]
    
    created_championships = []
    
    with transaction.atomic():
        for data in championships_data:
            champ, created = Championship.objects.get_or_create(
                name=data['name'],
                defaults={
                    'description': data['description'],
                    'rules': 'Regras oficiais FIFA/eFootball 2026',
                    'championship_type': data['type'],
                    'enrollment_start': timezone.now() - timedelta(days=30),
                    'enrollment_end': timezone.now() + timedelta(days=7) if data['status'] == 'OPEN' else timezone.now() - timedelta(days=15),
                    'start_date': timezone.now() - timedelta(days=20) if data['status'] in ['FINISHED', 'IN_PROGRESS'] else timezone.now() + timedelta(days=10),
                    'end_date': timezone.now() - timedelta(days=1) if data['status'] == 'FINISHED' else None,
                    'enrollment_fee': Decimal('100.00'),
                    'prize_pool': data['prize_pool'],
                    'max_teams': 16 if data['type'] == 'LEAGUE' else 8,
                    'min_teams': 8 if data['type'] == 'LEAGUE' else 4,
                    'status': data['status'],
                    'created_by': admin
                }
            )
            
            if created:
                created_championships.append(champ)
                status_icon = '🏁' if champ.status == 'FINISHED' else ('⚽' if champ.status == 'IN_PROGRESS' else '📋')
                print_success(f"  {status_icon} {champ.name} ({champ.championship_type}) - {champ.status}")
            else:
                print_warning(f"  ⚠ {data['name']} já existe")
    
    print_success(f"\n✓ {len(created_championships)} campeonatos criados!")
    print_stats(f"Total de campeonatos: {Championship.objects.count()}")
    
    return created_championships

# ============================================================================
# FUNÇÃO 4: INSCREVER TIMES NOS CAMPEONATOS
# ============================================================================

def enroll_teams_in_championships():
    """Inscreve times em todos os campeonatos"""
    print_header("FASE 4: INSCREVENDO TIMES NOS CAMPEONATOS")
    
    all_teams = list(Team.objects.all())
    all_championships = Championship.objects.all()
    
    total_enrollments = 0
    
    with transaction.atomic():
        for championship in all_championships:
            # Determinar quantos times inscrever
            if championship.championship_type == 'LEAGUE':
                teams_to_enroll = min(12, len(all_teams))
            else:  # KNOCKOUT
                teams_to_enroll = min(8, len(all_teams))
            
            # Embaralhar times e selecionar
            random.shuffle(all_teams)
            selected_teams = all_teams[:teams_to_enroll]
            
            for team in selected_teams:
                enrollment, created = ChampionshipEnrollment.objects.get_or_create(
                    championship=championship,
                    team=team,
                    defaults={
                        'status': 'APPROVED',
                        'payment_status': 'PAID',
                        'approved_at': timezone.now() - timedelta(days=random.randint(1, 20))
                    }
                )
                
                if created:
                    total_enrollments += 1
            
            print_success(f"  ✓ {championship.name}: {teams_to_enroll} times inscritos")
    
    print_success(f"\n✓ Total de inscrições criadas: {total_enrollments}")
    return total_enrollments

# ============================================================================
# FUNÇÃO 5: ATUALIZAR STANDINGS
# ============================================================================

def update_standings_for_match(championship, match):
    """Atualiza a classificação após uma partida finalizada"""
    if match.status != 'FINISHED':
        return
    
    # Pegar ou criar standings
    home_standing, _ = Standings.objects.get_or_create(
        championship=championship,
        team=match.home_team,
        defaults={'matches_played': 0, 'wins': 0, 'draws': 0, 'losses': 0,
                  'goals_for': 0, 'goals_against': 0, 'points': 0}
    )
    
    away_standing, _ = Standings.objects.get_or_create(
        championship=championship,
        team=match.away_team,
        defaults={'matches_played': 0, 'wins': 0, 'draws': 0, 'losses': 0,
                  'goals_for': 0, 'goals_against': 0, 'points': 0}
    )
    
    # Atualizar estatísticas
    home_standing.matches_played += 1
    away_standing.matches_played += 1
    
    home_standing.goals_for += match.home_score
    home_standing.goals_against += match.away_score
    
    away_standing.goals_for += match.away_score
    away_standing.goals_against += match.home_score
    
    # Determinar resultado
    if match.home_score > match.away_score:
        home_standing.wins += 1
        home_standing.points += 3
        away_standing.losses += 1
    elif match.away_score > match.home_score:
        away_standing.wins += 1
        away_standing.points += 3
        home_standing.losses += 1
    else:
        home_standing.draws += 1
        away_standing.draws += 1
        home_standing.points += 1
        away_standing.points += 1
    
    home_standing.save()
    away_standing.save()

# ============================================================================
# FUNÇÃO 6: ADICIONAR ESTATÍSTICAS COMPLETAS
# ============================================================================

def add_complete_statistics(match):
    """Adiciona gols com assistências e cartões a uma partida"""
    
    home_players = list(match.home_team.players.filter(teammembership__is_active=True))
    away_players = list(match.away_team.players.filter(teammembership__is_active=True))
    
    if not home_players or not away_players:
        return
    
    goal_types = ['REGULAR', 'PENALTY', 'HEADER', 'FREE_KICK', 'VOLLEY', 'COUNTER_ATTACK']
    
    created_goals = []
    
    # Gols do time da casa
    for i in range(match.home_score):
        scorer = random.choice(home_players)
        minute = random.randint(1, 90)
        
        goal = Goal.objects.create(
            match=match,
            scorer=scorer,
            team=match.home_team,
            minute=minute,
            goal_type=random.choice(goal_types)
        )
        created_goals.append((goal, home_players, scorer))
    
    # Gols do time visitante
    for i in range(match.away_score):
        scorer = random.choice(away_players)
        minute = random.randint(1, 90)
        
        goal = Goal.objects.create(
            match=match,
            scorer=scorer,
            team=match.away_team,
            minute=minute,
            goal_type=random.choice(goal_types)
        )
        created_goals.append((goal, away_players, scorer))
    
    # Adicionar assistências (60% dos gols)
    assists_created = 0
    for goal, team_players, scorer in created_goals:
        if random.random() < 0.6:  # 60% de chance
            # Escolher assistente diferente do goleador
            possible_assisters = [p for p in team_players if p.id != scorer.id]
            if possible_assisters:
                assistant = random.choice(possible_assisters)
                Assist.objects.create(
                    goal=goal,
                    assistant=assistant
                )
                assists_created += 1
    
    # Adicionar cartões (70% das partidas têm cartões)
    if random.random() < 0.7:
        # Cartões amarelos (1-3 por partida)
        yellow_cards = random.randint(1, 3)
        for _ in range(yellow_cards):
            team = random.choice([match.home_team, match.away_team])
            players = home_players if team == match.home_team else away_players
            if players:
                player = random.choice(players)
                Card.objects.create(
                    match=match,
                    player=player,
                    team=team,
                    card_type='YELLOW',
                    minute=random.randint(10, 85),
                    reason=random.choice(['Falta tática', 'Reclamação', 'Jogo perigoso', 'Antidesportivo'])
                )
        
        # Cartões vermelhos (15% de chance)
        if random.random() < 0.15:
            team = random.choice([match.home_team, match.away_team])
            players = home_players if team == match.home_team else away_players
            if players:
                player = random.choice(players)
                Card.objects.create(
                    match=match,
                    player=player,
                    team=team,
                    card_type='RED',
                    minute=random.randint(60, 90),
                    reason=random.choice(['Falta violenta', 'Segundo amarelo', 'Agressão', 'Expulsão direta'])
                )
    
    return len(created_goals), assists_created

# ============================================================================
# FUNÇÃO 7: POPULAR CAMPEONATO LEAGUE
# ============================================================================

def populate_league_championship(championship):
    """Popula um campeonato LEAGUE com partidas e resultados"""
    print_info(f"\n  Populando {championship.name} (LEAGUE)...")
    
    # Pegar times inscritos
    enrollments = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    )
    teams = [e.team for e in enrollments]
    
    if len(teams) < 4:
        print_warning(f"    Apenas {len(teams)} times inscritos, mínimo 4")
        return
    
    # Criar standings para todos os times
    for team in teams:
        Standings.objects.get_or_create(
            championship=championship,
            team=team,
            defaults={
                'matches_played': 0, 'wins': 0, 'draws': 0, 'losses': 0,
                'goals_for': 0, 'goals_against': 0, 'points': 0
            }
        )
    
    # Gerar todas as partidas (turno e returno)
    matches_created = 0
    total_goals = 0
    total_assists = 0
    round_num = 1
    
    with transaction.atomic():
        # Turno
        for i in range(len(teams)):
            for j in range(i + 1, len(teams)):
                match, created = Match.objects.get_or_create(
                    championship=championship,
                    home_team=teams[i],
                    away_team=teams[j],
                    round_number=round_num,
                    defaults={
                        'match_type': 'CHAMPIONSHIP',
                        'scheduled_date': championship.start_date + timedelta(days=round_num * 3),
                        'status': 'FINISHED' if championship.status == 'FINISHED' else 'SCHEDULED'
                    }
                )
                
                if created:
                    matches_created += 1
                    
                    # Se campeonato está finalizado, adicionar resultados
                    if championship.status == 'FINISHED':
                        match.home_score = random.randint(0, 4)
                        match.away_score = random.randint(0, 4)
                        match.started_at = match.scheduled_date
                        match.finished_at = match.scheduled_date + timedelta(minutes=15)
                        match.save()
                        
                        # Adicionar estatísticas
                        goals, assists = add_complete_statistics(match)
                        total_goals += goals
                        total_assists += assists
                        
                        # Atualizar standings
                        update_standings_for_match(championship, match)
                
                round_num += 1
    
    print_success(f"    ✓ {matches_created} partidas criadas")
    if championship.status == 'FINISHED':
        print_stats(f"    📊 {total_goals} gols, {total_assists} assistências")

# ============================================================================
# FUNÇÃO 8: POPULAR CAMPEONATO KNOCKOUT
# ============================================================================

def populate_knockout_championship(championship):
    """Popula um campeonato KNOCKOUT com chaveamento"""
    print_info(f"\n  Populando {championship.name} (KNOCKOUT)...")
    
    # Pegar times inscritos
    enrollments = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    )
    teams = list([e.team for e in enrollments])
    
    if len(teams) < 4:
        print_warning(f"    Apenas {len(teams)} times inscritos, mínimo 4")
        return
    
    # Limitar a 8 times para knockout
    teams = teams[:8]
    random.shuffle(teams)
    
    matches_created = 0
    total_goals = 0
    total_assists = 0
    
    with transaction.atomic():
        # QUARTAS DE FINAL (se tiver 8 times)
        if len(teams) == 8:
            quarter_winners = []
            for i in range(0, 8, 2):
                match, created = Match.objects.get_or_create(
                    championship=championship,
                    home_team=teams[i],
                    away_team=teams[i+1],
                    round_number=1,  # Quartas
                    defaults={
                        'match_type': 'PLAYOFF',
                        'scheduled_date': championship.start_date + timedelta(days=1),
                        'status': 'FINISHED' if championship.status == 'FINISHED' else 'SCHEDULED'
                    }
                )
                
                if created:
                    matches_created += 1
                    
                    if championship.status == 'FINISHED':
                        # Garantir que haja um vencedor
                        match.home_score = random.randint(0, 3)
                        match.away_score = random.randint(0, 3)
                        
                        # Evitar empate
                        if match.home_score == match.away_score:
                            match.home_score += 1
                        
                        match.started_at = match.scheduled_date
                        match.finished_at = match.scheduled_date + timedelta(minutes=15)
                        match.save()
                        
                        goals, assists = add_complete_statistics(match)
                        total_goals += goals
                        total_assists += assists
                        
                        winner = match.home_team if match.home_score > match.away_score else match.away_team
                        quarter_winners.append(winner)
            
            semi_teams = quarter_winners if championship.status == 'FINISHED' else teams[:4]
        else:
            semi_teams = teams[:4]
        
        # SEMIFINAIS
        semi_winners = []
        for i in range(0, 4, 2):
            match, created = Match.objects.get_or_create(
                championship=championship,
                home_team=semi_teams[i],
                away_team=semi_teams[i+1],
                round_number=2,  # Semifinais
                defaults={
                    'match_type': 'PLAYOFF',
                    'scheduled_date': championship.start_date + timedelta(days=7),
                    'status': 'FINISHED' if championship.status == 'FINISHED' else 'SCHEDULED'
                }
            )
            
            if created:
                matches_created += 1
                
                if championship.status == 'FINISHED':
                    match.home_score = random.randint(0, 3)
                    match.away_score = random.randint(0, 3)
                    
                    if match.home_score == match.away_score:
                        match.home_score += 1
                    
                    match.started_at = match.scheduled_date
                    match.finished_at = match.scheduled_date + timedelta(minutes=15)
                    match.save()
                    
                    goals, assists = add_complete_statistics(match)
                    total_goals += goals
                    total_assists += assists
                    
                    winner = match.home_team if match.home_score > match.away_score else match.away_team
                    semi_winners.append(winner)
        
        # FINAL
        if championship.status == 'FINISHED' and len(semi_winners) == 2:
            match, created = Match.objects.get_or_create(
                championship=championship,
                home_team=semi_winners[0],
                away_team=semi_winners[1],
                round_number=3,  # Final
                defaults={
                    'match_type': 'FINAL',
                    'scheduled_date': championship.start_date + timedelta(days=14),
                    'status': 'FINISHED'
                }
            )
            
            if created:
                matches_created += 1
                match.home_score = random.randint(1, 4)
                match.away_score = random.randint(0, 3)
                
                if match.home_score == match.away_score:
                    match.home_score += 1
                
                match.started_at = match.scheduled_date
                match.finished_at = match.scheduled_date + timedelta(minutes=15)
                match.save()
                
                goals, assists = add_complete_statistics(match)
                total_goals += goals
                total_assists += assists
                
                champion = match.home_team if match.home_score > match.away_score else match.away_team
                print_success(f"    🏆 CAMPEÃO: {champion.name}")
    
    print_success(f"    ✓ {matches_created} partidas criadas")
    if championship.status == 'FINISHED':
        print_stats(f"    📊 {total_goals} gols, {total_assists} assistências")
        
        # Gerar bracket para visualização
        generate_bracket_for_knockout(championship)

def generate_bracket_for_knockout(championship):
    """
    Gera objeto Bracket a partir das partidas existentes de um campeonato KNOCKOUT.
    
    Structure esperada:
    {
        "rounds": [
            {
                "round_number": 1,
                "round_name": "Quartas",
                "matches": [
                    {
                        "match_id": 123,
                        "team1": {"id": 1, "name": "Time A", "logo": null},
                        "team2": {"id": 2, "name": "Time B", "logo": null},
                        "score": "2-1",
                        "winner": {"id": 1, "name": "Time A", "logo": null},
                        "status": "FINISHED"
                    }
                ]
            }
        ]
    }
    """
    from fnc_championships.models import Bracket
    from django.db.models import Max
    
    print_info(f"    → Gerando bracket para {championship.name}...")
    
    # Buscar todas as partidas de playoff/final
    matches = Match.objects.filter(
        championship=championship,
        match_type__in=['PLAYOFF', 'FINAL']
    ).select_related('home_team', 'away_team').order_by('round_number', 'id')
    
    if not matches.exists():
        print_warning(f"      ⚠ Nenhuma partida de playoff/final encontrada")
        return None
    
    # Mapear round_number para nomes amigáveis
    total_teams = ChampionshipEnrollment.objects.filter(
        championship=championship,
        status='APPROVED'
    ).count()
    
    round_names = {}
    if total_teams >= 8:
        round_names = {1: 'Quartas de Final', 2: 'Semifinais', 3: 'Final'}
    elif total_teams >= 4:
        round_names = {1: 'Semifinais', 2: 'Final'}
    elif total_teams >= 2:
        round_names = {1: 'Final'}
    else:
        # Genérico para outros tamanhos
        max_round = matches.aggregate(max_round=Max('round_number'))['max_round']
        if max_round:
            for i in range(1, max_round + 1):
                if i == max_round:
                    round_names[i] = 'Final'
                elif i == max_round - 1:
                    round_names[i] = 'Semifinais'
                else:
                    round_names[i] = f'Rodada {i}'
    
    # Agrupar partidas por round
    rounds_dict = {}
    for match in matches:
        round_num = match.round_number
        
        if round_num not in rounds_dict:
            rounds_dict[round_num] = {
                'round_number': round_num,
                'round_name': round_names.get(round_num, f'Rodada {round_num}'),
                'matches': []
            }
        
        # Montar dados da partida
        match_data = {
            'match_id': match.id,
            'team1': {
                'id': match.home_team.id,
                'name': match.home_team.name,
                'logo': match.home_team.logo.url if match.home_team.logo else None
            },
            'team2': {
                'id': match.away_team.id,
                'name': match.away_team.name,
                'logo': match.away_team.logo.url if match.away_team.logo else None
            },
            'status': match.status
        }
        
        # Adicionar placar e vencedor se partida finalizada
        if match.status == 'FINISHED':
            match_data['score'] = f"{match.home_score}-{match.away_score}"
            
            if match.home_score > match.away_score:
                winner = match.home_team
            elif match.away_score > match.home_score:
                winner = match.away_team
            else:
                # Empate - em mata-mata, não deveria acontecer
                winner = None
            
            if winner:
                match_data['winner'] = {
                    'id': winner.id,
                    'name': winner.name,
                    'logo': winner.logo.url if winner.logo else None
                }
        
        rounds_dict[round_num]['matches'].append(match_data)
    
    # Criar estrutura final ordenada por round_number
    structure = {
        'rounds': [rounds_dict[k] for k in sorted(rounds_dict.keys())]
    }
    
    # Criar ou atualizar bracket
    bracket, created = Bracket.objects.update_or_create(
        championship=championship,
        defaults={'structure': structure}
    )
    
    action = "criado" if created else "atualizado"
    print_success(f"      ✓ Bracket {action} com {len(rounds_dict)} rodadas")
    
    return bracket

# ============================================================================
# FUNÇÃO 9: POPULAR TODOS OS CAMPEONATOS
# ============================================================================

def populate_all_championships():
    """Popula todos os campeonatos com partidas"""
    print_header("FASE 5: POPULANDO CAMPEONATOS COM PARTIDAS")
    
    championships = Championship.objects.all()
    
    for championship in championships:
        if championship.championship_type == 'LEAGUE':
            populate_league_championship(championship)
        else:  # KNOCKOUT
            populate_knockout_championship(championship)
    
    print_success("\n✓ Todos os campeonatos populados!")

# ============================================================================
# FUNÇÃO 10: RELATÓRIO FINAL
# ============================================================================

def generate_final_report():
    """Gera relatório final com todas as estatísticas"""
    print_header("RELATÓRIO FINAL - SISTEMA FNC CHAMPIONSHIP")
    
    # Estatísticas gerais
    print_info("📊 ESTATÍSTICAS GERAIS:")
    print(f"  • Total de usuários: {User.objects.count()}")
    print(f"  • Total de jogadores: {PlayerProfile.objects.count()}")
    print(f"  • Total de times: {Team.objects.count()}")
    print(f"  • Total de campeonatos: {Championship.objects.count()}")
    print(f"  • Total de inscrições: {ChampionshipEnrollment.objects.count()}")
    print(f"  • Total de partidas: {Match.objects.count()}")
    print(f"  • Total de gols: {Goal.objects.count()}")
    print(f"  • Total de assistências: {Assist.objects.count()}")
    print(f"  • Total de cartões: {Card.objects.count()}")
    
    # Campeonatos por status
    print_info("\n🏆 CAMPEONATOS POR STATUS:")
    for status in ['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']:
        count = Championship.objects.filter(status=status).count()
        if count > 0:
            emoji = '🏁' if status == 'FINISHED' else ('⚽' if status == 'IN_PROGRESS' else '📋')
            print(f"  {emoji} {status}: {count}")
    
    # Campeonatos por tipo
    print_info("\n📋 CAMPEONATOS POR TIPO:")
    league_count = Championship.objects.filter(championship_type='LEAGUE').count()
    knockout_count = Championship.objects.filter(championship_type='KNOCKOUT').count()
    print(f"  • LEAGUE (Pontos Corridos): {league_count}")
    print(f"  • KNOCKOUT (Mata-Mata): {knockout_count}")
    
    # Artilharia (Top 10)
    print_info("\n⚽ ARTILHEIROS (Top 10):")
    from django.db.models import Count
    top_scorers = Goal.objects.values(
        'scorer__user__first_name',
        'scorer__user__last_name'
    ).annotate(
        total=Count('id')
    ).order_by('-total')[:10]
    
    for idx, scorer in enumerate(top_scorers, 1):
        name = f"{scorer['scorer__user__first_name']} {scorer['scorer__user__last_name']}"
        print(f"  {idx:2d}. {name:<30} - {scorer['total']} gols")
    
    # Assistências (Top 10)
    print_info("\n🎯 ASSISTÊNCIAS (Top 10):")
    top_assisters = Assist.objects.values(
        'assistant__user__first_name',
        'assistant__user__last_name'
    ).annotate(
        total=Count('id')
    ).order_by('-total')[:10]
    
    for idx, assister in enumerate(top_assisters, 1):
        name = f"{assister['assistant__user__first_name']} {assister['assistant__user__last_name']}"
        print(f"  {idx:2d}. {name:<30} - {assister['total']} assistências")
    
    # Times com mais vitórias
    print_info("\n🏅 TIMES COM MAIS VITÓRIAS:")
    from django.db.models import Sum
    top_teams = Standings.objects.values('team__name').annotate(
        total_wins=Sum('wins'),
        total_points=Sum('points')
    ).order_by('-total_wins')[:10]
    
    for idx, team in enumerate(top_teams, 1):
        print(f"  {idx:2d}. {team['team__name']:<30} - {team['total_wins']} vitórias, {team['total_points']} pontos")
    
    # Média de gols por partida
    total_matches = Match.objects.filter(status='FINISHED').count()
    total_goals = Goal.objects.count()
    avg_goals = total_goals / total_matches if total_matches > 0 else 0
    
    print_info("\n📈 ESTATÍSTICAS DE PARTIDAS:")
    print(f"  • Partidas finalizadas: {total_matches}")
    print(f"  • Média de gols por partida: {avg_goals:.2f}")
    print(f"  • Taxa de assistências: {(Assist.objects.count() / total_goals * 100):.1f}%" if total_goals > 0 else "  • Taxa de assistências: 0%")
    
    # Cartões
    yellow_cards = Card.objects.filter(card_type='YELLOW').count()
    red_cards = Card.objects.filter(card_type='RED').count()
    print(f"  • Cartões amarelos: {yellow_cards}")
    print(f"  • Cartões vermelhos: {red_cards}")
    
    print_success("\n" + "="*80)
    print_success("✓ SISTEMA FNC CHAMPIONSHIP - DADOS COMPLETOS!")
    print_success("="*80)
    
    # Instruções finais
    print_info("\n📝 PRÓXIMOS PASSOS:")
    print("  1. Acesse http://localhost:3000")
    print("  2. Login: admin@fnc.com / admin123")
    print("  3. Navegue pelos campeonatos e verifique:")
    print("     • Campeonatos finalizados com estatísticas completas")
    print("     • Classificações atualizadas")
    print("     • Partidas com gols e assistências")
    print("     • Artilharia e rankings")
    print("")

# ============================================================================
# MAIN
# ============================================================================

def main():
    print_header("SISTEMA FNC - GERAÇÃO MASSIVA DE DADOS")
    print(f"{Colors.CYAN}Iniciando criação de dados completos para testes...{Colors.END}\n")
    
    try:
        # Verificar contadores atuais
        print_info("Estado atual do sistema:")
        print(f"  • Jogadores: {PlayerProfile.objects.count()}")
        print(f"  • Times: {Team.objects.count()}")
        print(f"  • Campeonatos: {Championship.objects.count()}")
        print("")
        
        # FASE 1: Criar jogadores
        players = create_players(count=240)
        
        # FASE 2: Criar times
        teams = create_teams(count=16, players_per_team=15)
        
        # FASE 3: Criar campeonatos
        championships = create_championships()
        
        # FASE 4: Inscrever times
        enroll_teams_in_championships()
        
        # FASE 5: Popular campeonatos
        populate_all_championships()
        
        # RELATÓRIO FINAL
        generate_final_report()
        
        print_success(f"\n{Colors.BOLD}🎉 PROCESSO COMPLETO!{Colors.END}\n")
        
    except Exception as e:
        print_error(f"\n✗ Erro durante a geração de dados: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
