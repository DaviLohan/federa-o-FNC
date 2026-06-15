from django.core.management.base import BaseCommand

from ea_integration.report_service import MatchReportEAError, MatchReportEAService
from fnc_matches.models import Match
from users.models import User


class Command(BaseCommand):
    help = 'Reprocessa partidas pendentes de report da EA e mostra quais agora conseguem localizar preview.'

    def add_arguments(self, parser):
        parser.add_argument('--championship-id', type=int, required=True)
        parser.add_argument('--round-number', type=int)
        parser.add_argument('--match-id', type=int)
        parser.add_argument('--confirm', action='store_true', help='Confirma automaticamente resultados encontrados e não contestados.')
        parser.add_argument('--user-id', type=int, default=1, help='Usuário usado para consultar/confirmar o report (padrão: 1).')

    def handle(self, *args, **options):
        championship_id = options['championship_id']
        round_number = options.get('round_number')
        match_id = options.get('match_id')
        should_confirm = bool(options.get('confirm'))
        user = User.objects.get(id=options['user_id'])

        queryset = Match.objects.filter(championship_id=championship_id).exclude(status=Match.Status.CANCELLED)
        if round_number is not None:
            queryset = queryset.filter(round_number=round_number)
        if match_id is not None:
            queryset = queryset.filter(id=match_id)

        pending_statuses = [Match.Status.SCHEDULED, Match.Status.IN_PROGRESS]
        queryset = queryset.filter(status__in=pending_statuses).select_related('home_team', 'away_team', 'championship')

        service = MatchReportEAService()
        found = 0
        confirmed = 0

        for match in queryset.order_by('scheduled_date', 'id'):
            try:
                preview = service.fetch_ea_report(match, user)
                found += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"OK match={match.id} {match.home_team.name} x {match.away_team.name} "
                        f"EA={preview['ea_match_id_external']} score={preview['home_team']['score']}x{preview['away_team']['score']}"
                    )
                )

                if should_confirm and preview.get('can_confirm'):
                    service.confirm_report(match, preview['ea_match_id'], user)
                    confirmed += 1
                    self.stdout.write(self.style.SUCCESS(f'CONFIRMED match={match.id}'))
                elif should_confirm:
                    self.stdout.write(self.style.WARNING(f'SKIPPED match={match.id} can_confirm=False'))

            except MatchReportEAError as exc:
                self.stdout.write(
                    self.style.WARNING(
                        f"ERR match={match.id} {match.home_team.name} x {match.away_team.name} -> {exc}"
                    )
                )

        self.stdout.write(self.style.SUCCESS(f'Previews encontrados: {found}'))
        if should_confirm:
            self.stdout.write(self.style.SUCCESS(f'Partidas confirmadas: {confirmed}'))
