"""
ea_integration/tasks.py

Tasks Celery para sincronização automática de partidas EA.
Busca leagueMatch e friendlyMatch por padrão.
"""

import logging

from celery import shared_task

from .ea_client import DEFAULT_SYNC_MATCH_TYPES
from .services import MatchSyncService

logger = logging.getLogger(__name__)


@shared_task(
    name='ea_integration.sync_all_matches',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    ignore_result=False,
)
def sync_all_matches(self, match_types=None):
    """
    Task periódica que sincroniza partidas de todos os clubes EA ativos.

    Por padrão, busca leagueMatch e friendlyMatch.

    Após sincronizar, dispara validação automática:
    - Verifica times cadastrados
    - Cruza gamertags com elencos
    - Valida estatísticas
    - Vincula a Match interno do campeonato quando possível
    - Contesta automaticamente se detectar inconsistências
    """
    if match_types is None:
        match_types = list(DEFAULT_SYNC_MATCH_TYPES)

    logger.info('Iniciando sincronização automática de partidas EA...')

    service = MatchSyncService()
    try:
        result = service.sync_all(match_types=match_types)
        logger.info(
            'Sincronização automática concluída: '
            '%d novas, %d existentes, %d erros, '
            '%d validadas, %d contestadas',
            result['synced'], result['skipped'], result['errors'],
            result.get('validated', 0), result.get('contested', 0),
        )
        return result
    except Exception as exc:
        logger.error('Erro na sincronização automática: %s', exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task(
    name='ea_integration.sync_club_matches',
    bind=True,
    max_retries=3,
    default_retry_delay=30,
)
def sync_club_matches(self, club_id, match_types=None):
    """
    Task para sincronizar partidas de um clube EA específico.

    Args:
        club_id: PK do EAClub no banco
        match_types: Lista de tipos de partida (default: league + friendly)
    """
    from .models import EAClub
    from django.utils import timezone

    if match_types is None:
        match_types = list(DEFAULT_SYNC_MATCH_TYPES)

    try:
        club = EAClub.objects.get(pk=club_id)
    except EAClub.DoesNotExist:
        logger.error('EAClub com ID %s não encontrado.', club_id)
        return {'error': f'EAClub {club_id} não encontrado'}

    logger.info('Sincronizando clube: %s (ID: %s)', club.name, club.ea_club_id)

    service = MatchSyncService()
    try:
        result = service.sync_club(club, match_types=match_types)

        club.last_synced_at = timezone.now()
        club.save(update_fields=['last_synced_at', 'updated_at'])

        return result
    except Exception as exc:
        logger.error('Erro ao sincronizar clube %s: %s', club.name, exc, exc_info=True)
        raise self.retry(exc=exc)


@shared_task(name='ea_integration.health_check_ea_api')
def health_check_ea_api():
    """
    Task periódica para verificar se a API da EA está acessível.
    Útil para monitoramento e alertas.
    """
    from .ea_client import EAProClubsClient

    client = EAProClubsClient()
    is_healthy = client.health_check()

    if not is_healthy:
        logger.error('EA API HEALTH CHECK FAILED — API inacessível!')
    else:
        logger.info('EA API health check: OK')

    return {'healthy': is_healthy}
