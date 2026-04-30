from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.deps import get_match_service
from app.schemas.common import Locale
from app.schemas.public import MatchDetailResponse, MatchSummaryResponse, NewsArticleSummaryResponse, StreamLinkResponse
from app.services.match_service import MatchService

router = APIRouter()


@router.get("/matches/{match_id}", response_model=MatchDetailResponse)
async def get_match_details(
    match_id: str,
    locale: Annotated[Locale, Query()] = "en",
    service: MatchService = Depends(get_match_service),
) -> MatchDetailResponse:
    match, stream_link, can_show_player, related_news = await service.get_match_details(match_id, locale)
    summary = _to_match_summary_response(match)
    return MatchDetailResponse(
        **summary.model_dump(),
        venue=match.venue,
        description=match.description,
        stream_link=StreamLinkResponse.model_validate(stream_link) if stream_link else None,
        can_show_player=can_show_player,
        related_news=[
            NewsArticleSummaryResponse(
                slug=article.slug,
                provider_id=article.provider_id,
                title=article.title,
                summary=article.summary,
                source=article.source,
                published_at=article.published_at,
                image_url=article.image_url,
            )
            for article in related_news
        ],
    )


def _to_match_summary_response(match) -> MatchSummaryResponse:
    return MatchSummaryResponse(
        external_match_id=match.external_match_id,
        competition_name=match.competition_name,
        home_team=match.home_team,
        away_team=match.away_team,
        start_time=match.start_time,
        status=match.status,
        home_score=match.home_score,
        away_score=match.away_score,
        home_team_crest=match.home_team_crest,
        away_team_crest=match.away_team_crest,
        competition_emblem=match.competition_emblem,
    )
