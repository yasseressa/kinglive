from datetime import UTC, datetime

from app.integrations.sports.football_data import FootballDataSportsAPIClient, _is_allowed_league


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
