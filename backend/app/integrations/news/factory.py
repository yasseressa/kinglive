from __future__ import annotations

from functools import lru_cache

from app.integrations.news.client import NewsAPIClient
from app.integrations.news.gnews import GNewsAPIClient


@lru_cache
def get_news_client() -> NewsAPIClient:
    return GNewsAPIClient()
