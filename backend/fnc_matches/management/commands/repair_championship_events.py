from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from ea_integration.models import EAMatch
from ea_integration.report_service import MatchReportEAService
from fnc_matches.models import Card, Goal, Match
from fnc_matches.report_utils import ensure_match_report_exists
from fnc_matches.services import recompute_match_derived_data_for_championship


class Command(BaseCommand):
    help = 'Repara eventos duplicados de partidas finalizadas e recalcula dados derivados.'

    def add_arguments(self, parser):
        parser.add_argument('championship_id', type=int)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        championship_id = options['championship_id']
        dry_run = bool(options['dry_run'])

        matches = Match.objects.filter(championship_id=championship_id, status=Match.Status.FINISHED).order_by('id')
        if not matches.exists():
            raise CommandError(f'Nenhuma partida finalizada encontrada para championship {championship_id}')

        service = MatchReportEAService()
        fixed = []

        for match in matches:
            expected_goals = (match.home_score or 0) + (match.away_score or 0)
            current_goals = Goal.objects.filter(match=match).count()
            if current_goals == expected_goals:
                continue

            ea_match = EAMatch.objects.filter(
                linked_match=match,
                validation_status=EAMatch.ValidationStatus.VALIDATED,
            ).order_by('-played_at').first()
            if not ea_match:
                self.stdout.write(self.style.WARNING(f'Match {match.id}: sem EAMatch validado, pulando.'))
                continue

            if dry_run:
                fixed.append((match.id, current_goals, expected_goals, 'dry-run'))
                continue

            side_map = service._get_side_mapping(ea_match, match)
            with transaction.atomic():
                Goal.objects.filter(match=match).delete()
                Card.objects.filter(match=match).delete()
                service._create_goals_and_assists(ea_match, match, side_map)
                service._create_cards(ea_match, match, side_map)
                ensure_match_report_exists(match)
            fixed.append((match.id, current_goals, expected_goals, 'fixed'))

        if not dry_run:
            championship = matches.first().championship
            recompute_match_derived_data_for_championship(championship)

        self.stdout.write(self.style.SUCCESS('Reparo concluído.'))
        for row in fixed:
            self.stdout.write(f'- match={row[0]} goals_before={row[1]} expected={row[2]} mode={row[3]}')
        if not fixed:
            self.stdout.write('- Nenhuma inconsistência encontrada.')
