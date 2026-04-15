from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from threading import RLock
from typing import Any

logger = logging.getLogger(__name__)


class CacheBackend(ABC):
    @abstractmethod
    def get(self, key: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def get_stale(self, key: str) -> Any | None:
        raise NotImplementedError

    @abstractmethod
    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, key: str) -> None:
        raise NotImplementedError


@dataclass
class CacheEntry:
    value: Any
    expires_at: datetime


class InMemoryCacheBackend(CacheBackend):
    def __init__(self) -> None:
        self._store: dict[str, CacheEntry] = {}
        self._lock = RLock()

    def get(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                logger.info("cache_miss", extra={"cache_key": key})
                return None

            if entry.expires_at <= datetime.now(UTC):
                logger.info("cache_expired", extra={"cache_key": key})
                return None

            logger.info("cache_hit", extra={"cache_key": key})
            return entry.value

    def get_stale(self, key: str) -> Any | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                logger.info("cache_stale_miss", extra={"cache_key": key})
                return None

            logger.info("cache_stale_hit", extra={"cache_key": key})
            return entry.value

    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        expires_at = datetime.now(UTC) + timedelta(seconds=ttl_seconds)
        with self._lock:
            self._store[key] = CacheEntry(value=value, expires_at=expires_at)
        logger.info("cache_set", extra={"cache_key": key, "ttl_seconds": ttl_seconds})

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)
        logger.info("cache_delete", extra={"cache_key": key})


class CacheKeys:
    @staticmethod
    def home_matches(locale: str, bucket: str) -> str:
        return f"home:matches:{locale}:{bucket}"

    @staticmethod
    def home_news(locale: str) -> str:
        return f"home:news:{locale}"

    @staticmethod
    def match_details(match_id: str, locale: str) -> str:
        return f"match:details:{match_id}:{locale}"

    @staticmethod
    def related_news(match_id: str, locale: str) -> str:
        return f"match:related-news:{match_id}:{locale}"

    @staticmethod
    def article(identifier: str, locale: str) -> str:
        return f"news:article:{identifier}:{locale}"

    @staticmethod
    def latest_news(locale: str) -> str:
        return f"news:latest:{locale}"

    @staticmethod
    def redirect_config() -> str:
        return "redirect:config"
