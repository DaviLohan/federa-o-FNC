from django.core.management.base import BaseCommand, CommandError

from fnc_championships.models import Championship
from fnc_championships.services import reschedule_championship_matches


class Command(BaseCommand):
    help = 'Reaplica a agenda oficial do campeonato às partidas já geradas.'

    def add_arguments(self, parser):
        parser.add_argument('championship_id', type=int)
        parser.add_argument('--days-between-rounds', type=int, default=7)
        parser.add_argument(
            '--exclude-finished',
            action='store_true',
            help='Não altera partidas já finalizadas.',
        )

    def handle(self, *args, **options):
        championship_id = options['championship_id']
        try:
            championship = Championship.objects.get(pk=championship_id)
        except Championship.DoesNotExist as exc:
            raise CommandError(f'Championship {championship_id} not found') from exc

        result = reschedule_championship_matches(
            championship,
            days_between_rounds=options['days_between_rounds'],
            include_finished=not options['exclude_finished'],
        )

        self.stdout.write(
            self.style.SUCCESS(
                f"Updated {result['updated_count']} matches for championship {championship.id}"
            )
        )
        for item in result['updated_matches']:
            self.stdout.write(
                f"match={item['match_id']} round={item['round_number']} status={item['status']} "
                f"from={item['previous']} to={item['current']}"
            )
