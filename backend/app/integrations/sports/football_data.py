from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from threading import RLock

import httpx

from app.core.constants import HOME_MATCHES_CACHE_TTL_SECONDS
from app.core.config import settings
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
    ("italy", "serie a"),
    ("portugal", "primeira liga"),
    ("netherlands", "eredivisie"),
    ("saudi arabia", "pro league"),
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
    expires_at: datetime


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

        matches = [
            self._map_match(fixture_payload, locale)
            for fixture_payload in fixtures
            if _is_allowed_league(fixture_payload)
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

        payload = await self._fetch_fixtures(target_date, log_context={"date": cache_key})
        fixtures = _extract_fixtures(payload) if payload is not None else None
        if fixtures is None:
            stale = self._get_cached_fixtures(cache_key, allow_stale=True)
            return stale or []

        self._set_cached_fixtures(cache_key, fixtures)
        return fixtures

    def _get_cached_fixtures(self, cache_key: str, allow_stale: bool = False) -> list[dict] | None:
        now = datetime.now(UTC)
        with self._cache_lock:
            entry = self._fixtures_cache.get(cache_key)
            if entry is None:
                return None
            if not allow_stale and entry.expires_at <= now:
                return None
            return entry.fixtures

    def _set_cached_fixtures(self, cache_key: str, fixtures: list[dict]) -> None:
        expires_at = datetime.now(UTC) + timedelta(seconds=HOME_MATCHES_CACHE_TTL_SECONDS)
        with self._cache_lock:
            self._fixtures_cache[cache_key] = _CachedFixtures(
                fixtures=fixtures,
                expires_at=expires_at,
            )

    async def _fetch_fixtures(self, target_date: date, log_context: dict) -> dict | None:
        request_date = target_date.isoformat()
        try:
            async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0) as client:
                response = await client.get(_FIXTURES_PATH, params={"date": request_date})
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            logger.exception(
                "sports_api_request_failed",
                extra={"provider": _PROVIDER_NAME, "path": _FIXTURES_PATH, "date": request_date, **log_context},
            )
            return None

    def _map_match(self, payload: dict, locale: str) -> MatchData:
        fixture = payload.get("fixture") or {}
        league = payload.get("league") or {}
        teams = payload.get("teams") or {}
        home_team = teams.get("home") or {}
        away_team = teams.get("away") or {}
        goals = payload.get("goals") or {}
        home_name = localize_sports_text(_pick_team_name(home_team) or "Unknown home team", locale) or "Unknown home team"
        away_name = localize_sports_text(_pick_team_name(away_team) or "Unknown away team", locale) or "Unknown away team"
        competition_name = localize_sports_text(league.get("name") or "Football", locale) or "Football"
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


def _is_allowed_league(payload: dict) -> bool:
    league = payload.get("league") or {}
    country = league.get("country")
    league_name = league.get("name")
    if not isinstance(country, str) or not isinstance(league_name, str):
        return False
    return (_normalize_filter_value(country), _normalize_filter_value(league_name)) in _ALLOWED_LEAGUE_FILTERS


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
