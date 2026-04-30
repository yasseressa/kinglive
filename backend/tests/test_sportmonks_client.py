from datetime import UTC, datetime

from app.integrations.sports.sportmonks import SportmonksSportsAPIClient


def test_sportmonks_maps_league_date_fixture_to_match_data():
    client = SportmonksSportsAPIClient()
    league = {
        "name": "Europa League",
        "image_path": "https://cdn.sportmonks.com/images/soccer/leagues/5/5.png",
    }
    fixture = {
        "id": 19683252,
        "state_id": 1,
        "name": "Nottingham Forest vs Aston Villa",
        "starting_at": "2026-04-30 19:00:00",
        "starting_at_timestamp": 1777575600,
        "participants": [
            {
                "name": "Aston Villa",
                "image_path": "https://cdn.sportmonks.com/images/soccer/teams/15/15.png",
                "meta": {"location": "away"},
            },
            {
                "name": "Nottingham Forest",
                "image_path": "https://cdn.sportmonks.com/images/soccer/teams/31/63.png",
                "meta": {"location": "home"},
            },
        ],
        "stage": {"name": "Semi-finals"},
        "round": None,
    }

    match = client._map_fixture(fixture, league, "en")

    assert match.external_match_id == "19683252"
    assert match.competition_name == "Europa League"
    assert match.home_team == "Nottingham Forest"
    assert match.away_team == "Aston Villa"
    assert match.status == "scheduled"
    assert match.start_time == datetime.fromtimestamp(1777575600, UTC)
    assert match.home_team_crest == "https://cdn.sportmonks.com/images/soccer/teams/31/63.png"
    assert match.away_team_crest == "https://cdn.sportmonks.com/images/soccer/teams/15/15.png"
    assert match.competition_emblem == "https://cdn.sportmonks.com/images/soccer/leagues/5/5.png"
