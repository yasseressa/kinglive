from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl


class MatchSummaryResponse(BaseModel):
    external_match_id: str
    competition_name: str
    home_team: str
    away_team: str
    start_time: datetime
    status: str
    home_score: int | None = None
    away_score: int | None = None
    home_team_crest: HttpUrl | None = None
    away_team_crest: HttpUrl | None = None
    competition_emblem: HttpUrl | None = None


class NewsArticleSummaryResponse(BaseModel):
    slug: str
    provider_id: str
    title: str
    summary: str
    source: str
    published_at: datetime
    image_url: HttpUrl | None = None


class StreamLinkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    external_match_id: str
    stream_url: str
    stream_type: str
    show_stream: bool
    created_at: datetime
    updated_at: datetime


class MatchDetailResponse(MatchSummaryResponse):
    venue: str | None = None
    description: str | None = None
    stream_link: StreamLinkResponse | None = None
    can_show_player: bool
    related_news: list[NewsArticleSummaryResponse] = Field(default_factory=list)


class NewsArticleDetailResponse(NewsArticleSummaryResponse):
    content: str
    article_url: HttpUrl
    tags: list[str] = Field(default_factory=list)


class HomeResponse(BaseModel):
    yesterday_matches: list[MatchSummaryResponse]
    today_matches: list[MatchSummaryResponse]
    tomorrow_matches: list[MatchSummaryResponse]
    latest_news: list[NewsArticleSummaryResponse]


class HealthResponse(BaseModel):
    status: str
    database: str
    service: str
