"""
ea_integration/management/commands/sync_ea_matches.py

Management command para sincronização manual de partidas EA.

Uso:
    python manage.py sync_ea_matches
    python manage.py sync_ea_matches --club-id 3
    python manage.py sync_ea_matches --match-types leagueMatch friendlyMatch
    python manage.py sync_ea_matches --verbose
"""

from django.core.management.base import BaseCommand, CommandError

from ea_integration.ea_client import DEFAULT_SYNC_MATCH_TYPES
from ea_integration.models import EAClub
from ea_integration.services import MatchSyncService
from ea_integration.ea_client import EAApiError


class Command(BaseCommand):
    help = 'Sincroniza partidas do EA FC Pro Clubs para o banco de dados local.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--club-id',
            type=int,
            help='ID interno do EAClub (PK no banco). Se omitido, sincroniza todos os ativos.',
        )
        parser.add_argument(
            '--match-types',
            nargs='+',
            default=list(DEFAULT_SYNC_MATCH_TYPES),
            choices=['leagueMatch', 'friendlyMatch', 'playoffMatch'],
            help='Tipos de partida para buscar (padrão: leagueMatch friendlyMatch).',
        )
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Mostra informações detalhadas durante a sincronização.',
        )

    def handle(self, *args, **options):
        club_id = options['club_id']
        match_types = options['match_types']
        verbose = options['verbose']

        service = MatchSyncService()

        if club_id:
            # Sincronizar um clube específico
            try:
                club = EAClub.objects.get(pk=club_id)
            except EAClub.DoesNotExist:
                raise CommandError(f'EAClub com ID {club_id} não encontrado.')

            self.stdout.write(
                f'Sincronizando clube: {club.name} '
                f'(EA ID: {club.ea_club_id}, plataforma: {club.platform})'
            )

            try:
                result = service.sync_club(club, match_types=match_types)

                # Atualizar last_synced_at
                from django.utils import timezone
                club.last_synced_at = timezone.now()
                club.save(update_fields=['last_synced_at', 'updated_at'])

            except EAApiError as e:
                raise CommandError(f'Erro na API da EA: {e}')

        else:
            # Sincronizar todos os ativos
            active_count = EAClub.objects.filter(is_active=True).count()
            if active_count == 0:
                self.stdout.write(self.style.WARNING(
                    'Nenhum clube EA ativo encontrado. '
                    'Cadastre um clube via admin ou API antes de sincronizar.'
                ))
                return

            self.stdout.write(f'Sincronizando {active_count} clube(s) ativo(s)...')
            result = service.sync_all(match_types=match_types)

        # ── Resultado ───────────────────────────────────────────────────────
        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('=== Resultado da Sincronização ==='))
        self.stdout.write(f'  Partidas novas:       {result["synced"]}')
        self.stdout.write(f'  Já existentes:        {result["skipped"]}')
        self.stdout.write(f'  Erros:                {result["errors"]}')

        if 'clubs_processed' in result:
            self.stdout.write(f'  Clubes processados:   {result["clubs_processed"]}')

        if result['errors'] > 0:
            self.stdout.write(self.style.WARNING(
                '\nAlguns erros ocorreram. Verifique os logs para detalhes.'
            ))
        else:
            self.stdout.write(self.style.SUCCESS('\nSincronização concluída com sucesso!'))
