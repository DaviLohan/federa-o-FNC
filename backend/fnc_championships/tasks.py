import logging

from celery import shared_task

from .services import auto_initialize_due_league_championships

logger = logging.getLogger(__name__)


@shared_task(
    name='fnc_championships.auto_initialize_league_championships',
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    ignore_result=False,
)
def auto_initialize_league_championships(self):
    """Inicializa automaticamente campeonatos LEAGUE elegíveis."""
    try:
        result = auto_initialize_due_league_championships()
        logger.info(
            'Automatic league initialization: checked=%s initialized=%s skipped=%s errors=%s',
            result['checked'],
            len(result['initialized']),
            len(result['skipped']),
            len(result['errors']),
        )
        return result
    except Exception as exc:
        logger.error('Error during automatic league initialization: %s', exc, exc_info=True)
        raise self.retry(exc=exc)
