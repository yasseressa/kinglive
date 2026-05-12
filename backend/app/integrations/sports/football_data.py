from __future__ import annotations

import logging
import json
import os
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime
from pathlib import Path
from threading import RLock

import httpx

from app.core.config import settings
from app.core.time import is_on_sports_date, provider_dates_for_sports_date, sports_refresh_slot_key
from app.integrations.shared_models import MatchData
from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.localization import localize_sports_text

logger = logging.getLogger(__name__)

_FIXTURES_PATH = "/fixtures"
_PROVIDER_NAME = "api_sports"

_LIVE_STATUSES = {"1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT", "LIVE"}
_FINISHED_STATUSES = {"FT", "AET", "PEN"}
_POSTPONED_STATUSES = {"PST", "TBD"}
_CANCELLED_STATUSES = {"CANC", "ABD", "AWD", "WO"}
_ALLOWED_LEAGUE_FILTERS = {
    ("england", "premier league"),
    ("france", "ligue 1"),
    ("spain", "la liga"),
    ("spain", "laliga"),
    ("spain", "la liga ea sports"),
    ("spain", "primera division"),
    ("germany", "bundesliga"),
    ("italy", "serie a"),
    ("portugal", "primeira liga"),
    ("netherlands", "eredivisie"),
    ("saudi arabia", "pro league"),
    ("egypt", "premier league"),
    ("world", "fifa world cup"),
    ("world", "uefa europa league"),
    ("world", "uefa europa conference league"),
    ("world", "uefa conference league"),
    ("world", "uefa champions league"),
    ("world", "caf champions league"),
    ("world", "european championship"),
    ("world", "euro championship"),
    ("uefa europa league", "world"),
    ("uefa europa conference league", "world"),
    ("uefa champions league", "world"),
}


@dataclass(slots=True)
class _CachedFixtures:
    fixtures: list[dict]
    refresh_slot: str


_DEFAULT_FIXTURE_CACHE_PATH = Path(__file__).resolve().parents[3] / "data" / "football_fixtures_cache.json"
_FIXTURE_CACHE_VERSION = 1
_FIXTURE_CACHE_MAX_AGE_DAYS = 4


