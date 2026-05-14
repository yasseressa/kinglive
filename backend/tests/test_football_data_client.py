from datetime import date, datetime

import pytest

from app.core.time import provider_dates_for_sports_date, sports_timezone
from app.integrations.sports import football_data
from app.integrations.sports.football_data import FootballDataSportsAPIClient, _extract_fixtures, _is_allowed_league, _is_fixture_on_date


def test_football_data_maps_apifootball_fixture_to_match_data():
    client = FootballDataSportsAPIClient()
    payload = {
        "match_id": "4813681",
        "country_name": "England",
        "league_name": "Premier League",
        "match_date": "2026-05-13",
        "match_time": "21:00",
        "match_status": "61'",
        "match_live": "1",
        "match_hometeam_name": "Manchester City",
        "match_awayteam_name": "Crystal Palace",
        "match_hometeam_score": "2",
        "match_awayteam_score": "1",
        "match_stadium": "Etihad Stadium",
        "team_home_badge": "https://apiv3.apifootball.com/badges/8456_manchester-city.jpg",
        "team_away_badge": "https://apiv3.apifootball.com/badges/9826_crystal-palace.jpg",
        "league_logo": "https://apiv3.apifootball.com/badges/logo_leagues/152_premier-league.png",
    }

    match = client._map_match(payload, "en")

    assert match.external_match_id == "4813681"
    assert match.competition_name == "English Premier League"
    assert match.home_team == "Manchester City"
    assert match.away_team == "Crystal Palace"
    assert match.home_score == 2
    assert match.away_score == 1
    assert match.status == "live"
    assert match.start_time == datetime(2026, 5, 13, 21, 0, tzinfo=sports_timezone())
    assert match.venue == "Etihad Stadium"
    assert match.home_team_crest == "https://apiv3.apifootball.com/badges/8456_manchester-city.jpg"
    assert match.away_team_crest == "https://apiv3.apifootball.com/badges/9826_crystal-palace.jpg"
    assert match.competition_emblem == "https://apiv3.apifootball.com/badges/logo_leagues/152_premier-league.png"


def test_football_data_filters_allowed_leagues():
    assert _is_allowed_league({"country_name": "intl", "league_name": "UEFA Champions League"})
    assert _is_allowed_league({"country_name": "Spain", "league_name": "La Liga"})
    assert _is_allowed_league({"country_name": "Egypt", "league_name": "Premier League - Relegation Group"})
    assert _is_allowed_league({"country_name": "Saudi Arabia", "league_name": "Saudi League"})
    assert _is_allowed_league({"country_name": "Italy", "league_name": "Coppa Italia"})
    assert not _is_allowed_league({"country_name": "Egypt", "league_name": "Second Division A"})
    assert not _is_allowed_league({"country_name": "Saudi Arabia", "league_name": "Division 1"})


def test_football_data_keeps_matches_by_configured_local_date():
    payload = {"match_id": "1", "match_date": "2026-05-10", "match_time": "01:30"}

    assert _is_fixture_on_date(payload, date(2026, 5, 10))
    assert not _is_fixture_on_date(payload, date(2026, 5, 9))


def test_football_data_extracts_fixtures_from_apifootball_payload():
    payload = {"response": [{"match_id": "5243310"}, {"match_id": "999"}]}

    fixtures = _extract_fixtures(payload)

    assert len(fixtures) == 2
    assert fixtures[0]["match_id"] == "5243310"


def test_football_data_requests_provider_dates_around_local_day():
    assert provider_dates_for_sports_date(date(2026, 5, 10)) == [
        date(2026, 5, 9),
        date(2026, 5, 10),
        date(2026, 5, 11),
    ]


@pytest.mark.asyncio
async def test_football_data_treats_apifootball_errors_as_failed_request(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"message": "missing application key"}

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
    payload = {"response": [{"match_id": "1"}]}

    client._set_cached_provider_payload("2026-05-13", payload)

    assert client._get_cached_provider_payload("2026-05-13") == payload

    monkeypatch.setattr(football_data, "sports_refresh_slot_key", lambda: "2026-05-13T12:00:00+03:00")

    assert client._get_cached_provider_payload("2026-05-13") is None
    assert client._get_cached_provider_payload("2026-05-13", allow_stale=True) == payload
