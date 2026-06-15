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


def align_datetime_to_championship_schedule(reference_datetime, championship):
    """Mantém a data da partida quando ela já cai em um dia válido da agenda oficial."""
    if not championship_uses_official_schedule(championship):
        return None

    local_reference = _normalize_base_datetime(reference_datetime)
    valid_weekdays = {
        WEEKDAY_BY_CODE[code]
        for code in championship.game_days
        if code in WEEKDAY_BY_CODE
    }

    if local_reference.weekday() not in valid_weekdays:
        return None

    return _apply_start_time(local_reference, championship.game_start_time)


def resolve_championship_round_datetime(championship, round_number: int, *, start_date=None, days_between_rounds: int = 7):
    """Resolve a data oficial de uma rodada com base na agenda do campeonato.
    
    Usa round-robin entre os dias configurados na agenda para distribuir as rodadas
    uniformemente: Segunda -> Terça -> Quinta -> Segunda -> ...
    """
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
        current = _next_scheduled_slot(current, valid_weekdays, championship.game_start_time)
    return current


def resolve_next_championship_slot(championship, reference_datetime):
    """Retorna o próximo slot oficial após uma data de referência."""
    base = _normalize_base_datetime(reference_datetime)

    if not championship_uses_official_schedule(championship):
        return base + timedelta(days=7)

    valid_weekdays = [
        WEEKDAY_BY_CODE[code]
        for code in championship.game_days
        if code in WEEKDAY_BY_CODE
    ]

    if not valid_weekdays:
        return base + timedelta(days=7)

    aligned = _apply_start_time(base, championship.game_start_time)
    if aligned > base and aligned.weekday() in valid_weekdays:
        return aligned
    return _next_scheduled_slot(aligned, valid_weekdays, championship.game_start_time)


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


def _next_scheduled_slot(current, valid_weekdays, start_time):
    current_index = valid_weekdays.index(current.weekday())
    target_weekday = valid_weekdays[(current_index + 1) % len(valid_weekdays)]
    day_offset = (target_weekday - current.weekday()) % 7
    if day_offset == 0:
        day_offset = 7
    return _apply_start_time(current + timedelta(days=day_offset), start_time)
