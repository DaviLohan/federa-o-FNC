"""
Script to create test championships for testing
Run with: python manage.py shell < create_test_championships.py
"""
from fnc_championships.models import Championship
from datetime import date, timedelta

print("Creating test championships...")

# Delete existing test championships if they exist
Championship.objects.filter(name__in=['Copa FNC 2026', 'Torneio Relâmpago']).delete()

# Championship 1: League Format
champ1 = Championship.objects.create(
    name='Copa FNC 2026',
    description='Campeonato principal da temporada com formato de liga. Todos os times se enfrentam em turno e returno.',
    championship_type='LEAGUE',
    status='OPEN',
    max_teams=4,
    min_teams=2,
    number_of_winners=1,
    enrollment_start=date.today(),
    enrollment_end=date.today() + timedelta(days=5),
    start_date=date.today() + timedelta(days=7),
    enrollment_fee='100.00',
    prize_pool='5000.00',
    rules='Todos contra todos, 2 pontos por vitória, 1 ponto por empate. Melhor colocado leva o prêmio.'
)

print(f"✅ Created Championship 1: {champ1.name} (ID: {champ1.id})")
print(f"   Type: {champ1.championship_type}")
print(f"   Status: {champ1.status}")
print(f"   Enrollment: {champ1.enrollment_start} to {champ1.enrollment_end}")
print(f"   Start Date: {champ1.start_date}")
print(f"   Prize Pool: R$ {champ1.prize_pool}")
print()

# Championship 2: Knockout Format
champ2 = Championship.objects.create(
    name='Torneio Relâmpago',
    description='Torneio rápido em formato eliminatória. Mata-mata direto com confrontos únicos.',
    championship_type='KNOCKOUT',
    status='OPEN',
    max_teams=4,
    min_teams=2,
    number_of_winners=1,
    enrollment_start=date.today(),
    enrollment_end=date.today() + timedelta(days=10),
    start_date=date.today() + timedelta(days=14),
    enrollment_fee='50.00',
    prize_pool='2000.00',
    rules='Mata-mata direto, eliminação simples. Pênaltis em caso de empate. Final única para decidir o campeão.'
)

print(f"✅ Created Championship 2: {champ2.name} (ID: {champ2.id})")
print(f"   Type: {champ2.championship_type}")
print(f"   Status: {champ2.status}")
print(f"   Enrollment: {champ2.enrollment_start} to {champ2.enrollment_end}")
print(f"   Start Date: {champ2.start_date}")
print(f"   Prize Pool: R$ {champ2.prize_pool}")
print()

print("🎉 Successfully created 2 test championships!")
print()
print("Championships created:")
print(f"1. Copa FNC 2026 (LEAGUE) - ID: {champ1.id}")
print(f"2. Torneio Relâmpago (KNOCKOUT) - ID: {champ2.id}")
