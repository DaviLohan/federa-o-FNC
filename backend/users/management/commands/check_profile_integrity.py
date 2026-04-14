from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from users.models import PlayerProfile, TeamOwnerProfile


class Command(BaseCommand):
    help = (
        'Verifica inconsistencias entre user_type e perfis relacionados. '
        'Opcionalmente recria perfis de jogador ausentes para usuarios PLAYER.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix-player-profiles',
            action='store_true',
            help='Cria PlayerProfile minimo para usuarios PLAYER sem perfil.',
        )

    def handle(self, *args, **options):
        User = get_user_model()
        fix_player_profiles = options['fix_player_profiles']

        active_users = User.objects.filter(is_active=True).order_by('id')
        players_missing_profile = active_users.filter(
            user_type='PLAYER',
            player_profile__isnull=True,
        )
        owners_missing_profile = active_users.filter(
            user_type='TEAM_OWNER',
            team_owner_profile__isnull=True,
        )

        self.stdout.write(self.style.NOTICE('Profile integrity report'))
        self.stdout.write(f'- Active users: {active_users.count()}')
        self.stdout.write(f'- Active player profiles: {PlayerProfile.objects.filter(is_active=True).count()}')
        self.stdout.write(f'- Active owner profiles: {TeamOwnerProfile.objects.filter(is_active=True).count()}')
        self.stdout.write(f'- PLAYER without PlayerProfile: {players_missing_profile.count()}')
        self.stdout.write(f'- TEAM_OWNER without TeamOwnerProfile: {owners_missing_profile.count()}')

        for user in players_missing_profile:
            self.stdout.write(
                f'  PLAYER missing profile -> id={user.id} email={user.email}'
            )

        for user in owners_missing_profile:
            self.stdout.write(
                f'  TEAM_OWNER missing owner profile -> id={user.id} email={user.email}'
            )

        created_profiles = 0
        if fix_player_profiles:
            for user in players_missing_profile:
                PlayerProfile.objects.create(
                    user=user,
                    player_name=user.get_full_name() or user.email.split('@')[0],
                    gamer_tag=user.email.split('@')[0][:100],
                    language=PlayerProfile.Language.PT_BR,
                    is_active=True,
                )
                created_profiles += 1

            self.stdout.write(
                self.style.SUCCESS(
                    f'Created {created_profiles} missing player profiles.'
                )
            )

        has_inconsistencies = players_missing_profile.exists() or owners_missing_profile.exists()
        if has_inconsistencies and not fix_player_profiles:
            self.stdout.write(
                self.style.WARNING(
                    'Inconsistencies found. Re-run with --fix-player-profiles to restore missing PLAYER profiles.'
                )
            )
        elif has_inconsistencies:
            remaining_players_missing = User.objects.filter(
                is_active=True,
                user_type='PLAYER',
                player_profile__isnull=True,
            ).count()
            remaining_owners_missing = User.objects.filter(
                is_active=True,
                user_type='TEAM_OWNER',
                team_owner_profile__isnull=True,
            ).count()
            if remaining_players_missing == 0 and remaining_owners_missing == 0:
                self.stdout.write(self.style.SUCCESS('All checked profile links are now consistent.'))
            else:
                self.stdout.write(
                    self.style.WARNING(
                        'Some inconsistencies remain after fixes. Review TEAM_OWNER profiles manually if needed.'
                    )
                )
        else:
            self.stdout.write(self.style.SUCCESS('No profile inconsistencies found.'))
