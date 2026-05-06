from __future__ import annotations

import logging

from fastapi import HTTPException, status

from app.core.cache import CacheBackend, CacheKeys
from app.core.constants import HOME_NEWS_CACHE_TTL_SECONDS, RELATED_MATCH_NEWS_CACHE_TTL_SECONDS
from app.integrations.news.client import NewsAPIClient
from app.integrations.shared_models import NewsArticleData

logger = logging.getLogger(__name__)


class NewsService:
    def __init__(self, client: NewsAPIClient, cache: CacheBackend) -> None:
        self.client = client
        self.cache = cache

    async def get_latest_news(self, locale: str) -> list[NewsArticleData]:
        cache_key = CacheKeys.latest_news(locale)
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        stale_cached = self.cache.get_stale(cache_key)

        try:
            articles = await self.client.get_latest_sports_news(locale)
        except Exception:
            logger.exception("latest_news_load_failed", extra={"locale": locale})
            articles = []
        if not articles and stale_cached is not None:
            logger.warning("latest_news_using_stale_cache", extra={"locale": locale, "count": len(stale_cached)})
            return stale_cached

        if not articles:
            logger.warning("latest_news_empty_not_cached", extra={"locale": locale})
            return articles

        self.cache.set(cache_key, articles, HOME_NEWS_CACHE_TTL_SECONDS)
        logger.info("latest_news_loaded", extra={"locale": locale, "count": len(articles)})
        return articles

    async def get_related_news(
        self,
        match_id: str,
        locale: str,
        team_names: list[str],
        competition: str | None,
        match_context: str,
    ) -> list[NewsArticleData]:
        cache_key = CacheKeys.related_news(match_id, locale)
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        stale_cached = self.cache.get_stale(cache_key)

        try:
            articles = await self.client.get_related_news(
                locale=locale,
                team_names=team_names,
                competition=competition,
                match_context=match_context,
            )
        except Exception:
            logger.exception("related_news_load_failed", extra={"match_id": match_id, "locale": locale})
            articles = []
        if not articles and stale_cached is not None:
            logger.warning(
                "related_news_using_stale_cache",
                extra={"match_id": match_id, "locale": locale, "count": len(stale_cached)},
            )
            return stale_cached

        if not articles:
            logger.warning("related_news_empty_not_cached", extra={"match_id": match_id, "locale": locale})
            return articles

        self.cache.set(cache_key, articles, RELATED_MATCH_NEWS_CACHE_TTL_SECONDS)
        logger.info("related_news_loaded", extra={"match_id": match_id, "locale": locale, "count": len(articles)})
        return articles

    async def get_article(self, identifier: str, locale: str) -> NewsArticleData:
        cache_key = CacheKeys.article(identifier, locale)
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        stale_cached = self.cache.get_stale(cache_key)

        article = await self.client.get_article_details(identifier, locale)
        if article is None and stale_cached is not None:
            logger.warning("news_article_using_stale_cache", extra={"identifier": identifier, "locale": locale})
            return stale_cached
        if article is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News article not found")

        self.cache.set(cache_key, article, HOME_NEWS_CACHE_TTL_SECONDS)
        logger.info("news_article_loaded", extra={"identifier": identifier, "locale": locale})
        return article
