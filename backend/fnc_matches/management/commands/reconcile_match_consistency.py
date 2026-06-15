from django.core.management.base import BaseCommand
from django.db import transaction

from ea_integration.models import EAMatch
from fnc_matches.models import Match
from fnc_matches.report_utils import ensure_match_report_exists
from fnc_matches.services import recompute_match_derived_data_for_championship


class Command(BaseCommand):
    help = 'Reconcilia status/report e força recompute de classificação/estatísticas por campeonato.'

    def add_arguments(self, parser):
        parser.add_argument('--championship-id', type=int, default=None)
        parser.add_argument('--dry-run', action='store_true')

    def handle(self, *args, **options):
        championship_id = options.get('championship_id')
        dry_run = bool(options.get('dry_run'))

        qs = Match.objects.all().select_related('championship')
        if championship_id:
            qs = qs.filter(championship_id=championship_id)

        fixed_reports = 0
        fixed_status = 0
        touched_championships = set()

        for match in qs:
            changed = False

            if match.status == Match.Status.FINISHED:
                try:
                    _ = match.report
                except Exception:
                    if not dry_run:
                        ensure_match_report_exists(match)
                    fixed_reports += 1
                    changed = True

            if match.status == Match.Status.CONTESTED:
                linked = EAMatch.objects.filter(
                    linked_match=match,
                    validation_status=EAMatch.ValidationStatus.VALIDATED,
                ).first()
                if linked:
                    if not dry_run:
                        match.status = Match.Status.FINISHED
                        if not match.finished_at:
                            match.finished_at = linked.played_at
                        match.save(update_fields=['status', 'finished_at', 'updated_at'])
                        ensure_match_report_exists(match)
                    fixed_status += 1
                    changed = True

            if changed and match.championship_id:
                touched_championships.add(match.championship_id)

        recomputed = 0
        if not dry_run:
            for cid in sorted(touched_championships):
                championship = Match.objects.filter(championship_id=cid).first().championship
                with transaction.atomic():
                    recompute_match_derived_data_for_championship(championship)
                recomputed += 1

        self.stdout.write(self.style.SUCCESS('Reconciliação concluída.'))
        self.stdout.write(f'- reports criados/garantidos: {fixed_reports}')
        self.stdout.write(f'- status CONTESTED -> FINISHED: {fixed_status}')
        self.stdout.write(f'- campeonatos recomputados: {recomputed if not dry_run else len(touched_championships)}')
