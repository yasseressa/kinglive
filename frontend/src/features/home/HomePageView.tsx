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
    <div className="space-y-6 pb-8 min-[420px]:space-y-8 min-[420px]:pb-10 sm:space-y-10 lg:space-y-12 lg:pb-14">
      <section
        id="matches"
        className="rounded-[1.45rem] border border-[rgba(255,194,0,0.14)] bg-[linear-gradient(180deg,#0a0a0a_0%,#070707_100%)] p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.34)] min-[380px]:p-4 min-[420px]:rounded-[1.7rem] min-[420px]:p-5 sm:p-6 lg:p-8"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionEyebrow locale={locale} title={messages.upcoming} accent={messages.matches} />
            <p className="mt-3 max-w-[38rem] text-sm leading-7 text-[#a9a39a] sm:text-base">
              {messages.matchesIntro}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {buckets.map((bucket) => {
              const active = bucket.id === activeBucket.id;
              return (
                <button
                  key={bucket.id}
                  type="button"
                  onClick={() => setActiveBucketId(bucket.id)}
                  className={`flex-1 rounded-[0.9rem] border px-3 py-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.08em] transition min-[420px]:flex-none min-[420px]:px-4 min-[420px]:text-xs min-[420px]:tracking-[0.12em] sm:text-sm ${
                    active
                      ? "border-[#f1bc26] bg-[linear-gradient(180deg,#ffd34c_0%,#f0af00_100%)] text-[#111]"
                      : "border-[rgba(255,194,0,0.18)] bg-[#101010] text-[#ddd5c8] hover:border-[#f1bc26] hover:text-[#f1bc26]"
                  }`}
                >
                  {bucket.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-7 space-y-3">
          {activeBucket.matches.length === 0 ? (
            <DarkEmptyState message={messages.empty} />
          ) : (
            activeBucket.matches.slice(0, 8).map((match) => (
              <FeatureMatchRow key={match.external_match_id} locale={locale} match={match} messages={messages} now={now} />
            ))
          )}
        </div>
      </section>

      <section
        id="news"
        className="rounded-[1.45rem] border border-[rgba(255,194,0,0.14)] bg-[linear-gradient(180deg,#0a0a0a_0%,#070707_100%)] p-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.34)] min-[380px]:p-4 min-[420px]:rounded-[1.7rem] min-[420px]:p-5 sm:p-6 lg:p-8"
      >
        <div>
          <SectionEyebrow locale={locale} title={messages.latest} accent={messages.sportsNews} />
          <p className="mt-3 max-w-[38rem] text-sm leading-7 text-[#a9a39a] sm:text-base">
            {messages.newsIntro}
          </p>
        </div>

        <div className="mt-7 grid gap-4 lg:grid-cols-3">
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

  return (
    <Link
      href={`/${locale}/matches/${encodeURIComponent(match.external_match_id)}`}
      target="_blank"
      rel="noreferrer"
      className="block rounded-[1.25rem] border border-[rgba(255,194,0,0.12)] bg-[linear-gradient(180deg,#121212_0%,#0d0d0d_100%)] px-4 py-4 transition hover:border-[#f1bc26] hover:bg-[#121212] sm:px-5"
      data-disable-global-redirect
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className="min-w-0 xl:w-[12rem]">
          <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-[#f1bc26] min-[420px]:text-[0.68rem] min-[420px]:tracking-[0.18em]">{formatMatchDate(match.start_time, locale)}</p>
          <p className="mt-2 text-sm font-semibold text-[#d6d0c5]">{formatMatchTime(match.start_time, locale)}</p>
        </div>

        <div className="grid flex-1 gap-4 min-[480px]:grid-cols-[1fr_auto_1fr] min-[480px]:items-center">
          <TeamDisplay align="start" name={match.home_team} logo={match.home_team_crest} />
          <div className="text-center">
            <p className="text-lg font-black uppercase tracking-[0.08em] text-[#f1bc26]">{statusText(displayStatus, messages)}</p>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.24em] text-[#908a82]">{messages.versus}</p>
          </div>
          <TeamDisplay align="end" name={match.away_team} logo={match.away_team_crest} />
        </div>

        <div className="xl:w-[11rem] xl:text-right">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#8f8a81]">{match.competition_name}</p>
        </div>
      </div>
    </Link>
  );
}

function NewsPanel({ locale, article, readMoreLabel }: { locale: Locale; article: NewsSummary; readMoreLabel: string }) {
  return (
    <Link
      href={`/${locale}/news/${article.slug}`}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col rounded-[1.3rem] border border-[rgba(255,194,0,0.12)] bg-[#101010] p-4 transition hover:border-[#f1bc26]"
      data-disable-global-redirect
    >
      {article.image_url ? (
        <div className="overflow-hidden rounded-[1rem] border border-[rgba(255,194,0,0.08)] bg-[#17120d]">
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
      <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#f1bc26]">{article.source}</p>
      <h3 className="mt-3 text-lg font-black uppercase leading-6 tracking-[-0.02em] text-white transition group-hover:text-[#ffe08b]">
        {article.title}
      </h3>
      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-[#b6b0a5] min-[420px]:leading-7">{article.summary}</p>
      <span className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-[#f1bc26]">{readMoreLabel}</span>
    </Link>
  );
}

function TeamDisplay({ name, logo, align }: { name: string; logo?: string | null; align: "start" | "end" }) {
  const isEnd = align === "end";

  return (
    <div className={`flex items-center gap-3 ${isEnd ? "min-[480px]:flex-row-reverse min-[480px]:text-right" : "text-left"}`}>
      <TeamLogo src={logo} alt={name} />
      <p className="text-sm font-black uppercase tracking-[0.03em] text-[#f6f0e5] min-[420px]:text-base sm:text-lg">{name}</p>
    </div>
  );
}

function TeamLogo({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return <div className="h-11 w-11 rounded-full border border-[rgba(255,194,0,0.16)] bg-[#0f0f0f]" aria-hidden="true" />;
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(255,194,0,0.16)] bg-[#0f0f0f] p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="h-full w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </div>
  );
}

function SectionEyebrow({ locale, title, accent }: { locale: Locale; title: string; accent: string }) {
  const isArabic = locale === "ar";

  return (
    <div>
      <h2 className="text-[1.65rem] font-black uppercase leading-none tracking-[-0.04em] text-white min-[420px]:text-[2rem] sm:text-[2.5rem]">
        {isArabic ? (
          <>
            <span className="text-[#f1bc26]">{accent}</span> {title}
          </>
        ) : (
          <>
            {title} <span className="text-[#f1bc26]">{accent}</span>
          </>
        )}
      </h2>
      <span className="mt-3 block h-[3px] w-16 bg-[#f1bc26]" />
    </div>
  );
}

function DarkEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[rgba(255,194,0,0.12)] bg-[#0d0d0d] px-4 py-5 text-sm leading-7 text-[#b4aea2]">
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
