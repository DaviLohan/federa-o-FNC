from django.core.management.base import BaseCommand
from django.db import transaction

from fnc_matches.models import Match
from fnc_matches.report_utils import ensure_match_report_exists


class Command(BaseCommand):
    help = 'Cria súmulas técnicas para partidas FINISHED sem MatchReport.'

    @transaction.atomic
    def handle(self, *args, **options):
        queryset = Match.objects.filter(status=Match.Status.FINISHED, report__isnull=True)
        total = queryset.count()
        created = 0

        for match in queryset.select_related('championship'):
            ensure_match_report_exists(
                match,
                reported_by=match.championship.created_by if match.championship_id else None,
                notes='Backfill técnico para consistência: partida finalizada sem súmula prévia.',
            )
            created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Backfill concluído. FINISHED sem report encontrados: {total}. Súmulas garantidas: {created}.'
            )
        )
