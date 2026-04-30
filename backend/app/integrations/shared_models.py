from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime


@dataclass(slots=True)
class MatchData:
    external_match_id: str
    competition_name: str
    home_team: str
    away_team: str
    start_time: datetime
    status: str
    home_score: int | None = None
    away_score: int | None = None
    venue: str | None = None
    description: str | None = None
    home_team_crest: str | None = None
    away_team_crest: str | None = None
    competition_emblem: str | None = None


@dataclass(slots=True)
class NewsArticleData:
    slug: str
    provider_id: str
    title: str
    summary: str
    content: str
    source: str
    published_at: datetime
    article_url: str
    image_url: str | None = None
    tags: list[str] = field(default_factory=list)
