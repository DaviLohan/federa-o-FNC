import logging

from celery import shared_task

from .ranking_service import CompetitiveRankingService

logger = logging.getLogger(__name__)


@shared_task(
    name='player_stats.finalize_monthly_player_ranking_cycle',
    bind=True,
    max_retries=2,
    default_retry_delay=120,
    ignore_result=False,
)
def finalize_monthly_player_ranking_cycle_task(self):
    """Fecha o ciclo anterior e abre o ciclo mensal atual."""
    try:
        result = CompetitiveRankingService.close_previous_cycle_and_open_new()
        logger.info('Monthly player ranking cycle finalized: %s', result)
        return result
    except Exception as exc:
        logger.error('Error finalizing monthly player ranking cycle: %s', exc, exc_info=True)
        raise self.retry(exc=exc)
