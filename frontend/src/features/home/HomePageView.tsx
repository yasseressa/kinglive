"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { Locale, Messages } from "@/i18n";
import type { HomeResponse, MatchSummary, NewsSummary } from "@/lib/api/types";
import { getDisplayMatchStatus, getMatchBucket } from "@/lib/utils";

export function HomePageView({ locale, messages, data }: { locale: Locale; messages: Messages; data: HomeResponse }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  const groupedMatches = { yesterday: [] as MatchSummary[], today: [] as MatchSummary[], tomorrow: [] as MatchSummary[] };
  const seenMatchIds = new Set<string>();

  for (const match of [...data.yesterday_matches, ...data.today_matches, ...data.tomorrow_matches]) {
    if (seenMatchIds.has(match.external_match_id)) {
      continue;
    }

    seenMatchIds.add(match.external_match_id);

    const bucketId = getMatchBucket(match.start_time, now);
    if (bucketId) {
      groupedMatches[bucketId].push(match);
    }
  }

  const buckets = [
    { id: "today", label: messages.todayMatches, matches: groupedMatches.today },
    { id: "yesterday", label: messages.yesterdayMatches, matches: groupedMatches.yesterday },
    { id: "tomorrow", label: messages.tomorrowMatches, matches: groupedMatches.tomorrow },
  ] as const;

  const [activeBucketId, setActiveBucketId] = useState<(typeof buckets)[number]["id"]>("today");
  const activeBucket = buckets.find((bucket) => bucket.id === activeBucketId) ?? buckets[0];

  return (
    <div className="space-y-5 pb-8">
      <div className="flex h-5 justify-end overflow-hidden px-1">
        <span className="rounded-t-md bg-[#eceef2] px-3 pt-0.5 text-[10px] text-[#222] shadow-[0_0_4px_rgba(0,0,0,0.3)]">
          {locale === "ar" ? "بتوقيت جهازك" : "Your local time"}
        </span>
      </div>

      <section id="matches" className="overflow-hidden rounded-lg bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#ddd] bg-[#eceef2] p-2 sm:p-3">
          <h2 className="inline-flex items-center justify-center rounded-lg bg-[#273340] px-3 py-1.5 text-sm font-semibold text-white sm:text-base">
            {locale === "ar" ? "جدول المباريات" : messages.latestHeadlines}
          </h2>

          <div className="flex w-full gap-1.5 sm:w-auto">
            {buckets.map((bucket) => {
              const active = bucket.id === activeBucket.id;
              const colorClass =
                bucket.id === "yesterday"
                  ? "bg-[#104783]"
                  : bucket.id === "tomorrow"
                    ? "bg-[#af5100]"
                    : "bg-[#931800]";
              return (
                <button
                  key={bucket.id}
                  type="button"
                  onClick={() => setActiveBucketId(bucket.id)}
                  className={`min-h-9 flex-1 rounded-lg px-2 py-1.5 text-center text-xs font-bold text-white transition sm:min-w-[116px] sm:text-sm ${
                    active ? colorClass : "bg-[#273340] hover:bg-[#931800]"
                  }`}
                >
                  {bucket.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-2 sm:p-3">
          {activeBucket.matches.length === 0 ? (
            <DarkEmptyState message={messages.empty} />
          ) : (
            activeBucket.matches.slice(0, 8).map((match) => (
              <FeatureMatchRow key={match.external_match_id} locale={locale} match={match} messages={messages} now={now} />
            ))
          )}
        </div>
      </section>

      <section id="news" className="overflow-hidden rounded-lg bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between border-b border-[#ddd] bg-[#eceef2] p-2 sm:p-3">
          <h2 className="inline-flex items-center justify-center rounded-lg bg-[#273340] px-3 py-1.5 text-sm font-semibold text-white sm:text-base">
            {locale === "ar" ? "يلا شوت بث مباشر" : messages.sportsNews}
          </h2>
          <Link href={`/${locale}#news`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#273340] text-2xl leading-none text-white transition hover:bg-[#931800]">
            ›
          </Link>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.latest_news.length === 0 ? (
            <div className="lg:col-span-3">
              <DarkEmptyState message={messages.loadFailed} />
            </div>
          ) : (
            data.latest_news.slice(0, 6).map((article) => (
              <NewsPanel key={article.slug} locale={locale} article={article} readMoreLabel={messages.readMore} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function FeatureMatchRow({ locale, match, messages, now }: { locale: Locale; match: MatchSummary; messages: Messages; now: Date }) {
  const displayStatus = getDisplayMatchStatus(match.status, match.start_time, now);
  const statClass =
    displayStatus === "live"
      ? "bg-[#d00000] animate-pulse"
      : displayStatus === "finished"
        ? "bg-[#474747]"
        : displayStatus === "scheduled"
          ? "bg-[#263545]"
          : "bg-[#af5100]";

  return (
    <Link
      href={`/${locale}/matches/${encodeURIComponent(match.external_match_id)}`}
      target="_blank"
      rel="noreferrer"
      className="group relative mb-3 block overflow-hidden rounded-lg bg-[#eceef2] text-[#222] transition hover:text-[#222]"
      data-disable-global-redirect
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center px-2 py-3 sm:px-4">
        <TeamDisplay align="start" name={match.home_team} logo={match.home_team_crest} />

        <div className="mx-auto flex min-w-[84px] flex-col items-center text-center">
          <span className="text-sm font-semibold sm:text-base">{formatMatchTime(match.start_time, locale)}</span>
          <span className="mt-1 hidden text-lg font-semibold sm:inline-flex">
            <span>0</span>
            <span className="mx-1">-</span>
            <span>0</span>
          </span>
          <span className={`mt-1 inline-flex min-h-[25px] min-w-[62px] items-center justify-center rounded-lg px-2 py-1 text-[11px] font-semibold text-white sm:text-xs ${statClass}`}>
            {statusText(displayStatus, messages)}
          </span>
        </div>

        <TeamDisplay align="end" name={match.away_team} logo={match.away_team_crest} />
      </div>

      <div className="border-t border-[#ddd]">
        <ul className="grid grid-cols-2 text-center text-xs text-[#222] sm:grid-cols-3 sm:text-sm">
          <li className="px-2 py-1.5">{messages.watch}</li>
          <li className="hidden px-2 py-1.5 sm:block">{formatMatchDate(match.start_time, locale)}</li>
          <li className="px-2 py-1.5">{match.competition_name}</li>
        </ul>
      </div>

      <span className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100" aria-hidden="true">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-lg text-[#931800]">›</span>
      </span>
    </Link>
  );
}

function NewsPanel({ locale, article, readMoreLabel }: { locale: Locale; article: NewsSummary; readMoreLabel: string }) {
  return (
    <Link
      href={`/${locale}/news/${article.slug}`}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col overflow-hidden rounded-lg bg-[#eceef2] transition hover:text-[#931800]"
      data-disable-global-redirect
    >
      {article.image_url ? (
        <div className="h-[150px] overflow-hidden bg-[#d8dbe1]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt={article.title}
            className="h-48 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-3">
        <p className="text-xs font-semibold text-[#626883]">{article.source}</p>
        <h3 className="mt-2 line-clamp-3 text-[15px] font-semibold leading-6 text-[#222] transition group-hover:text-[#931800]">
          {article.title}
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#484848]">{article.summary}</p>
        <span className="mt-3 text-sm font-semibold text-[#931800]">{readMoreLabel}</span>
      </div>
    </Link>
  );
}

function TeamDisplay({ name, logo, align }: { name: string; logo?: string | null; align: "start" | "end" }) {
  const isEnd = align === "end";

  return (
    <div className={`flex min-w-0 flex-col items-center text-center sm:flex-row sm:gap-3 ${isEnd ? "sm:flex-row-reverse sm:text-right" : "sm:text-left"}`}>
      <TeamLogo src={logo} alt={name} />
      <p className="mt-1 max-w-full truncate text-[13px] font-semibold text-[#222] sm:mt-0 sm:text-base">{name}</p>
    </div>
  );
}

function TeamLogo({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return <div className="h-12 w-12 rounded-full bg-[#f6f7fa] sm:h-[70px] sm:w-[70px]" aria-hidden="true" />;
  }

  return (
    <div className="flex h-12 w-12 items-center justify-center bg-transparent p-1 sm:h-[70px] sm:w-[70px]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}

function DarkEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[180px] items-center justify-center rounded-lg bg-[#eceef2] px-4 py-5 text-center text-sm leading-7 text-[#666]">
      {message}
    </div>
  );
}

function formatMatchDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatMatchTime(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZoneName: "short" }).format(new Date(value));
}

function statusText(status: string, messages: Messages) {
  const normalized = status.toLowerCase();
  if (normalized === "live") return messages.liveNowLabel;
  if (normalized === "finished") return messages.finished;
  if (normalized === "scheduled") return messages.comingUp;
  if (normalized === "postponed") return messages.postponed;
  if (normalized === "cancelled") return messages.cancelled;
  return status;
}
