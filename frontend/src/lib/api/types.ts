export type Locale = "en" | "ar" | "fr" | "es";

export interface MatchSummary {
  external_match_id: string;
  competition_name: string;
  home_team: string;
  away_team: string;
  start_time: string;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  home_team_crest?: string | null;
  away_team_crest?: string | null;
  competition_emblem?: string | null;
}

export interface NewsSummary {
  slug: string;
  provider_id: string;
  title: string;
  summary: string;
  source: string;
  published_at: string;
  image_url?: string | null;
}

export interface StreamLink {
  external_match_id: string;
  stream_url: string;
  stream_type: "hls" | "iframe" | "embed" | "external";
  show_stream: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MatchDetails extends MatchSummary {
  venue?: string | null;
  description?: string | null;
  stream_link?: StreamLink | null;
  can_show_player: boolean;
  related_news: NewsSummary[];
}

export interface NewsArticle extends NewsSummary {
  content: string;
  article_url: string;
  tags: string[];
}

export interface HomeResponse {
  yesterday_matches: MatchSummary[];
  today_matches: MatchSummary[];
  tomorrow_matches: MatchSummary[];
  latest_news: NewsSummary[];
}

export interface LoginPayload {
  login: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface StreamListResponse {
  items: StreamLink[];
}

export interface RedirectCampaign {
  id: string;
  name: string;
  target_url: string;
  is_active: boolean;
  cooldown_seconds: number;
  start_at?: string | null;
  end_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RedirectCampaignListResponse {
  items: RedirectCampaign[];
}

export interface RedirectCampaignPayload {
  name: string;
  target_url: string;
  is_active: boolean;
  cooldown_seconds: number;
  start_at?: string | null;
  end_at?: string | null;
}

export interface RedirectSettings {
  enabled: boolean;
  default_cooldown_seconds: number;
  open_in_new_tab: boolean;
  fallback_url?: string | null;
  facebook_url?: string | null;
  youtube_url?: string | null;
  instagram_url?: string | null;
  telegram_url?: string | null;
  whatsapp_url?: string | null;
  active_campaign_id?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface RedirectConfig {
  enabled: boolean;
  interval_seconds: number;
  target_url?: string | null;
  open_in_new_tab: boolean;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface SocialLinksResponse {
  items: SocialLink[];
}
