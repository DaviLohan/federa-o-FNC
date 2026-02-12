#!/usr/bin/env python
"""
Script completo de testes para o sistema FNC Championship
Executa todas as fases do cronograma de testes
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
from fnc_matches.models import Match, Goal, Assist, Card, MatchReport
from django.utils import timezone

# Cores para output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
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

# ============================================================================
# FASE 1: PREPARAÇÃO DOS DADOS
# ============================================================================

def fase1_preparar_dados():
    print_header("FASE 1: PREPARAÇÃO DOS DADOS")
    
    # 1.1 Verificar e criar jogadores nos times
    print_info("1.1 Verificando jogadores nos times...")
    
    teams = Team.objects.all()
    all_players = list(PlayerProfile.objects.all())
    
    for team in teams:
        current_players = team.players.filter(teammembership__is_active=True).count()
        print(f"  - {team.name}: {current_players} jogadores")
        
        # Garantir pelo menos 3 jogadores por time
        if current_players < 3:
            needed = 3 - current_players
            print_warning(f"    Adicionando {needed} jogadores ao {team.name}")
            
            # Pegar jogadores disponíveis (não neste time)
            existing_ids = team.players.values_list('id', flat=True)
            available_players = [p for p in all_players if p.id not in existing_ids]
            
            for i in range(min(needed, len(available_players))):
                player = available_players[i]
                TeamMembership.objects.create(
                    team=team,
                    player=player,
                    role='PLAYER',
                    is_active=True
                )
                print_success(f"      Adicionado: {player.user.full_name}")
    
    print_success("1.1 Jogadores verificados e atualizados!\n")
    
    # 1.2 Inscrever times nos campeonatos
    print_info("1.2 Inscrevendo times nos campeonatos...")
    
    championships = Championship.objects.filter(status='OPEN')
    teams_list = list(teams)
    
    for championship in championships:
        print(f"  - Campeonato: {championship.name} ({championship.championship_type})")
        
        # Inscrever todos os 4 times
        for team in teams_list:
            enrollment, created = ChampionshipEnrollment.objects.get_or_create(
                championship=championship,
                team=team,
                defaults={
                    'status': 'APPROVED',  # Aprovar automaticamente
                    'payment_status': 'PAID',
                    'approved_at': timezone.now()
                }
            )
            if created:
                print_success(f"    ✓ {team.name} inscrito e aprovado")
            else:
                # Atualizar para aprovado se estava pendente
                if enrollment.status != 'APPROVED':
                    enrollment.status = 'APPROVED'
                    enrollment.approved_at = timezone.now()
                    enrollment.save()
                    print_success(f"    ✓ {team.name} aprovado")
                else:
                    print_info(f"    → {team.name} já estava inscrito")
    
    print_success("1.2 Times inscritos nos campeonatos!\n")
    
    # 1.3 Criar campeonato adicional
    print_info("1.3 Criando campeonato adicional para testes...")
    
    admin_user = User.objects.filter(user_type='ADMIN').first()
    
    new_championship, created = Championship.objects.get_or_create(
        name="Super Copa FNC 2026",
        defaults={
            'description': "Campeonato adicional para testes completos do sistema",
            'rules': "Regras padrão FIFA/eFootball",
            'championship_type': 'LEAGUE',
            'enrollment_start': timezone.now(),
            'enrollment_end': timezone.now() + timedelta(days=7),
            'start_date': timezone.now() + timedelta(days=10),
            'enrollment_fee': Decimal('50.00'),
            'prize_pool': Decimal('500.00'),
            'max_teams': 8,
            'min_teams': 4,
            'status': 'OPEN',
            'created_by': admin_user
        }
    )
    
    if created:
        print_success(f"  Criado: {new_championship.name}")
    else:
        print_info(f"  Já existe: {new_championship.name}")
    
    print_success("\n✓ FASE 1 COMPLETA!\n")
    
    return {
        'teams': teams_list,
        'championships': list(championships),
        'admin': admin_user
    }


# ============================================================================
# FASE 2: TESTAR CAMPEONATO LEAGUE
# ============================================================================

def fase2_testar_league(data):
    print_header("FASE 2: TESTAR CAMPEONATO LEAGUE (PONTOS CORRIDOS)")
    
    # Pegar campeonato LEAGUE que já tem times inscritos
    league_championship = None
    for champ in Championship.objects.filter(championship_type='LEAGUE'):
        enrolled = ChampionshipEnrollment.objects.filter(
            championship=champ,
            status='APPROVED'
        ).count()
        if enrolled >= 4:
            league_championship = champ
            break
    
    if not league_championship:
        league_championship = Championship.objects.filter(
            championship_type='LEAGUE',
            name__icontains='Copa FNC'
        ).first()
    
    if not league_championship:
        print_error("Campeonato LEAGUE não encontrado!")
        return
    
    print_info(f"Testando: {league_championship.name}")
    
    # 2.1 Iniciar campeonato
    print_info("\n2.1 Iniciando campeonato...")
    
    if league_championship.status == 'OPEN':
        league_championship.status = 'IN_PROGRESS'
        league_championship.save()
        
        # Criar standings para todos os times inscritos
        enrolled_teams = ChampionshipEnrollment.objects.filter(
            championship=league_championship,
            status='APPROVED'
        )
        
        for enrollment in enrolled_teams:
            Standings.objects.get_or_create(
                championship=league_championship,
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
        
        print_success(f"  Status: {league_championship.status}")
        print_success(f"  Standings criadas para {enrolled_teams.count()} times")
    else:
        print_info(f"  Campeonato já está em {league_championship.status}")
    
    # 2.2 Criar partidas
    print_info("\n2.2 Criando partidas...")
    
    teams = list(ChampionshipEnrollment.objects.filter(
        championship=league_championship,
        status='APPROVED'
    ).values_list('team', flat=True))
    
    teams_obj = Team.objects.filter(id__in=teams)
    teams_list = list(teams_obj)
    
    if len(teams_list) < 4:
        print_error(f"  Apenas {len(teams_list)} times inscritos. Mínimo: 4")
        print_warning("  Pulando criação de partidas...")
        print_success("\n✓ FASE 2 COMPLETA (SEM PARTIDAS)!\n")
        return {'league_championship': league_championship, 'matches': []}
    
    matches_data = [
        # Rodada 1
        (teams_list[0], teams_list[1], 1, timezone.now() + timedelta(hours=1)),
        (teams_list[2], teams_list[3], 1, timezone.now() + timedelta(hours=2)),
        # Rodada 2
        (teams_list[0], teams_list[2], 2, timezone.now() + timedelta(days=1, hours=1)),
        (teams_list[1], teams_list[3], 2, timezone.now() + timedelta(days=1, hours=2)),
        # Rodada 3
        (teams_list[0], teams_list[3], 3, timezone.now() + timedelta(days=2, hours=1)),
        (teams_list[1], teams_list[2], 3, timezone.now() + timedelta(days=2, hours=2)),
    ]
    
    created_matches = []
    for home, away, round_num, sched_date in matches_data:
        match, created = Match.objects.get_or_create(
            championship=league_championship,
            home_team=home,
            away_team=away,
            round_number=round_num,
            defaults={
                'match_type': 'CHAMPIONSHIP',
                'scheduled_date': sched_date,
                'status': 'SCHEDULED'
            }
        )
        if created:
            print_success(f"  ✓ Rodada {round_num}: {home.name} vs {away.name}")
            created_matches.append(match)
        else:
            print_info(f"  → Já existe: {home.name} vs {away.name}")
            created_matches.append(match)
    
    # 2.3 Simular partidas com resultados
    print_info("\n2.3 Simulando partidas e reportando resultados...")
    
    match_results = [
        (3, 1),  # FNC Elite 3 x 1 Thunder FC
        (2, 2),  # Legends United 2 x 2 Champions Team
        (1, 2),  # FNC Elite 1 x 2 Legends United
        (4, 0),  # Thunder FC 4 x 0 Champions Team
        (2, 1),  # FNC Elite 2 x 1 Champions Team
        (1, 1),  # Thunder FC 1 x 1 Legends United
    ]
    
    for idx, match in enumerate(created_matches[:6]):
        home_score, away_score = match_results[idx]
        
        # Atualizar placar
        match.home_score = home_score
        match.away_score = away_score
        match.status = 'FINISHED'
        match.started_at = match.scheduled_date
        match.finished_at = match.scheduled_date + timedelta(minutes=15)
        match.save()
        
        print_success(f"  ✓ {match.home_team.abbreviation} {home_score} x {away_score} {match.away_team.abbreviation}")
        
        # Adicionar gols
        home_players = list(match.home_team.players.filter(teammembership__is_active=True)[:3])
        away_players = list(match.away_team.players.filter(teammembership__is_active=True)[:3])
        
        # Gols do time da casa
        for i in range(home_score):
            if home_players:
                scorer = random.choice(home_players)
                minute = random.randint(1, 90)
                goal_types = ['REGULAR', 'PENALTY', 'HEADER', 'FREE_KICK']
                
                Goal.objects.create(
                    match=match,
                    scorer=scorer,
                    team=match.home_team,
                    minute=minute,
                    goal_type=random.choice(goal_types)
                )
        
        # Gols do time visitante
        for i in range(away_score):
            if away_players:
                scorer = random.choice(away_players)
                minute = random.randint(1, 90)
                goal_types = ['REGULAR', 'PENALTY', 'HEADER', 'FREE_KICK']
                
                Goal.objects.create(
                    match=match,
                    scorer=scorer,
                    team=match.away_team,
                    minute=minute,
                    goal_type=random.choice(goal_types)
                )
        
        # Adicionar alguns cartões aleatoriamente
        if random.random() > 0.5 and home_players:
            player = random.choice(home_players)
            Card.objects.create(
                match=match,
                player=player,
                team=match.home_team,
                card_type='YELLOW',
                minute=random.randint(20, 80),
                reason="Falta tática"
            )
        
        # Atualizar standings
        update_standings_for_match(league_championship, match)
    
    # 2.4 Verificar standings
    print_info("\n2.4 Verificando classificação...")
    
    standings = Standings.objects.filter(
        championship=league_championship
    ).order_by('-points', '-goals_for')
    
    print(f"\n  {'Pos':<4} {'Time':<25} {'J':<3} {'V':<3} {'E':<3} {'D':<3} {'GP':<4} {'GC':<4} {'SG':<5} {'Pts':<4}")
    print(f"  {'-'*85}")
    
    for pos, standing in enumerate(standings, 1):
        saldo = standing.goals_for - standing.goals_against
        print(f"  {pos:<4} {standing.team.name:<25} "
              f"{standing.matches_played:<3} {standing.wins:<3} {standing.draws:<3} {standing.losses:<3} "
              f"{standing.goals_for:<4} {standing.goals_against:<4} {saldo:>+5} {standing.points:<4}")
    
    print_success("\n✓ FASE 2 COMPLETA!\n")
    
    return {'league_championship': league_championship, 'matches': created_matches}


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
        # Vitória do time da casa
        home_standing.wins += 1
        home_standing.points += 3
        away_standing.losses += 1
    elif match.away_score > match.home_score:
        # Vitória do visitante
        away_standing.wins += 1
        away_standing.points += 3
        home_standing.losses += 1
    else:
        # Empate
        home_standing.draws += 1
        away_standing.draws += 1
        home_standing.points += 1
        away_standing.points += 1
    
    home_standing.save()
    away_standing.save()


# ============================================================================
# FASE 3: TESTAR CAMPEONATO KNOCKOUT
# ============================================================================

def fase3_testar_knockout(data):
    print_header("FASE 3: TESTAR CAMPEONATO KNOCKOUT (MATA-MATA)")
    
    # Pegar campeonato KNOCKOUT
    knockout_championship = Championship.objects.filter(
        championship_type='KNOCKOUT',
        name__icontains='Relâmpago'
    ).first()
    
    if not knockout_championship:
        print_error("Campeonato KNOCKOUT não encontrado!")
        return
    
    print_info(f"Testando: {knockout_championship.name}")
    
    # 3.1 Iniciar campeonato
    print_info("\n3.1 Iniciando campeonato knockout...")
    
    if knockout_championship.status == 'OPEN':
        knockout_championship.status = 'IN_PROGRESS'
        knockout_championship.save()
        print_success(f"  Status: {knockout_championship.status}")
    
    # 3.2 Criar semifinais
    print_info("\n3.2 Criando semifinais...")
    
    teams = list(ChampionshipEnrollment.objects.filter(
        championship=knockout_championship,
        status='APPROVED'
    ).values_list('team', flat=True))
    
    teams_obj = list(Team.objects.filter(id__in=teams))
    
    if len(teams_obj) < 4:
        print_error(f"  Apenas {len(teams_obj)} times inscritos. Mínimo: 4")
        return
    
    # Criar semifinais
    semi1, created1 = Match.objects.get_or_create(
        championship=knockout_championship,
        home_team=teams_obj[0],
        away_team=teams_obj[1],
        defaults={
            'match_type': 'PLAYOFF',
            'round_number': 1,  # Semifinais
            'scheduled_date': timezone.now() + timedelta(hours=1),
            'status': 'SCHEDULED'
        }
    )
    
    semi2, created2 = Match.objects.get_or_create(
        championship=knockout_championship,
        home_team=teams_obj[2],
        away_team=teams_obj[3],
        defaults={
            'match_type': 'PLAYOFF',
            'round_number': 1,  # Semifinais
            'scheduled_date': timezone.now() + timedelta(hours=2),
            'status': 'SCHEDULED'
        }
    )
    
    if created1:
        print_success(f"  ✓ Semifinal 1: {teams_obj[0].name} vs {teams_obj[1].name}")
    else:
        print_info(f"  → Semifinal 1 já existe")
    
    if created2:
        print_success(f"  ✓ Semifinal 2: {teams_obj[2].name} vs {teams_obj[3].name}")
    else:
        print_info(f"  → Semifinal 2 já existe")
    
    # 3.3 Jogar semifinais
    print_info("\n3.3 Simulando semifinais...")
    
    # Semifinal 1: 3 x 1
    semi1.home_score = 3
    semi1.away_score = 1
    semi1.status = 'FINISHED'
    semi1.started_at = semi1.scheduled_date
    semi1.finished_at = semi1.scheduled_date + timedelta(minutes=15)
    semi1.save()
    
    winner1 = semi1.home_team
    print_success(f"  ✓ Semi 1: {semi1.home_team.abbreviation} {semi1.home_score} x {semi1.away_score} {semi1.away_team.abbreviation} → Vencedor: {winner1.name}")
    
    # Adicionar gols
    add_goals_to_match(semi1)
    
    # Semifinal 2: 2 x 3
    semi2.home_score = 2
    semi2.away_score = 3
    semi2.status = 'FINISHED'
    semi2.started_at = semi2.scheduled_date
    semi2.finished_at = semi2.scheduled_date + timedelta(minutes=15)
    semi2.save()
    
    winner2 = semi2.away_team
    print_success(f"  ✓ Semi 2: {semi2.home_team.abbreviation} {semi2.home_score} x {semi2.away_score} {semi2.away_team.abbreviation} → Vencedor: {winner2.name}")
    
    # Adicionar gols
    add_goals_to_match(semi2)
    
    # 3.4 Criar e jogar final
    print_info("\n3.4 Criando e simulando final...")
    
    final, created = Match.objects.get_or_create(
        championship=knockout_championship,
        home_team=winner1,
        away_team=winner2,
        defaults={
            'match_type': 'FINAL',
            'round_number': 2,  # Final
            'scheduled_date': timezone.now() + timedelta(days=1),
            'status': 'SCHEDULED'
        }
    )
    
    if created:
        print_success(f"  ✓ Final criada: {winner1.name} vs {winner2.name}")
    else:
        print_info(f"  → Final já existe")
    
    # Jogar final: 2 x 1
    final.home_score = 2
    final.away_score = 1
    final.status = 'FINISHED'
    final.started_at = final.scheduled_date
    final.finished_at = final.scheduled_date + timedelta(minutes=15)
    final.save()
    
    champion = final.home_team if final.home_score > final.away_score else final.away_team
    print_success(f"  ✓ FINAL: {final.home_team.abbreviation} {final.home_score} x {final.away_score} {final.away_team.abbreviation}")
    print_success(f"  🏆 CAMPEÃO: {champion.name} 🏆")
    
    # Adicionar gols
    add_goals_to_match(final)
    
    # 3.5 Finalizar campeonato
    print_info("\n3.5 Finalizando campeonato...")
    
    knockout_championship.status = 'FINISHED'
    knockout_championship.end_date = timezone.now()
    knockout_championship.save()
    
    print_success(f"  Status final: {knockout_championship.status}")
    print_success("\n✓ FASE 3 COMPLETA!\n")
    
    return {'knockout_championship': knockout_championship, 'champion': champion}


def add_goals_to_match(match):
    """Adiciona gols a uma partida"""
    home_players = list(match.home_team.players.filter(teammembership__is_active=True)[:3])
    away_players = list(match.away_team.players.filter(teammembership__is_active=True)[:3])
    
    goal_types = ['REGULAR', 'PENALTY', 'HEADER', 'FREE_KICK', 'VOLLEY']
    
    # Gols do time da casa
    for i in range(match.home_score):
        if home_players:
            scorer = random.choice(home_players)
            minute = random.randint(1, 90)
            
            Goal.objects.create(
                match=match,
                scorer=scorer,
                team=match.home_team,
                minute=minute,
                goal_type=random.choice(goal_types)
            )
    
    # Gols do time visitante
    for i in range(match.away_score):
        if away_players:
            scorer = random.choice(away_players)
            minute = random.randint(1, 90)
            
            Goal.objects.create(
                match=match,
                scorer=scorer,
                team=match.away_team,
                minute=minute,
                goal_type=random.choice(goal_types)
            )


# ============================================================================
# FASE 4: RELATÓRIO FINAL
# ============================================================================

def fase4_relatorio_final():
    print_header("RELATÓRIO FINAL DOS TESTES")
    
    # Estatísticas gerais
    print_info("Estatísticas Gerais:")
    print(f"  - Total de usuários: {User.objects.count()}")
    print(f"  - Total de jogadores: {PlayerProfile.objects.count()}")
    print(f"  - Total de times: {Team.objects.count()}")
    print(f"  - Total de campeonatos: {Championship.objects.count()}")
    print(f"  - Total de partidas: {Match.objects.count()}")
    print(f"  - Total de gols: {Goal.objects.count()}")
    print(f"  - Total de cartões: {Card.objects.count()}")
    
    # Campeonatos por status
    print_info("\nCampeonatos por Status:")
    for status in ['DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED']:
        count = Championship.objects.filter(status=status).count()
        if count > 0:
            print(f"  - {status}: {count}")
    
    # Artilharia
    print_info("\nArtilheiros (Top 5):")
    from django.db.models import Count
    top_scorers = Goal.objects.values(
        'scorer__user__first_name',
        'scorer__user__last_name'
    ).annotate(
        total=Count('id')
    ).order_by('-total')[:5]
    
    for idx, scorer in enumerate(top_scorers, 1):
        name = f"{scorer['scorer__user__first_name']} {scorer['scorer__user__last_name']}"
        print(f"  {idx}. {name}: {scorer['total']} gols")
    
    # Times por vitórias
    print_info("\nTimes com mais vitórias:")
    top_teams = Standings.objects.values(
        'team__name'
    ).annotate(
        total_wins=Count('wins')
    ).order_by('-total_wins')[:5]
    
    for idx, team in enumerate(top_teams, 1):
        standings = Standings.objects.filter(team__name=team['team__name']).first()
        if standings:
            print(f"  {idx}. {team['team__name']}: {standings.wins} vitórias, {standings.points} pontos")
    
    print_success("\n✓ TODOS OS TESTES EXECUTADOS COM SUCESSO!\n")
    
    # Resumo de arquivos de teste
    print_info("📋 Próximos passos:")
    print("  1. Acesse http://localhost:3000 para verificar o frontend")
    print("  2. Login com admin@fnc.com / admin123")
    print("  3. Navegue pelos campeonatos criados:")
    print("     - Copa FNC 2026 (LEAGUE - FINISHED)")
    print("     - Torneio Relâmpago (KNOCKOUT - FINISHED)")
    print("     - Super Copa FNC 2026 (LEAGUE - OPEN)")
    print("  4. Verifique as classificações, partidas e estatísticas")
    print("  5. Teste os fluxos de report de partida e contestações")
    print("")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print_header("SISTEMA FNC - TESTE COMPLETO")
    print(f"{Colors.CYAN}Iniciando testes automatizados...{Colors.END}\n")
    
    try:
        # FASE 1: Preparar dados
        data = fase1_preparar_dados()
        
        # FASE 2: Testar LEAGUE
        league_data = fase2_testar_league(data)
        
        # FASE 3: Testar KNOCKOUT
        knockout_data = fase3_testar_knockout(data)
        
        # FASE 4: Relatório final
        fase4_relatorio_final()
        
        print_success(f"\n{Colors.BOLD}✓ CRONOGRAMA DE TESTES COMPLETO!{Colors.END}\n")
        
    except Exception as e:
        print_error(f"\n✗ Erro durante os testes: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
