import { apiRequest } from "@/lib/api/client";
import type {
  HomeResponse,
  LoginPayload,
  LoginResponse,
  MatchDetails,
  NewsArticle,
  RedirectCampaign,
  RedirectCampaignListResponse,
  RedirectCampaignPayload,
  RedirectConfig,
  RedirectSettings,
  SocialLinksResponse,
  StreamLink,
  StreamListResponse,
} from "@/lib/api/types";

const NEWS_REVALIDATE_SECONDS = 6 * 60 * 60;

export function getHomePageData(locale: string) {
  return apiRequest<HomeResponse>(`/api/v1/home?locale=${locale}`);
}

export function getMatchDetails(matchId: string, locale: string) {
  return apiRequest<MatchDetails>(`/api/v1/matches/${encodeURIComponent(matchId)}?locale=${locale}`);
}

export function getNewsArticle(newsSlug: string, locale: string) {
  return apiRequest<NewsArticle>(`/api/v1/news/${encodeURIComponent(newsSlug)}?locale=${locale}`, {
    cacheTags: [`news:${locale}`, `news:${locale}:${newsSlug}`],
    revalidateSeconds: NEWS_REVALIDATE_SECONDS,
  });
}

export function getRedirectConfig() {
  return apiRequest<RedirectConfig>("/api/v1/redirect/config");
}

export function getSocialLinks() {
  return apiRequest<SocialLinksResponse>("/api/v1/social-links");
}

export function loginAdmin(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getStreams(token: string) {
  return apiRequest<StreamListResponse>("/api/v1/admin/streams", { token });
}

export function getStream(externalId: string, token: string) {
  return apiRequest<StreamLink>(`/api/v1/admin/streams/${encodeURIComponent(externalId)}`, { token });
}

export function createStream(payload: StreamLink, token: string) {
  return apiRequest<StreamLink>("/api/v1/admin/streams", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function updateStream(externalId: string, payload: Omit<StreamLink, "external_match_id">, token: string) {
  return apiRequest<StreamLink>(`/api/v1/admin/streams/${encodeURIComponent(externalId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
  });
}

export function deleteStream(externalId: string, token: string) {
  return apiRequest<void>(`/api/v1/admin/streams/${encodeURIComponent(externalId)}`, {
    method: "DELETE",
    token,
  });
}

export function getRedirects(token: string) {
  return apiRequest<RedirectCampaignListResponse>("/api/v1/admin/redirects", { token });
}

export function createRedirect(payload: RedirectCampaignPayload, token: string) {
  return apiRequest<RedirectCampaign>("/api/v1/admin/redirects", {
    method: "POST",
    body: JSON.stringify(payload),
    token,
  });
}

export function updateRedirect(redirectId: string, payload: RedirectCampaignPayload, token: string) {
  return apiRequest<RedirectCampaign>(`/api/v1/admin/redirects/${redirectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
  });
}

export function deleteRedirect(redirectId: string, token: string) {
  return apiRequest<void>(`/api/v1/admin/redirects/${redirectId}`, {
    method: "DELETE",
    token,
  });
}

export function getRedirectSettings(token: string) {
  return apiRequest<RedirectSettings>("/api/v1/admin/redirect-settings", { token });
}

export function updateRedirectSettings(payload: RedirectSettings, token: string) {
  return apiRequest<RedirectSettings>("/api/v1/admin/redirect-settings", {
    method: "PUT",
    body: JSON.stringify(payload),
    token,
  });
}
