from datetime import UTC, date, datetime

import pytest

from app.core.time import provider_dates_for_sports_date
from app.integrations.sports import football_data
from app.integrations.sports.football_data import FootballDataSportsAPIClient, _is_allowed_league, _is_fixture_on_date


def test_football_data_maps_rapidapi_fixture_to_match_data():
    client = FootballDataSportsAPIClient()
    payload = {
        "league": {"ccode": "ENG", "id": 47, "name": "Premier League"},
        "match": {
            "id": 4813681,
            "time": "13.05.2026 21:00",
            "home": {"id": 8456, "score": 2, "name": "Man City", "longName": "Manchester City"},
            "away": {"id": 9826, "score": 1, "name": "Crystal Palace", "longName": "Crystal Palace"},
            "status": {
                "utcTime": "2026-05-13T19:00:00.000Z",
                "started": True,
                "cancelled": False,
                "finished": False,
            },
            "timeTS": 1778698800000,
        },
    }

    match = client._map_match(payload, "en")

    assert match.external_match_id == "4813681"
    assert match.competition_name == "English Premier League"
    assert match.home_team == "Manchester City"
    assert match.away_team == "Crystal Palace"
    assert match.home_score == 2
    assert match.away_score == 1
    assert match.status == "live"
    assert match.start_time == datetime(2026, 5, 13, 19, 0, tzinfo=UTC)
    assert match.venue is None
    assert match.home_team_crest is None
    assert match.away_team_crest is None
    assert match.competition_emblem is None


def test_football_data_filters_allowed_leagues():
    assert _is_allowed_league({"league": {"ccode": "INT", "name": "UEFA Champions League"}})
    assert _is_allowed_league({"league": {"ccode": "ESP", "name": "LaLiga"}})
    assert _is_allowed_league({"league": {"ccode": "EGY", "name": "Premier League"}})
    assert not _is_allowed_league({"league": {"ccode": "CHI", "name": "Primera B"}})
    assert not _is_allowed_league({"league": {"ccode": "BEL", "name": "Pro League"}})


def test_football_data_keeps_matches_by_configured_local_date():
    payload = {"match": {"id": 1, "status": {"utcTime": "2026-05-09T22:30:00.000Z"}}}

    assert _is_fixture_on_date(payload, date(2026, 5, 10))
    assert not _is_fixture_on_date(payload, date(2026, 5, 9))


def test_football_data_requests_provider_dates_around_local_day():
    assert provider_dates_for_sports_date(date(2026, 5, 10)) == [
        date(2026, 5, 9),
        date(2026, 5, 10),
        date(2026, 5, 11),
    ]


@pytest.mark.asyncio
async def test_football_data_treats_rapidapi_errors_as_failed_request(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"errors": {"token": "missing application key"}, "response": []}

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
    payload = {"response": [{"ccode": "ENG", "name": "Premier League", "matches": [{"id": 1}]}]}

    client._set_cached_provider_payload("20260513", payload)

    assert client._get_cached_provider_payload("20260513") == payload

    monkeypatch.setattr(football_data, "sports_refresh_slot_key", lambda: "2026-05-13T12:00:00+03:00")

    assert client._get_cached_provider_payload("20260513") is None
    assert client._get_cached_provider_payload("20260513", allow_stale=True) == payload
