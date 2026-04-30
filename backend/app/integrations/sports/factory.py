from __future__ import annotations

from functools import lru_cache

from app.core.config import settings
from app.integrations.sports.client import SportsAPIClient
from app.integrations.sports.football_data import FootballDataSportsAPIClient
from app.integrations.sports.sportmonks import SportmonksSportsAPIClient


@lru_cache
def get_sports_client() -> SportsAPIClient:
    if settings.sports_provider.lower() == "football_data":
        return FootballDataSportsAPIClient()
    return SportmonksSportsAPIClient()