class FootballDataSportsAPIClient(SportsAPIClient):
    def __init__(self) -> None:
        self.enabled = bool(settings.football_data_base_url and settings.football_data_api_key)
        self.base_url = settings.football_data_base_url.strip().strip('"').rstrip("/")
        self.headers = {
            "x-apisports-key": settings.football_data_api_key.strip().strip('"'),
            "Accept": "application/json",
        }
        self._fixtures_cache: dict[str, _CachedFixtures] = {}
        self._cache_lock = RLock()
        self.fixture_cache_path = _fixture_cache_path()

    async def get_matches_for_date(self, target_date: date, locale: str) -> list[MatchData]:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": _PROVIDER_NAME})
            return []
        logger.info(
            "sports_api_call",
            extra={"provider": _PROVIDER_NAME, "operation": "get_matches_for_date", "date": target_date.isoformat()},
        )
        fixtures = await self._get_fixtures_for_date(target_date)
        if not fixtures:
            return []

        allowed_fixtures = [
            fixture_payload
            for fixture_payload in fixtures
            if _is_allowed_league(fixture_payload) and _is_fixture_on_date(fixture_payload, target_date)
        ]
        rejected_leagues = _count_rejected_leagues(fixtures, target_date)
        logger.info(
            "sports_api_fixtures_filtered",
            extra={
                "provider": _PROVIDER_NAME,
                "date": target_date.isoformat(),
                "raw_fixture_count": len(fixtures),
                "allowed_fixture_count": len(allowed_fixtures),
                "rejected_leagues": rejected_leagues,
            },
        )

        matches = [
            self._map_match(fixture_payload, locale)
            for fixture_payload in allowed_fixtures
        ]
        unique_matches = {match.external_match_id: match for match in matches}
        return sorted(unique_matches.values(), key=lambda item: item.start_time)

    async def get_match_details(self, external_match_id: str, locale: str) -> MatchData | None:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": _PROVIDER_NAME})
            return None
        logger.info(
            "sports_api_call",
            extra={"provider": _PROVIDER_NAME, "operation": "get_match_details", "external_match_id": external_match_id},
        )
        # The free API-SPORTS plan is protected by a daily request limit. Match details are resolved from
        # cached home buckets in MatchService, so no separate detail request is needed.
        return None

    async def _get_fixtures_for_date(self, target_date: date) -> list[dict]:
        cache_key = target_date.isoformat()
        cached = self._get_cached_fixtures(cache_key)
        if cached is not None:
            return cached

        fixtures: list[dict] = []
        had_failed_request = False
        for request_date in provider_dates_for_sports_date(target_date):
            payload = await self._fetch_fixtures(request_date, log_context={"date": cache_key})
            request_fixtures = _extract_fixtures(payload) if payload is not None else None
            if request_fixtures is None:
                had_failed_request = True
                continue
            fixtures.extend(request_fixtures)

        if had_failed_request and not fixtures:
            stale = self._get_cached_fixtures(cache_key, allow_stale=True)
            return stale or []

        fixtures = _dedupe_fixtures(fixtures)

        if fixtures and not had_failed_request:
            self._set_cached_fixtures(cache_key, fixtures)
        elif fixtures:
            logger.warning(
                "sports_api_partial_fixtures_not_cached",
                extra={"provider": _PROVIDER_NAME, "date": cache_key},
            )
        else:
            logger.warning(
                "sports_api_empty_fixtures_not_cached",
                extra={"provider": _PROVIDER_NAME, "date": cache_key},
            )
        return fixtures

    def _get_cached_fixtures(self, cache_key: str, allow_stale: bool = False) -> list[dict] | None:
        refresh_slot = sports_refresh_slot_key()
        with self._cache_lock:
            entry = self._fixtures_cache.get(cache_key)
            if entry is None:
                return None
            if not allow_stale and entry.refresh_slot != refresh_slot:
                return None
            return entry.fixtures

    def _set_cached_fixtures(self, cache_key: str, fixtures: list[dict]) -> None:
        with self._cache_lock:
            self._fixtures_cache[cache_key] = _CachedFixtures(
                fixtures=fixtures,
                refresh_slot=sports_refresh_slot_key(),
            )

    async def _fetch_fixtures(self, target_date: date, log_context: dict) -> dict | None:
        request_date = target_date.isoformat()
        cached_payload = self._get_cached_provider_payload(request_date)
        if cached_payload is not None:
            return cached_payload

        try:
            async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0) as client:
                response = await client.get(
                    _FIXTURES_PATH,
                    params={"date": request_date, "timezone": settings.football_data_timezone},
                )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict):
                errors = payload.get("errors")
                results = payload.get("results")
                if errors:
                    logger.warning(
                        "sports_api_response_errors",
                        extra={"provider": _PROVIDER_NAME, "date": request_date, "errors": errors},
                    )
                    return None
                logger.info(
                    "sports_api_response_loaded",
                    extra={"provider": _PROVIDER_NAME, "date": request_date, "results": results},
                )
                self._set_cached_provider_payload(request_date, payload)
            return payload
        except httpx.HTTPError:
            logger.exception(
                "sports_api_request_failed",
                extra={"provider": _PROVIDER_NAME, "path": _FIXTURES_PATH, "date": request_date, **log_context},
            )
            return self._get_cached_provider_payload(request_date, allow_stale=True)

    def _get_cached_provider_payload(self, request_date: str, allow_stale: bool = False) -> dict | None:
        with self._cache_lock:
            cache = self._read_fixture_cache()
            entry = _fixture_cache_entry(cache, request_date)
            if entry is None:
                return None
            if not allow_stale and entry.get("refresh_slot") != sports_refresh_slot_key():
                return None
            payload = entry.get("payload")
            if isinstance(payload, dict):
                logger.info(
                    "sports_api_file_cache_hit",
                    extra={"provider": _PROVIDER_NAME, "date": request_date, "allow_stale": allow_stale},
                )
                return payload
            return None

    def _set_cached_provider_payload(self, request_date: str, payload: dict) -> None:
        with self._cache_lock:
            cache = self._read_fixture_cache()
            entries = cache.setdefault("entries", {})
            entries[request_date] = {
                "refresh_slot": sports_refresh_slot_key(),
                "updated_at": datetime.now(UTC).isoformat(),
                "payload": payload,
            }
            _prune_fixture_cache_entries(entries)
            self._write_fixture_cache(cache)
            logger.info("sports_api_file_cache_set", extra={"provider": _PROVIDER_NAME, "date": request_date})

    def _read_fixture_cache(self) -> dict:
        try:
            with self.fixture_cache_path.open("r", encoding="utf-8") as cache_file:
                cache = json.load(cache_file)
        except FileNotFoundError:
            return _empty_fixture_cache()
        except (OSError, json.JSONDecodeError):
            logger.exception("sports_api_file_cache_read_failed", extra={"path": str(self.fixture_cache_path)})
            return _empty_fixture_cache()

        if not isinstance(cache, dict) or not isinstance(cache.get("entries"), dict):
            return _empty_fixture_cache()
        return cache

    def _write_fixture_cache(self, cache: dict) -> None:
        try:
            self.fixture_cache_path.parent.mkdir(parents=True, exist_ok=True)
            tmp_path = self.fixture_cache_path.with_suffix(f"{self.fixture_cache_path.suffix}.tmp")
            with tmp_path.open("w", encoding="utf-8") as cache_file:
                json.dump(cache, cache_file, ensure_ascii=False, separators=(",", ":"))
            os.replace(tmp_path, self.fixture_cache_path)
        except OSError:
            logger.exception("sports_api_file_cache_write_failed", extra={"path": str(self.fixture_cache_path)})

    def _map_match(self, payload: dict, locale: str) -> MatchData:
        fixture = payload.get("fixture") or {}
        league = payload.get("league") or {}
        teams = payload.get("teams") or {}
        home_team = teams.get("home") or {}
        away_team = teams.get("away") or {}
        goals = payload.get("goals") or {}
        home_name = localize_sports_text(_pick_team_name(home_team) or "Unknown home team", locale, entity_type="team") or "Unknown home team"
        away_name = localize_sports_text(_pick_team_name(away_team) or "Unknown away team", locale, entity_type="team") or "Unknown away team"
        competition_name = localize_sports_text(league.get("name") or "Football", locale, entity_type="league", country=league.get("country")) or "Football"
        venue = localize_sports_text(_venue_name(fixture), locale)
        description_source = f"{home_name} vs {away_name} in {competition_name}"
        description = localize_sports_text(description_source, locale) if locale == "ar" else description_source
        return MatchData(
            external_match_id=str(fixture.get("id")),
            competition_name=competition_name,
            home_team=home_name,
            away_team=away_name,
            start_time=_parse_datetime(fixture),
            status=_status_from_fixture(fixture),
            venue=venue,
            description=description,
            home_score=_pick_score(goals, "home"),
            away_score=_pick_score(goals, "away"),
            home_team_crest=home_team.get("logo"),
            away_team_crest=away_team.get("logo"),
            competition_emblem=league.get("logo"),
        )


