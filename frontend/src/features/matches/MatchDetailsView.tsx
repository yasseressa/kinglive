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
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[#f4bb41] min-[420px]:text-xs min-[420px]:tracking-[0.3em]">{match.competition_name}</p>
          </div>
          <div className="grid gap-4 min-[520px]:grid-cols-[1fr_auto_1fr] min-[520px]:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <Logo src={match.home_team_crest} alt={match.home_team} />
              <h1 className="text-2xl font-black leading-tight text-[#f7f0e2] min-[420px]:text-3xl">{match.home_team}</h1>
            </div>
            <p className="text-center text-base font-black text-[#b79c62] min-[420px]:text-lg">{messages.versus}</p>
            <div className="flex min-w-0 items-center justify-start gap-3 min-[520px]:justify-end">
              <h2 className="text-2xl font-black leading-tight text-[#f7f0e2] min-[420px]:text-3xl">{match.away_team}</h2>
              <Logo src={match.away_team_crest} alt={match.away_team} />
            </div>
          </div>
          <p className="text-sm leading-6 text-[#ccb992]">{formatDate(match.start_time, locale)}</p>
          {match.description ? <p className="text-sm leading-6 text-[#efe5d3] min-[420px]:text-base min-[420px]:leading-7">{match.description}</p> : null}
        </div>
        <div className="rounded-[1.25rem] border border-[#4b3818] bg-[linear-gradient(180deg,_#1d1711,_#121212)] p-4 text-[#f7f0e2] shadow-card min-[420px]:rounded-[1.5rem] min-[420px]:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f4bb41]">{messages.matchCenter}</p>
          <p className="mt-3 text-lg font-bold">{match.venue || statusLabel(displayStatus, messages)}</p>
          <Link href={`/${locale}`} className="mt-6 inline-flex rounded-full bg-[#f4bb41] px-4 py-2 text-sm font-semibold text-[#17120d]" data-disable-global-redirect>
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
    return <div className={`${boxClass} rounded-full border border-[#4b3818] bg-[#17120d]`} aria-hidden="true" />;
  }

  return (
    <div className={`${boxClass} flex items-center justify-center rounded-full border border-[#4b3818] bg-[#17120d] p-2`}>
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
