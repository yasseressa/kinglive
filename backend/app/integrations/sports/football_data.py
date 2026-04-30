from __future__ import annotations

import logging
from datetime import UTC, date, datetime

import httpx

from app.core.config import settings
from app.integrations.shared_models import MatchData
from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.localization import localize_sports_text

logger = logging.getLogger(__name__)

_MATCHES_BY_DATE_PATH = "/football-get-matches-by-date"


class FootballDataSportsAPIClient(SportsAPIClient):
    def __init__(self) -> None:
        self.enabled = bool(settings.football_data_base_url and settings.football_data_api_key)
        self.base_url = settings.football_data_base_url.strip().strip('"').rstrip("/")
        self.host = settings.football_data_rapidapi_host.strip().strip('"')
        self.headers = {
            "x-rapidapi-host": self.host,
            "x-rapidapi-key": settings.football_data_api_key.strip().strip('"'),
            "Accept": "application/json",
            "Content-Type": "application/json",
        }

    async def get_matches_for_date(self, target_date: date, locale: str) -> list[MatchData]:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": "football_data"})
            return []
        logger.info(
            "sports_api_call",
            extra={"provider": "football_data", "operation": "get_matches_for_date", "date": target_date.isoformat()},
        )
        payload = await self._fetch_matches(target_date, log_context={"date": target_date.isoformat()})
        if payload is None:
            return []

        matches = [self._map_match(match_payload, locale) for match_payload in _extract_matches(payload)]
        unique_matches = {match.external_match_id: match for match in matches}
        return sorted(unique_matches.values(), key=lambda item: item.start_time)

    async def get_match_details(self, external_match_id: str, locale: str) -> MatchData | None:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": "football_data"})
            return None
        logger.info(
            "sports_api_call",
            extra={"provider": "football_data", "operation": "get_match_details", "external_match_id": external_match_id},
        )
        # This RapidAPI plan exposes date buckets. Match details are resolved from
        # cached home buckets in MatchService, so no separate detail request is needed.
        return None

    async def _fetch_matches(self, target_date: date, log_context: dict) -> dict | None:
        try:
            async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0) as client:
                response = await client.get(_MATCHES_BY_DATE_PATH, params={"date": target_date.strftime("%Y%m%d")})
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            logger.exception(
                "sports_api_request_failed",
                extra={"provider": "football_data", **log_context},
            )
            return None

    def _map_match(self, payload: dict, locale: str) -> MatchData:
        home_team = payload.get("home") or {}
        away_team = payload.get("away") or {}
        home_name = localize_sports_text(_pick_team_name(home_team) or "Unknown home team", locale) or "Unknown home team"
        away_name = localize_sports_text(_pick_team_name(away_team) or "Unknown away team", locale) or "Unknown away team"
        competition_name = localize_sports_text(_competition_name(payload), locale) or "Football"
        venue = localize_sports_text(_stage_name(payload), locale)
        description_source = f"{home_name} vs {away_name} in {competition_name}"
        description = localize_sports_text(description_source, locale) if locale == "ar" else description_source
        return MatchData(
            external_match_id=str(payload.get("id")),
            competition_name=competition_name,
            home_team=home_name,
            away_team=away_name,
            start_time=_parse_datetime(payload),
            status=_status_from_match(payload),
            venue=venue,
            description=description,
            home_score=_pick_score(home_team),
            away_score=_pick_score(away_team),
        )


def _extract_matches(payload: dict | list) -> list[dict]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]

    response = payload.get("response") if isinstance(payload, dict) else None
    if isinstance(response, dict):
        matches = response.get("matches")
        if isinstance(matches, list):
            return [item for item in matches if isinstance(item, dict)]

    matches = payload.get("matches") if isinstance(payload, dict) else None
    if isinstance(matches, list):
        return [item for item in matches if isinstance(item, dict)]

    return []


def _parse_datetime(payload: dict) -> datetime:
    status = payload.get("status") or {}
    value = status.get("utcTime") if isinstance(status, dict) else None
    if not value:
        timestamp = payload.get("timeTS")
        if isinstance(timestamp, int | float):
            return datetime.fromtimestamp(timestamp / 1000, UTC)
        return datetime.now(UTC)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _pick_team_name(team_payload: dict) -> str | None:
    return team_payload.get("longName") or team_payload.get("name")


def _pick_score(team_payload: dict) -> int | None:
    score = team_payload.get("score")
    return score if isinstance(score, int) else None


def _competition_name(payload: dict) -> str:
    league_id = payload.get("leagueId")
    if league_id:
        return f"League {league_id}"
    return "Football"


def _stage_name(payload: dict) -> str | None:
    stage = payload.get("tournamentStage")
    return f"Stage {stage}" if stage else None


def _status_from_match(payload: dict) -> str:
    status = payload.get("status") or {}
    if not isinstance(status, dict):
        return "scheduled"
    if status.get("cancelled") or status.get("awarded"):
        return "cancelled"
    if status.get("finished"):
        return "finished"
    if status.get("ongoing") or status.get("started"):
        return "live"
    return "scheduled"
