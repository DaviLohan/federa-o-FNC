from datetime import datetime, timedelta

from django.utils import timezone


WEEKDAY_BY_CODE = {
    'MON': 0,
    'TUE': 1,
    'WED': 2,
    'THU': 3,
    'FRI': 4,
    'SAT': 5,
    'SUN': 6,
}


def championship_uses_official_schedule(championship) -> bool:
    return bool(championship.game_days and championship.game_start_time)


def resolve_championship_round_datetime(championship, round_number: int, *, start_date=None, days_between_rounds: int = 7):
    """Resolve a data oficial de uma rodada com base na agenda do campeonato."""
    base = _normalize_base_datetime(start_date or championship.start_date)

    if not championship_uses_official_schedule(championship):
        if round_number <= 1:
            return base
        return base + timedelta(days=days_between_rounds * (round_number - 1))

    valid_weekdays = [
        WEEKDAY_BY_CODE[code]
        for code in championship.game_days
        if code in WEEKDAY_BY_CODE
    ]

    if not valid_weekdays:
        if round_number <= 1:
            return base
        return base + timedelta(days=days_between_rounds * (round_number - 1))

    current = _first_valid_slot(base, valid_weekdays, championship.game_start_time)
    for _ in range(1, round_number):
        current = _next_valid_slot(current, valid_weekdays, championship.game_start_time)
    return current


def _normalize_base_datetime(value):
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value, timezone.get_current_timezone())


def _apply_start_time(reference, start_time):
    return reference.replace(
        hour=start_time.hour,
        minute=start_time.minute,
        second=getattr(start_time, 'second', 0),
        microsecond=getattr(start_time, 'microsecond', 0),
    )


def _first_valid_slot(base, valid_weekdays, start_time):
    candidate = _apply_start_time(base, start_time)
    for day_offset in range(0, 14):
        probe = candidate + timedelta(days=day_offset)
        if probe.weekday() not in valid_weekdays:
            continue
        if probe < base:
            continue
        return probe
    return candidate


def _next_valid_slot(current, valid_weekdays, start_time):
    candidate = _apply_start_time(current + timedelta(days=1), start_time)
    for day_offset in range(0, 14):
        probe = candidate + timedelta(days=day_offset)
        if probe.weekday() in valid_weekdays:
            return probe
    return candidate
