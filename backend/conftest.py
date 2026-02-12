"""
Factory classes for creating test instances of models using factory_boy.
These factories provide convenient ways to create model instances with realistic data for testing.
"""

import factory
from factory.django import DjangoModelFactory
from faker import Faker
from django.utils import timezone
from datetime import timedelta
import random

fake = Faker('pt_BR')


class UserFactory(DjangoModelFactory):
    """Factory for User model."""
    
    class Meta:
        model = 'users.User'
    
    email = factory.Sequence(lambda n: f'user{n}@fnc.com')
    first_name = factory.LazyAttribute(lambda _: fake.first_name())
    last_name = factory.LazyAttribute(lambda _: fake.last_name())
    user_type = 'PLAYER'
    platform = factory.Iterator(['PS', 'XBOX', 'PC'])
    is_active = True
    is_staff = False
    
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            return
        if extracted:
            self.set_password(extracted)
        else:
            self.set_password('testpass123')


class AdminUserFactory(UserFactory):
    """Factory for Admin User."""
    
    user_type = 'ADMIN'
    is_staff = True
    is_superuser = True


class PlayerProfileFactory(DjangoModelFactory):
    """Factory for PlayerProfile model."""
    
    class Meta:
        model = 'users.PlayerProfile'
    
    user = factory.SubFactory(UserFactory)
    player_name = factory.LazyAttribute(lambda _: fake.name())
    gamer_tag = factory.Sequence(lambda n: f'player{n}')
    shirt_number = factory.LazyAttribute(lambda _: random.randint(1, 99))
    primary_position = factory.Iterator(['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'])
    secondary_position = factory.Iterator(['CB', 'CM', 'CAM', 'RW', 'ST'])
    birth_date = factory.LazyAttribute(lambda _: fake.date_of_birth(minimum_age=16, maximum_age=35))
    whatsapp = factory.LazyAttribute(lambda _: fake.phone_number())
    country = 'Brasil'
    language = 'pt-br'
    is_active = True


class TeamOwnerProfileFactory(DjangoModelFactory):
    """Factory for TeamOwnerProfile model."""
    
    class Meta:
        model = 'users.TeamOwnerProfile'
    
    user = factory.SubFactory(UserFactory, user_type='TEAM_OWNER')
    bio = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))
    is_active = True


class TeamFactory(DjangoModelFactory):
    """Factory for Team model."""
    
    class Meta:
        model = 'fnc_teams.Team'
    
    owner = factory.SubFactory(UserFactory, user_type='TEAM_OWNER')
    name = factory.Sequence(lambda n: f'Team {n}')
    abbreviation = factory.Sequence(lambda n: f'T{n:02d}')
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))
    is_active = True


class TeamMembershipFactory(DjangoModelFactory):
    """Factory for TeamMembership model."""
    
    class Meta:
        model = 'fnc_teams.TeamMembership'
    
    team = factory.SubFactory(TeamFactory)
    player = factory.SubFactory(PlayerProfileFactory)
    role = 'PLAYER'
    is_active = True


class FormationFactory(DjangoModelFactory):
    """Factory for Formation model."""
    
    class Meta:
        model = 'fnc_teams.Formation'
    
    team = factory.SubFactory(TeamFactory)
    name = factory.LazyAttribute(lambda o: f'Formação {o.schema}')
    schema = factory.Iterator(['4-4-2', '4-3-3', '4-2-3-1', '4-3-1-2', '3-5-2'])
    is_default = False


class ChampionshipFactory(DjangoModelFactory):
    """Factory for Championship model."""
    
    class Meta:
        model = 'fnc_championships.Championship'
    
    name = factory.Sequence(lambda n: f'Campeonato {n}')
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=500))
    rules = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=300))
    championship_type = 'LEAGUE'
    status = 'OPEN'
    
    enrollment_start = factory.LazyAttribute(lambda _: timezone.now() - timedelta(days=7))
    enrollment_end = factory.LazyAttribute(lambda _: timezone.now() + timedelta(days=7))
    start_date = factory.LazyAttribute(lambda _: timezone.now() + timedelta(days=14))
    end_date = factory.LazyAttribute(lambda _: timezone.now() + timedelta(days=60))
    
    enrollment_fee = factory.LazyAttribute(lambda _: fake.pydecimal(left_digits=3, right_digits=2, positive=True))
    prize_pool = factory.LazyAttribute(lambda _: fake.pydecimal(left_digits=4, right_digits=2, positive=True))
    
    max_teams = 16
    min_teams = 4
    number_of_winners = 3
    
    created_by = factory.SubFactory(AdminUserFactory)


class KnockoutChampionshipFactory(ChampionshipFactory):
    """Factory for Knockout Championship."""
    
    championship_type = 'KNOCKOUT'
    max_teams = 16


class GroupsKnockoutChampionshipFactory(ChampionshipFactory):
    """Factory for Groups + Knockout Championship."""
    
    championship_type = 'GROUPS_KNOCKOUT'
    max_teams = 16
    num_groups = 4
    teams_per_group = 4
    qualified_per_group = 2
    current_phase = 'GROUPS'


