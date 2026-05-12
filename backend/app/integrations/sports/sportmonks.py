from __future__ import annotations

import logging
from datetime import UTC, date, datetime

import httpx

from app.core.config import settings
from app.integrations.shared_models import MatchData
from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.localization import localize_sports_text

logger = logging.getLogger(__name__)

_DATE_INCLUDE = "today.scores;today.participants;today.stage;today.group;today.round"
_FIXTURE_INCLUDE = "scores;participants;league;stage;group;round"

_STATUS_MAP = {
    1: "scheduled",
    2: "live",
    3: "live",
    5: "finished",
    7: "finished",
    8: "finished",
    9: "postponed",
    10: "cancelled",
    11: "cancelled",
    12: "postponed",
    19: "scheduled",
    22: "live",
}


class SportmonksSportsAPIClient(SportsAPIClient):
    def __init__(self) -> None:
        self.enabled = bool(settings.sportmonks_base_url and settings.sportmonks_api_token)
        self.base_url = settings.sportmonks_base_url.strip().strip('"').rstrip("/")
        self.api_token = settings.sportmonks_api_token.strip().strip('"')

    async def get_matches_for_date(self, target_date: date, locale: str) -> list[MatchData]:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": "sportmonks"})
            return []

        logger.info(
            "sports_api_call",
            extra={"provider": "sportmonks", "operation": "get_matches_for_date", "date": target_date.isoformat()},
        )

        payload = await self._fetch(
            f"/leagues/date/{target_date.isoformat()}",
            params={"include": _DATE_INCLUDE},
            log_context={"date": target_date.isoformat()},
        )
        leagues = _extract_data(payload)
        matches = [
            self._map_fixture(fixture, league, locale)
            for league in leagues
            for fixture in league.get("today") or []
        ]
        unique_matches = {match.external_match_id: match for match in matches}
        return sorted(unique_matches.values(), key=lambda item: item.start_time)

    async def get_match_details(self, external_match_id: str, locale: str) -> MatchData | None:
        if not self.enabled:
            logger.error("sports_api_client_not_configured", extra={"provider": "sportmonks"})
            return None

        logger.info(
            "sports_api_call",
            extra={"provider": "sportmonks", "operation": "get_match_details", "external_match_id": external_match_id},
        )

        payload = await self._fetch(
            f"/fixtures/{external_match_id}",
            params={"include": _FIXTURE_INCLUDE},
            log_context={"external_match_id": external_match_id},
        )
        fixture = _extract_single_data(payload)
        if fixture is None:
            return None
        league = fixture.get("league") or {}
        return self._map_fixture(fixture, league, locale)

    async def _fetch(self, path: str, params: dict[str, object], log_context: dict) -> dict | list | None:
        request_params = {**params, "api_token": self.api_token}
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=20.0) as client:
                response = await client.get(path, params=request_params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPError:
            logger.exception("sports_api_request_failed", extra={"provider": "sportmonks", **log_context})
            return None

    def _map_fixture(self, fixture: dict, league: dict, locale: str) -> MatchData:
        home = _participant_by_location(fixture, "home")
        away = _participant_by_location(fixture, "away")
        home_name = localize_sports_text(_participant_name(home) or "Unknown home team", locale, entity_type="team") or "Unknown home team"
        away_name = localize_sports_text(_participant_name(away) or "Unknown away team", locale, entity_type="team") or "Unknown away team"
        competition_name = localize_sports_text(league.get("name") or "Football", locale, entity_type="league") or "Football"
        stage_name = (fixture.get("stage") or {}).get("name")
        round_name = (fixture.get("round") or {}).get("name")
        venue = _build_venue(stage_name, round_name)
        description_source = fixture.get("name") or f"{home_name} vs {away_name} in {competition_name}"
        description = localize_sports_text(description_source, locale) if locale == "ar" else description_source

        return MatchData(
            external_match_id=str(fixture.get("id")),
            competition_name=competition_name,
            home_team=home_name,
            away_team=away_name,
            start_time=_parse_datetime(fixture),
            status=_status_from_fixture(fixture),
            venue=localize_sports_text(venue, locale),
            description=description,
            home_team_crest=home.get("image_path") if home else None,
            away_team_crest=away.get("image_path") if away else None,
            competition_emblem=league.get("image_path"),
        )


def _extract_data(payload: dict | list | None) -> list[dict]:
    if payload is None:
        return []
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    data = payload.get("data", payload)
    if isinstance(data, list):
        return [item for item in data if isinstance(item, dict)]
    return []


def _extract_single_data(payload: dict | list | None) -> dict | None:
    if not isinstance(payload, dict):
        return None
    data = payload.get("data", payload)
    return data if isinstance(data, dict) else None


def _participant_by_location(fixture: dict, location: str) -> dict | None:
    for participant in fixture.get("participants") or []:
        if (participant.get("meta") or {}).get("location") == location:
            return participant
    return None


def _participant_name(participant: dict | None) -> str | None:
    if participant is None:
        return None
    return participant.get("name") or participant.get("short_code")


def _parse_datetime(fixture: dict) -> datetime:
    timestamp = fixture.get("starting_at_timestamp")
    if isinstance(timestamp, int | float):
        return datetime.fromtimestamp(timestamp, UTC)

    value = fixture.get("starting_at")
    if isinstance(value, str) and value:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
    return datetime.now(UTC)


def _status_from_fixture(fixture: dict) -> str:
    state_id = fixture.get("state_id")
    if isinstance(state_id, int):
        return _STATUS_MAP.get(state_id, "scheduled")
    return "scheduled"


def _build_venue(stage_name: str | None, round_name: str | None) -> str | None:
    parts = [part for part in (stage_name, f"Round {round_name}" if round_name else None) if part]
    return " - ".join(parts) if parts else None
