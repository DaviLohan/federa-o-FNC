from django.core.management.base import BaseCommand, CommandError

from fnc_championships.models import Championship
from fnc_matches.services import recompute_match_derived_data_for_championship


class Command(BaseCommand):
    help = 'Recalcula standings e estatísticas deriváveis de um campeonato a partir das partidas finalizadas.'

    def add_arguments(self, parser):
        parser.add_argument('championship_id', type=int)

    def handle(self, *args, **options):
        championship_id = options['championship_id']

        try:
            championship = Championship.objects.get(pk=championship_id)
        except Championship.DoesNotExist as exc:
            raise CommandError(f'Championship {championship_id} not found') from exc

        recompute_match_derived_data_for_championship(championship)
        self.stdout.write(
            self.style.SUCCESS(
                f'Recomputed derived data for championship {championship.id} ({championship.name})'
            )
        )
