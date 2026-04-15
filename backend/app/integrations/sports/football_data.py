from __future__ import annotations

import logging
from datetime import UTC, date, datetime

import httpx

from app.core.config import settings
from app.integrations.shared_models import MatchData
from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.localization import localize_sports_text

logger = logging.getLogger(__name__)

_STATUS_MAP = {
    "SCHEDULED": "scheduled",
    "TIMED": "scheduled",
    "IN_PLAY": "live",
    "PAUSED": "live",
    "FINISHED": "finished",
    "POSTPONED": "postponed",
    "SUSPENDED": "postponed",
    "CANCELLED": "cancelled",
}


class FootballDataSportsAPIClient(SportsAPIClient):
    def __init__(self) -> None:
        self.enabled = bool(settings.football_data_base_url and settings.football_data_api_key)
        self.base_url = settings.football_data_base_url.strip().strip('"').rstrip("/")
        self.headers = {
            "X-Auth-Token": settings.football_data_api_key.strip().strip('"'),
            "Accept": "application/json",
        }

    async def get_matches_for_date(self, target_date: date, locale: str) -> list[MatchData]:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": "football_data"})
            return []
        logger.info(
            "sports_api_call",
            extra={"provider": "football_data", "operation": "get_matches_for_date", "date": target_date.isoformat()},
        )
        async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0) as client:
            payload = await self._fetch_matches(client, target_date, log_context={"date": target_date.isoformat()})
            if payload is None:
                return []

        matches = [self._map_match(match_payload, locale) for match_payload in payload.get("matches", [])]
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
        async with httpx.AsyncClient(base_url=self.base_url, headers=self.headers, timeout=20.0) as client:
            payload = await self._fetch_match(client, external_match_id, log_context={"external_match_id": external_match_id})
            if payload is None:
                return None
        return self._map_match(payload, locale)

    async def _fetch_matches(self, client: httpx.AsyncClient, target_date: date, log_context: dict) -> dict | None:
        try:
            response = await client.get("/matches", params={"date": target_date.isoformat()})
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            logger.exception(
                "sports_api_request_failed",
                extra={"provider": "football_data", **log_context},
            )
            return None

    async def _fetch_match(self, client: httpx.AsyncClient, match_id: str, log_context: dict) -> dict | None:
        try:
            response = await client.get(f"/matches/{match_id}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError:
            logger.exception(
                "sports_api_request_failed",
                extra={"provider": "football_data", **log_context},
            )
            return None

    def _map_match(self, payload: dict, locale: str) -> MatchData:
        competition = payload.get("competition") or {}
        home_team = payload.get("homeTeam") or {}
        away_team = payload.get("awayTeam") or {}
        status = payload.get("status") or "SCHEDULED"
        home_name = localize_sports_text(_pick_team_name(home_team) or "Unknown home team", locale) or "Unknown home team"
        away_name = localize_sports_text(_pick_team_name(away_team) or "Unknown away team", locale) or "Unknown away team"
        competition_name = localize_sports_text(competition.get("name") or "Football", locale) or "Football"
        venue = localize_sports_text(payload.get("venue"), locale)
        description_source = f"{home_name} vs {away_name} in {competition_name}"
        description = localize_sports_text(description_source, locale) if locale == "ar" else description_source
        return MatchData(
            external_match_id=str(payload.get("id")),
            competition_name=competition_name,
            home_team=home_name,
            away_team=away_name,
            start_time=_parse_datetime(payload.get("utcDate")),
            status=_STATUS_MAP.get(str(status).upper(), str(status).lower()),
            venue=venue,
            description=description,
            home_team_crest=home_team.get("crest"),
            away_team_crest=away_team.get("crest"),
            competition_emblem=competition.get("emblem"),
        )


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _pick_team_name(team_payload: dict) -> str | None:
    return team_payload.get("shortName") or team_payload.get("name") or team_payload.get("tla")
