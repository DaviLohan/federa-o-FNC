from __future__ import annotations

from datetime import datetime, time, timedelta, timezone as dt_timezone

from django.utils import timezone
from django.utils.dateparse import parse_date


LOCAL_TIMEZONE = timezone.get_current_timezone()
SUPPORTED_PERIODS = {'yesterday', 'today', 'next_7_days', 'next_30_days', 'last_48h'}


def format_dt_pair(value: datetime) -> str:
    local_value = timezone.localtime(value, LOCAL_TIMEZONE)
    utc_value = value.astimezone(dt_timezone.utc)
    return f'local={local_value.isoformat()} utc={utc_value.isoformat()}'


def ensure_aware_utc(value: datetime) -> datetime:
    if timezone.is_naive(value):
        value = timezone.make_aware(value, LOCAL_TIMEZONE)
    return value.astimezone(dt_timezone.utc)


def local_day_bounds(day) -> tuple[datetime, datetime]:
    start_local = timezone.make_aware(datetime.combine(day, time.min), LOCAL_TIMEZONE)
    end_local = timezone.make_aware(datetime.combine(day, time.max), LOCAL_TIMEZONE)
    return start_local.astimezone(dt_timezone.utc), end_local.astimezone(dt_timezone.utc)


def period_bounds(period: str, *, now: datetime | None = None) -> tuple[datetime, datetime]:
    if period not in SUPPORTED_PERIODS:
        raise ValueError(f'Período inválido: {period}')

    now = now or timezone.now()
    local_now = timezone.localtime(now, LOCAL_TIMEZONE)

    if period == 'last_48h':
        return now - timedelta(hours=48), now

    if period == 'yesterday':
        return local_day_bounds(local_now.date() - timedelta(days=1))

    if period == 'today':
        return local_day_bounds(local_now.date())

    start_local = timezone.make_aware(datetime.combine(local_now.date(), time.min), LOCAL_TIMEZONE)
    days = 7 if period == 'next_7_days' else 30
    end_local = start_local + timedelta(days=days, microseconds=-1)
    return start_local.astimezone(dt_timezone.utc), end_local.astimezone(dt_timezone.utc)


def custom_bounds(date_from: str | None, date_to: str | None) -> tuple[datetime, datetime] | tuple[None, None]:
    if not date_from and not date_to:
        return None, None

    parsed_from = parse_date(date_from) if date_from else None
    parsed_to = parse_date(date_to) if date_to else None

    if date_from and not parsed_from:
        raise ValueError('date_from inválido. Use YYYY-MM-DD.')
    if date_to and not parsed_to:
        raise ValueError('date_to inválido. Use YYYY-MM-DD.')
    if parsed_from and parsed_to and parsed_from > parsed_to:
        raise ValueError('date_from não pode ser maior que date_to.')

    start = local_day_bounds(parsed_from)[0] if parsed_from else None
    end = local_day_bounds(parsed_to)[1] if parsed_to else None
    return start, end
