from datetime import UTC, date, datetime

import pytest

from app.core.time import provider_dates_for_sports_date
from app.integrations.sports import football_data
from app.integrations.sports.football_data import FootballDataSportsAPIClient, _is_allowed_league, _is_fixture_on_date


def test_football_data_maps_api_sports_fixture_to_match_data():
    client = FootballDataSportsAPIClient()
    payload = {
        "fixture": {
            "id": 5205813,
            "date": "2026-04-29T19:00:00+00:00",
            "timestamp": 1777489200,
            "venue": {"name": "Metropolitano Stadium", "city": "Madrid"},
            "status": {"long": "Match Finished", "short": "FT", "elapsed": 90},
        },
        "league": {"id": 2, "name": "UEFA Champions League", "logo": "https://media.api-sports.io/football/leagues/2.png"},
        "teams": {
            "home": {"id": 9906, "name": "Atletico Madrid", "logo": "https://media.api-sports.io/football/teams/9906.png"},
            "away": {"id": 9825, "name": "Arsenal", "logo": "https://media.api-sports.io/football/teams/9825.png"},
        },
        "goals": {"home": 1, "away": 1},
    }

    match = client._map_match(payload, "en")

    assert match.external_match_id == "5205813"
    assert match.competition_name == "UEFA Champions League"
    assert match.home_team == "Atletico Madrid"
    assert match.away_team == "Arsenal"
    assert match.home_score == 1
    assert match.away_score == 1
    assert match.status == "finished"
    assert match.start_time == datetime(2026, 4, 29, 19, 0, tzinfo=UTC)
    assert match.venue == "Metropolitano Stadium, Madrid"
    assert match.home_team_crest == "https://media.api-sports.io/football/teams/9906.png"
    assert match.away_team_crest == "https://media.api-sports.io/football/teams/9825.png"
    assert match.competition_emblem == "https://media.api-sports.io/football/leagues/2.png"


def test_football_data_filters_allowed_leagues():
    assert _is_allowed_league({"league": {"country": "World", "name": "UEFA Champions League"}})
    assert _is_allowed_league({"league": {"country": "Spain", "name": "La Liga"}})
    assert _is_allowed_league({"league": {"country": "Saudi-Arabia", "name": "Pro League"}})
    assert _is_allowed_league({"league": {"country": "UEFA Europa League", "name": "World"}})
    assert not _is_allowed_league({"league": {"country": "Chile", "name": "Primera B"}})
    assert not _is_allowed_league({"league": {"country": "Belgium", "name": "Pro League"}})


def test_football_data_keeps_matches_by_configured_local_date():
    payload = {"fixture": {"id": 1, "date": "2026-05-09T22:30:00+00:00"}}

    assert _is_fixture_on_date(payload, date(2026, 5, 10))
    assert not _is_fixture_on_date(payload, date(2026, 5, 9))


def test_football_data_requests_provider_dates_around_local_day():
    assert provider_dates_for_sports_date(date(2026, 5, 10)) == [
        date(2026, 5, 9),
        date(2026, 5, 10),
        date(2026, 5, 11),
    ]


@pytest.mark.asyncio
async def test_football_data_treats_api_sports_errors_as_failed_request(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"errors": {"token": "missing application key"}, "results": 0, "response": []}

    class FakeAsyncClient:
        def __init__(self, **kwargs):
            return None

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, traceback):
            return None

        async def get(self, path, params):
            return FakeResponse()

    monkeypatch.setattr(football_data.httpx, "AsyncClient", FakeAsyncClient)

    client = FootballDataSportsAPIClient()

    assert await client._fetch_fixtures(date(2026, 5, 10), log_context={}) is None


def test_football_data_file_cache_is_bound_to_refresh_slot(tmp_path, monkeypatch):
    monkeypatch.setattr(football_data, "sports_refresh_slot_key", lambda: "2026-05-13T00:00:00+03:00")
    client = FootballDataSportsAPIClient()
    client.fixture_cache_path = tmp_path / "football_fixtures_cache.json"
    payload = {"response": [{"fixture": {"id": 1}}]}

    client._set_cached_provider_payload("2026-05-13", payload)

    assert client._get_cached_provider_payload("2026-05-13") == payload

    monkeypatch.setattr(football_data, "sports_refresh_slot_key", lambda: "2026-05-13T12:00:00+03:00")

    assert client._get_cached_provider_payload("2026-05-13") is None
    assert client._get_cached_provider_payload("2026-05-13", allow_stale=True) == payload
