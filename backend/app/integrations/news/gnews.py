from __future__ import annotations

import base64
import hashlib
import json
import logging
import re
from datetime import UTC, datetime
from urllib.parse import urlparse

import httpx

from app.core.config import settings
from app.integrations.news.client import NewsAPIClient
from app.integrations.shared_models import NewsArticleData

logger = logging.getLogger(__name__)
_slug_pattern = re.compile(r"[^a-z0-9]+")


class GNewsAPIClient(NewsAPIClient):
    def __init__(self) -> None:
        self.enabled = bool(settings.gnews_api_key)
        self.base_url = settings.gnews_base_url.rstrip("/")
        self.api_key = settings.gnews_api_key
        self.max_results = settings.gnews_max_results

    async def get_latest_sports_news(self, locale: str) -> list[NewsArticleData]:
        if not self.enabled:
            logger.error("news_api_client_not_configured", extra={"provider": "gnews"})
            return []
        logger.info("news_api_call", extra={"provider": "gnews", "operation": "get_latest_sports_news"})
        articles = await self._fetch_articles(
            "/top-headlines",
            {
                "category": "sports",
                "lang": _language_for_locale(locale),
                "max": self.max_results,
            },
        )
        return [self._map_article(article, tags=["sports"]) for article in articles]

    async def get_related_news(
        self,
        locale: str,
        team_names: list[str] | None = None,
        competition: str | None = None,
        match_context: str | None = None,
    ) -> list[NewsArticleData]:
        if not self.enabled:
            logger.error("news_api_client_not_configured", extra={"provider": "gnews"})
            return []
        logger.info(
            "news_api_call",
            extra={"provider": "gnews", "operation": "get_related_news", "competition": competition},
        )
        search_terms = [term for term in (team_names or []) + [competition or "", match_context or ""] if term]
        query = _build_related_query(search_terms)
        articles = await self._fetch_articles(
            "/search",
            {
                "q": query,
                "lang": _language_for_locale(locale),
                "max": min(self.max_results, 10),
                "sortby": "publishedAt",
            },
        )
        if not articles:
            return await self.get_latest_sports_news(locale)
        tags = [term for term in search_terms[:5] if term]
        return [self._map_article(article, tags=tags) for article in articles]

    async def get_article_details(self, identifier: str, locale: str) -> NewsArticleData | None:
        if not self.enabled:
            logger.error("news_api_client_not_configured", extra={"provider": "gnews"})
            return None
        logger.info("news_api_call", extra={"provider": "gnews", "operation": "get_article_details", "identifier": identifier})
        slug_payload = _decode_slug_payload(identifier)
        title = str(slug_payload.get("title") or "")
        article_url = str(slug_payload.get("url") or "")
        candidates = await self._fetch_articles(
            "/search",
            {
                "q": f'"{title}"' if title else "sports",
                "lang": _language_for_locale(locale),
                "max": min(self.max_results, 10),
                "sortby": "publishedAt",
            },
        )
        for article in candidates:
            if _normalize_url(article.get("url")) == _normalize_url(article_url):
                return self._map_article(article, tags=["sports"])

        fallback = await self._fetch_articles(
            "/top-headlines",
            {
                "category": "sports",
                "lang": _language_for_locale(locale),
                "max": min(self.max_results, 10),
            },
        )
        for article in fallback:
            if _normalize_url(article.get("url")) == _normalize_url(article_url):
                return self._map_article(article, tags=["sports"])
        return _build_fallback_article_from_slug(slug_payload)

    async def _fetch_articles(self, path: str, params: dict[str, object]) -> list[dict]:
        request_params = {**params, "apikey": self.api_key}
        try:
            async with httpx.AsyncClient(base_url=self.base_url, timeout=20.0) as client:
                response = await client.get(path, params=request_params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPError:
            logger.exception(
                "news_api_request_failed",
                extra={"provider": "gnews", "path": path, "params": {key: value for key, value in params.items() if key != "apikey"}},
            )
            return []
        return list(payload.get("articles", []))

    def _map_article(self, payload: dict, tags: list[str]) -> NewsArticleData:
        title = payload.get("title") or "Sports news"
        description = payload.get("description") or title
        content = payload.get("content") or description
        article_url = payload.get("url") or ""
        source = payload.get("source") or {}
        source_name = source.get("name") or urlparse(article_url).netloc or "GNews"
        provider_id = hashlib.sha256(article_url.encode("utf-8")).hexdigest()[:16] if article_url else title
        return NewsArticleData(
            slug=_build_slug(
                title,
                article_url,
                summary=description,
                source=source_name,
                published_at=payload.get("publishedAt"),
                image_url=payload.get("image"),
            ),
            provider_id=provider_id,
            title=title,
            summary=description,
            content=content,
            source=source_name,
            published_at=_parse_datetime(payload.get("publishedAt")),
            article_url=article_url,
            image_url=payload.get("image"),
            tags=tags,
        )


def _language_for_locale(locale: str) -> str:
    return locale if locale in {"ar", "en", "fr", "es"} else "en"


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.now(UTC)
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _build_related_query(terms: list[str]) -> str:
    unique_terms: list[str] = []
    for term in terms:
        cleaned = term.strip()
        if cleaned and cleaned not in unique_terms:
            unique_terms.append(cleaned)
    if not unique_terms:
        return "sports"
    quoted = [f'"{term}"' for term in unique_terms[:4]]
    return " OR ".join(quoted)


def _slugify(value: str) -> str:
    normalized = _slug_pattern.sub("-", value.lower()).strip("-")
    return normalized[:48] or "article"


def _build_slug(
    title: str,
    article_url: str,
    *,
    summary: str | None = None,
    source: str | None = None,
    published_at: str | None = None,
    image_url: str | None = None,
) -> str:
    payload = json.dumps(
        {
            "title": title,
            "url": article_url,
            "summary": summary,
            "source": source,
            "published_at": published_at,
            "image_url": image_url,
        },
        separators=(",", ":"),
    ).encode("utf-8")
    token = base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")
    return f"{_slugify(title)}--{token}"


def _decode_slug(identifier: str) -> tuple[str, str]:
    payload = _decode_slug_payload(identifier)
    return str(payload.get("title") or ""), str(payload.get("url") or "")


def _decode_slug_payload(identifier: str) -> dict[str, object]:
    if "--" not in identifier:
        return {}
    _, token = identifier.rsplit("--", 1)
    padding = "=" * (-len(token) % 4)
    try:
        payload = json.loads(base64.urlsafe_b64decode(f"{token}{padding}").decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        return {}
    if not isinstance(payload, dict):
        return {}
    return payload


def _build_fallback_article_from_slug(payload: dict[str, object]) -> NewsArticleData | None:
    title = str(payload.get("title") or "").strip()
    article_url = str(payload.get("url") or "").strip()
    if not title or not article_url:
        return None

    summary = str(payload.get("summary") or title)
    source = str(payload.get("source") or urlparse(article_url).netloc or "GNews")
    published_at = _parse_datetime(str(payload.get("published_at") or ""))
    image_url = str(payload.get("image_url") or "") or None

    return NewsArticleData(
        slug=_build_slug(
            title,
            article_url,
            summary=summary,
            source=source,
            published_at=published_at.isoformat(),
            image_url=image_url,
        ),
        provider_id=hashlib.sha256(article_url.encode("utf-8")).hexdigest()[:16],
        title=title,
        summary=summary,
        content=summary,
        source=source,
        published_at=published_at,
        article_url=article_url,
        image_url=image_url,
        tags=["sports"],
    )


def _normalize_url(value: str | None) -> str:
    return (value or "").rstrip("/")
