from datetime import UTC, datetime

from app.integrations.sports.football_data import FootballDataSportsAPIClient


def test_football_data_maps_rapidapi_match_to_match_data():
    client = FootballDataSportsAPIClient()
    payload = {
        "id": 5205813,
        "leagueId": 904995,
        "home": {"id": 9906, "score": 1, "name": "Atletico Madrid", "longName": "Atletico Madrid"},
        "away": {"id": 9825, "score": 1, "name": "Arsenal", "longName": "Arsenal"},
        "tournamentStage": "1/2",
        "status": {
            "utcTime": "2026-04-29T19:00:00.000Z",
            "finished": True,
            "started": True,
            "cancelled": False,
            "scoreStr": "1 - 1",
            "reason": {"short": "FT", "long": "Full-Time"},
        },
        "timeTS": 1777489200000,
    }

    match = client._map_match(payload, "en")

    assert match.external_match_id == "5205813"
    assert match.competition_name == "League 904995"
    assert match.home_team == "Atletico Madrid"
    assert match.away_team == "Arsenal"
    assert match.home_score == 1
    assert match.away_score == 1
    assert match.status == "finished"
    assert match.start_time == datetime(2026, 4, 29, 19, 0, tzinfo=UTC)
    assert match.venue == "Stage 1/2"
