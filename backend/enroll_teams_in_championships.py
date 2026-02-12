"""
Script to enroll all teams in test championships
Run with: python manage.py shell < enroll_teams_in_championships.py
"""
from fnc_championships.models import Championship, ChampionshipEnrollment
from fnc_teams.models import Team
from datetime import date

print("Enrolling teams in championships...")
print()

# Get championships
try:
    copa = Championship.objects.get(name='Copa FNC 2026')
    torneio = Championship.objects.get(name='Torneio Relâmpago')
    print(f"Found Championships:")
    print(f"  - {copa.name} (ID: {copa.id})")
    print(f"  - {torneio.name} (ID: {torneio.id})")
    print()
except Championship.DoesNotExist as e:
    print(f"❌ Error: Championship not found - {e}")
    exit(1)

# Get all teams
teams = Team.objects.filter(is_active=True)
print(f"Found {teams.count()} active teams:")
for team in teams:
    print(f"  - {team.name} ({team.abbreviation}) - Owner: {team.owner.get_full_name()}")
print()

# Delete existing enrollments to avoid duplicates
ChampionshipEnrollment.objects.filter(championship__in=[copa, torneio]).delete()
print("Cleared existing enrollments for these championships")
print()

# Enroll all teams in both championships
enrollments_created = 0

for team in teams:
    # Enroll in Copa FNC 2026
    enrollment1 = ChampionshipEnrollment.objects.create(
        championship=copa,
        team=team,
        status='APPROVED',
        payment_status='PAID'
    )
    enrollments_created += 1
    print(f"✅ Enrolled {team.name} in {copa.name}")
    
    # Enroll in Torneio Relâmpago
    enrollment2 = ChampionshipEnrollment.objects.create(
        championship=torneio,
        team=team,
        status='APPROVED',
        payment_status='PAID'
    )
    enrollments_created += 1
    print(f"✅ Enrolled {team.name} in {torneio.name}")
    print()

print(f"🎉 Successfully created {enrollments_created} enrollments!")
print()

# Summary
print("=" * 60)
print("ENROLLMENT SUMMARY")
print("=" * 60)
copa_enrollments = ChampionshipEnrollment.objects.filter(championship=copa).count()
torneio_enrollments = ChampionshipEnrollment.objects.filter(championship=torneio).count()

print(f"\n{copa.name}:")
print(f"  Enrolled Teams: {copa_enrollments}/{copa.max_teams}")
for enrollment in ChampionshipEnrollment.objects.filter(championship=copa):
    print(f"    - {enrollment.team.name} (Payment: {enrollment.payment_status})")

print(f"\n{torneio.name}:")
print(f"  Enrolled Teams: {torneio_enrollments}/{torneio.max_teams}")
for enrollment in ChampionshipEnrollment.objects.filter(championship=torneio):
    print(f"    - {enrollment.team.name} (Payment: {enrollment.payment_status})")

print("\n" + "=" * 60)
