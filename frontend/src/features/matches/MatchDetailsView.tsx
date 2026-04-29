"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MatchPlayer } from "@/components/matches/MatchPlayer";
import { NewsListSection } from "@/components/news/NewsListSection";
import { Card } from "@/components/ui/Card";
import type { Locale, Messages } from "@/i18n";
import type { MatchDetails } from "@/lib/api/types";
import { formatDate, getDisplayMatchStatus } from "@/lib/utils";

export function MatchDetailsView({ locale, messages, match }: { locale: Locale; messages: Messages; match: MatchDetails }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const displayStatus = getDisplayMatchStatus(match.status, match.start_time, now);

  return (
    <div className="space-y-6 min-[420px]:space-y-8">
      <Card className="grid gap-5 p-4 min-[420px]:gap-6 min-[420px]:p-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div className="space-y-4 min-w-0">
          <div className="flex items-center gap-3">
            {match.competition_emblem ? <Logo src={match.competition_emblem} alt={match.competition_name} size="sm" /> : null}
            <p className="text-[0.68rem] font-bold text-[#931800] min-[420px]:text-xs">{match.competition_name}</p>
          </div>
          <div className="grid gap-4 min-[520px]:grid-cols-[1fr_auto_1fr] min-[520px]:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Logo src={match.home_team_crest} alt={match.home_team} />
              <h1 className="text-2xl font-semibold leading-tight text-[#222] min-[420px]:text-3xl">{match.home_team}</h1>
            </div>
            <p className="text-center text-base font-semibold text-[#626883] min-[420px]:text-lg">{messages.versus}</p>
            <div className="flex min-w-0 items-center justify-start gap-3 min-[520px]:justify-end">
              <h2 className="text-2xl font-semibold leading-tight text-[#222] min-[420px]:text-3xl">{match.away_team}</h2>
              <Logo src={match.away_team_crest} alt={match.away_team} />
            </div>
          </div>
          <p className="text-sm leading-6 text-[#626883]">{formatDate(match.start_time, locale)}</p>
          {match.description ? <p className="text-sm leading-6 text-[#484848] min-[420px]:text-base min-[420px]:leading-7">{match.description}</p> : null}
        </div>
        <div className="rounded-lg bg-[#eceef2] p-4 text-[#222] shadow-[0_0_4px_rgba(0,0,0,0.12)] min-[420px]:p-5">
          <p className="text-sm font-semibold text-[#931800]">{messages.matchCenter}</p>
          <p className="mt-3 text-lg font-bold">{match.venue || statusLabel(displayStatus, messages)}</p>
          <Link href={`/${locale}`} className="mt-6 inline-flex rounded-lg bg-[#273340] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#931800]" data-disable-global-redirect>
            {messages.backHome}
          </Link>
        </div>
      </Card>
      <MatchPlayer stream={match.stream_link} canShowPlayer={match.can_show_player} messages={messages} />
      <NewsListSection locale={locale} title={messages.relatedNews} articles={match.related_news} emptyLabel={messages.empty} readMoreLabel={messages.readMore} />
    </div>
  );
}

function Logo({ src, alt, size = "md" }: { src?: string | null; alt: string; size?: "sm" | "md" }) {
  const boxClass = size === "sm" ? "h-9 w-9 min-[420px]:h-10 min-[420px]:w-10" : "h-11 w-11 min-[420px]:h-14 min-[420px]:w-14";

  if (!src) {
    return <div className={`${boxClass} rounded-full bg-[#eceef2]`} aria-hidden="true" />;
  }

  return (
    <div className={`${boxClass} flex items-center justify-center rounded-full bg-[#eceef2] p-2`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}

function statusLabel(status: string, messages: Messages) {
  const normalized = status.toLowerCase();
  if (normalized === "live") return messages.liveNowLabel;
  if (normalized === "finished") return messages.finished;
  if (normalized === "scheduled") return messages.comingUp;
  if (normalized === "postponed") return messages.postponed;
  if (normalized === "cancelled") return messages.cancelled;
  return status;
}
