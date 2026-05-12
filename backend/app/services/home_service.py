from __future__ import annotations

import logging
from datetime import timedelta

from app.core.cache import CacheBackend, CacheKeys
from app.core.constants import HOME_MATCHES_CACHE_TTL_SECONDS
from app.core.time import current_sports_date, seconds_until_next_sports_refresh, sports_refresh_slot_key
from app.integrations.shared_models import MatchData, NewsArticleData
from app.integrations.sports.client import SportsAPIClient
from app.services.news_service import NewsService

logger = logging.getLogger(__name__)


class HomeService:
    def __init__(self, sports_client: SportsAPIClient, news_service: NewsService, cache: CacheBackend) -> None:
        self.sports_client = sports_client
        self.news_service = news_service
        self.cache = cache

    async def get_home_data(self, locale: str) -> dict[str, list[MatchData] | list[NewsArticleData]]:
        today = current_sports_date()
        yesterday_matches = await self._get_matches_for_bucket(today - timedelta(days=1), locale, "yesterday")
        today_matches = await self._get_matches_for_bucket(today, locale, "today")
        tomorrow_matches = await self._get_matches_for_bucket(today + timedelta(days=1), locale, "tomorrow")
        latest_news = await self.news_service.get_latest_news(locale)

        logger.info("home_data_loaded", extra={"locale": locale})
        return {
            "yesterday_matches": yesterday_matches,
            "today_matches": today_matches,
            "tomorrow_matches": tomorrow_matches,
            "latest_news": latest_news,
        }

    async def _get_matches_for_bucket(self, target_date, locale: str, bucket: str) -> list[MatchData]:
        cache_key = CacheKeys.home_matches(locale, bucket, f"{target_date.isoformat()}:{sports_refresh_slot_key()}")
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached

        matches = await self.sports_client.get_matches_for_date(target_date, locale)
        if matches:
            self.cache.set(cache_key, matches, min(HOME_MATCHES_CACHE_TTL_SECONDS, seconds_until_next_sports_refresh()))
        else:
            logger.warning(
                "home_matches_empty_not_cached",
                extra={"locale": locale, "bucket": bucket, "date": target_date.isoformat()},
            )
        return matches