class ChampionshipEnrollmentFactory(DjangoModelFactory):
    """Factory for ChampionshipEnrollment model."""
    
    class Meta:
        model = 'fnc_championships.ChampionshipEnrollment'
    
    championship = factory.SubFactory(ChampionshipFactory)
    team = factory.SubFactory(TeamFactory)
    status = 'APPROVED'
    payment_status = 'COMPLETED'
    approved_at = factory.LazyAttribute(lambda _: timezone.now())


class StandingsFactory(DjangoModelFactory):
    """Factory for Standings model."""
    
    class Meta:
        model = 'fnc_championships.Standings'
    
    championship = factory.SubFactory(ChampionshipFactory)
    team = factory.SubFactory(TeamFactory)
    matches_played = 0
    wins = 0
    draws = 0
    losses = 0
    goals_for = 0
    goals_against = 0
    points = 0


class GroupFactory(DjangoModelFactory):
    """Factory for Group model."""
    
    class Meta:
        model = 'fnc_championships.Group'
    
    championship = factory.SubFactory(GroupsKnockoutChampionshipFactory)
    name = factory.Sequence(lambda n: f'Grupo {chr(65 + n)}')  # A, B, C, D...
    order = factory.Sequence(lambda n: n)


class GroupStandingsFactory(DjangoModelFactory):
    """Factory for GroupStandings model."""
    
    class Meta:
        model = 'fnc_championships.GroupStandings'
    
    group = factory.SubFactory(GroupFactory)
    team = factory.SubFactory(TeamFactory)
    matches_played = 0
    wins = 0
    draws = 0
    losses = 0
    goals_for = 0
    goals_against = 0
    points = 0
    qualified = False


class MatchFactory(DjangoModelFactory):
    """Factory for Match model."""
    
    class Meta:
        model = 'fnc_matches.Match'
    
    home_team = factory.SubFactory(TeamFactory)
    away_team = factory.SubFactory(TeamFactory)
    championship = factory.SubFactory(ChampionshipFactory)
    match_type = 'CHAMPIONSHIP'
    round_number = 1
    scheduled_date = factory.LazyAttribute(lambda _: timezone.now() + timedelta(days=7))
    status = 'SCHEDULED'
    home_score = 0
    away_score = 0


class FinishedMatchFactory(MatchFactory):
    """Factory for Finished Match with realistic scores."""
    
    status = 'FINISHED'
    home_score = factory.LazyAttribute(lambda _: random.randint(0, 5))
    away_score = factory.LazyAttribute(lambda _: random.randint(0, 5))
    started_at = factory.LazyAttribute(lambda _: timezone.now() - timedelta(hours=2))
    finished_at = factory.LazyAttribute(lambda _: timezone.now() - timedelta(hours=1, minutes=50))


class MatchReportFactory(DjangoModelFactory):
    """Factory for MatchReport model."""
    
    class Meta:
        model = 'fnc_matches.MatchReport'
    
    match = factory.SubFactory(FinishedMatchFactory)
    reported_by = factory.SubFactory(UserFactory)
    status = 'SUBMITTED'
    notes = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=200))


class GoalFactory(DjangoModelFactory):
    """Factory for Goal model."""
    
    class Meta:
        model = 'fnc_matches.Goal'
    
    match = factory.SubFactory(FinishedMatchFactory)
    scorer = factory.SubFactory(PlayerProfileFactory)
    team = factory.SubFactory(TeamFactory)
    minute = factory.LazyAttribute(lambda _: random.randint(1, 90))
    goal_type = 'REGULAR'


class AssistFactory(DjangoModelFactory):
    """Factory for Assist model."""
    
    class Meta:
        model = 'fnc_matches.Assist'
    
    goal = factory.SubFactory(GoalFactory)
    assistant = factory.SubFactory(PlayerProfileFactory)


class CardFactory(DjangoModelFactory):
    """Factory for Card model."""
    
    class Meta:
        model = 'fnc_matches.Card'
    
    match = factory.SubFactory(FinishedMatchFactory)
    player = factory.SubFactory(PlayerProfileFactory)
    team = factory.SubFactory(TeamFactory)
    card_type = 'YELLOW'
    minute = factory.LazyAttribute(lambda _: random.randint(1, 90))
    reason = factory.LazyAttribute(lambda _: fake.sentence())


class ContestationFactory(DjangoModelFactory):
    """Factory for Contestation model."""
    
    class Meta:
        model = 'fnc_matches.Contestation'
    
    match = factory.SubFactory(FinishedMatchFactory)
    contested_by = factory.SubFactory(UserFactory)
    team = factory.SubFactory(TeamFactory)
    reason = 'WRONG_SCORE'
    description = factory.LazyAttribute(lambda _: fake.text(max_nb_chars=300))
    status = 'PENDING'
