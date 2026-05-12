from __future__ import annotations

from datetime import UTC, date, datetime, time, timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.config import settings


def sports_timezone() -> tzinfo:
    try:
        return ZoneInfo(settings.football_data_timezone)
    except ZoneInfoNotFoundError:
        return timezone(timedelta(hours=3), "Asia/Riyadh")


def current_sports_date() -> date:
    return datetime.now(sports_timezone()).date()


def sports_refresh_slot_key(now: datetime | None = None) -> str:
    timezone = sports_timezone()
    current = now.astimezone(timezone) if now else datetime.now(timezone)
    refresh_hour = 0 if current.hour < 12 else 12
    slot = current.replace(hour=refresh_hour, minute=0, second=0, microsecond=0)
    return slot.isoformat()


def seconds_until_next_sports_refresh(now: datetime | None = None) -> int:
    timezone = sports_timezone()
    current = now.astimezone(timezone) if now else datetime.now(timezone)
    next_refresh_hour = 12 if current.hour < 12 else 0
    next_refresh = current.replace(hour=next_refresh_hour, minute=0, second=0, microsecond=0)
    if current.hour >= 12:
        next_refresh += timedelta(days=1)
    return max(1, int((next_refresh - current).total_seconds()))


def utc_dates_for_sports_date(target_date: date) -> list[date]:
    timezone = sports_timezone()
    local_start = datetime.combine(target_date, time.min, tzinfo=timezone)
    local_end = local_start + timedelta(days=1) - timedelta(microseconds=1)
    start_date = local_start.astimezone(UTC).date()
    end_date = local_end.astimezone(UTC).date()
    dates: list[date] = []
    current = start_date
    while current <= end_date:
        dates.append(current)
        current += timedelta(days=1)
    return dates


def provider_dates_for_sports_date(target_date: date) -> list[date]:
    dates = {
        target_date - timedelta(days=1),
        target_date,
        target_date + timedelta(days=1),
        *utc_dates_for_sports_date(target_date),
    }
    return sorted(dates)


def is_on_sports_date(value: datetime, target_date: date) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(sports_timezone()).date() == target_date
