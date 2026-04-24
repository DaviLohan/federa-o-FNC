import logging

from celery import shared_task

from .services import sync_matches_ready_to_start

logger = logging.getLogger(__name__)


@shared_task(
    name='fnc_matches.sync_matches_ready_to_start',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    ignore_result=False,
)
def sync_matches_ready_to_start_task(self):
    """Libera automaticamente partidas que atingiram o horário agendado."""
    try:
        updated = sync_matches_ready_to_start()
        logger.info('Automatic match start sync updated=%s', updated)
        return {'updated': updated}
    except Exception as exc:
        logger.error('Error during automatic match start sync: %s', exc, exc_info=True)
        raise self.retry(exc=exc)
