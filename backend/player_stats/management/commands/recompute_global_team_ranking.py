from django.core.management.base import BaseCommand

from player_stats.global_ranking_service import recompute_global_team_ranking


class Command(BaseCommand):
    help = 'Recalcula o ranking geral de times da plataforma.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--include-zero-points',
            action='store_true',
            help='Inclui times sem partidas no ranking com zero pontos.',
        )

    def handle(self, *args, **options):
        include_zero_points = options['include_zero_points']
        recompute_global_team_ranking(include_zero_match_teams=include_zero_points)
        self.stdout.write(self.style.SUCCESS('Ranking global recalculado com sucesso.'))