def _extract_fixtures(payload: dict | list) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    fixtures = payload.get("response") if isinstance(payload, dict) else None
    if isinstance(fixtures, list):
        return [item for item in fixtures if isinstance(item, dict)]

    return []


def _fixture_cache_path() -> Path:
    configured_path = settings.football_data_fixture_cache_path.strip()
    if not configured_path:
        return _DEFAULT_FIXTURE_CACHE_PATH
    return Path(configured_path)


def _empty_fixture_cache() -> dict:
    return {"version": _FIXTURE_CACHE_VERSION, "entries": {}}


def _fixture_cache_entry(cache: dict, request_date: str) -> dict | None:
    entries = cache.get("entries")
    if not isinstance(entries, dict):
        return None
    entry = entries.get(request_date)
    return entry if isinstance(entry, dict) else None


def _prune_fixture_cache_entries(entries: dict) -> None:
    cutoff = datetime.now(UTC).date().toordinal() - _FIXTURE_CACHE_MAX_AGE_DAYS
    for request_date in list(entries):
        try:
            entry_date = date.fromisoformat(request_date)
        except ValueError:
            entries.pop(request_date, None)
            continue
        if entry_date.toordinal() < cutoff:
            entries.pop(request_date, None)


def _dedupe_fixtures(fixtures: list[dict]) -> list[dict]:
    unique: dict[str, dict] = {}
    for fixture_payload in fixtures:
        fixture = fixture_payload.get("fixture") or {}
        fixture_id = fixture.get("id")
        key = str(fixture_id) if fixture_id is not None else str(id(fixture_payload))
        unique[key] = fixture_payload
    return list(unique.values())


def _is_fixture_on_date(payload: dict, target_date: date) -> bool:
    fixture = payload.get("fixture") or {}
    return is_on_sports_date(_parse_datetime(fixture), target_date)


def _is_allowed_league(payload: dict) -> bool:
    league = payload.get("league") or {}
    country = league.get("country")
    league_name = league.get("name")
    if not isinstance(country, str) or not isinstance(league_name, str):
        return False
    return (_normalize_filter_value(country), _normalize_filter_value(league_name)) in _ALLOWED_LEAGUE_FILTERS


def _count_rejected_leagues(fixtures: list[dict], target_date: date) -> dict[str, int]:
    rejected: Counter[str] = Counter()
    for fixture_payload in fixtures:
        if not _is_fixture_on_date(fixture_payload, target_date) or _is_allowed_league(fixture_payload):
            continue

        league = fixture_payload.get("league") or {}
        country = league.get("country") or "Unknown"
        league_name = league.get("name") or "Unknown"
        rejected[f"{country} | {league_name}"] += 1
    return dict(rejected.most_common(20))


def _normalize_filter_value(value: str) -> str:
    return " ".join(value.casefold().replace("-", " ").split())


def _parse_datetime(fixture: dict) -> datetime:
    value = fixture.get("date")
    if not value:
        timestamp = fixture.get("timestamp")
        if isinstance(timestamp, int | float):
            return datetime.fromtimestamp(timestamp, UTC)
        return datetime.now(UTC)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _pick_team_name(team_payload: dict) -> str | None:
    return team_payload.get("name")


def _pick_score(goals_payload: dict, side: str) -> int | None:
    score = goals_payload.get(side)
    return score if isinstance(score, int) else None


def _venue_name(fixture: dict) -> str | None:
    venue = fixture.get("venue") or {}
    name = venue.get("name")
    city = venue.get("city")
    if name and city:
        return f"{name}, {city}"
    return name or city


def _status_from_fixture(fixture: dict) -> str:
    status = fixture.get("status") or {}
    if not isinstance(status, dict):
        return "scheduled"
    short = str(status.get("short") or "").upper()
    if short in _CANCELLED_STATUSES:
        return "cancelled"
    if short in _POSTPONED_STATUSES:
        return "postponed"
    if short in _FINISHED_STATUSES:
        return "finished"
    if short in _LIVE_STATUSES:
        return "live"
    return "scheduled"
