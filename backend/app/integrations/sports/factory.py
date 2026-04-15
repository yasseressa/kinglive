from __future__ import annotations

from functools import lru_cache

from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.football_data import FootballDataSportsAPIClient


@lru_cache
def get_sports_client() -> SportsAPIClient:
    return FootballDataSportsAPIClient()
