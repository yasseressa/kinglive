"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Locale, Messages } from "@/i18n";
import { getAdminToken } from "@/lib/auth";
import { getHomePageData, getStreams } from "@/lib/api";
import type { HomeResponse, StreamLink } from "@/lib/api/types";

export function StreamsPage({
  locale,
  messages,
  initialMatchBuckets,
}: {
  locale: Locale;
  messages: Messages;
  initialMatchBuckets?: HomeResponse | null;
}) {
  const [items, setItems] = useState<StreamLink[]>([]);
  const [matchBuckets, setMatchBuckets] = useState<HomeResponse | null>(initialMatchBuckets ?? null);
  const [matchBucketsError, setMatchBucketsError] = useState<string | null>(initialMatchBuckets ? null : null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getStreams(token)
      .then((response) => setItems(response.items))
      .catch((err) => setError(err instanceof Error ? err.message : messages.loadFailed))
      .finally(() => setLoading(false));
  }, [messages.loadFailed]);

  useEffect(() => {
    if (initialMatchBuckets) {
      return;
    }

    getHomePageData(locale)
      .then((response) => {
        setMatchBuckets(response);
        setMatchBucketsError(null);
      })
      .catch((err) => {
        setMatchBuckets(null);
        setMatchBucketsError(err instanceof Error ? err.message : messages.loadFailed);
      });
  }, [initialMatchBuckets, locale]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f4bb41]">{messages.admin}</p>
          <h1 className="text-4xl font-black text-[#f7f0e2]">{messages.streamLinks}</h1>
        </div>
        <Link href={`/${locale}/admin/streams/new`}><Button>{messages.createStream}</Button></Link>
      </div>
      <Card className="overflow-hidden p-0">
        {loading ? <div className="p-6 text-[#f4bb41]">{messages.loading}</div> : null}
        {error ? <div className="p-6 text-[#f5d7c9]">{error}</div> : null}
        {!loading && !error ? (
          <div className="divide-y divide-[#3a2b14]">
            {items.map((item) => (
              <div key={item.external_match_id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-bold text-[#f7f0e2]">{item.external_match_id}</p>
                  <p className="text-sm text-[#ccb992]">{streamTypeLabel(item.stream_type, messages)} - {item.show_stream ? messages.visible : messages.hidden}</p>
                </div>
                <Link href={`/${locale}/admin/streams/${encodeURIComponent(item.external_match_id)}/edit`}>
                  <Button variant="ghost">{messages.edit}</Button>
                </Link>
              </div>
            ))}
            {items.length === 0 ? <div className="p-6 text-[#ccb992]">{messages.noStreamsYet}</div> : null}
          </div>
        ) : null}
      </Card>
      {matchBucketsError ? <Card className="text-sm text-[#f5d7c9]">{matchBucketsError}</Card> : null}
      {matchBuckets ? (
        <Card className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#f4bb41]">{messages.availableMatches}</p>
            <p className="mt-2 text-sm text-[#ccb992]">{messages.pickMatchIdHelp}</p>
          </div>
          {[
            { label: messages.todayMatches, matches: matchBuckets.today_matches },
            { label: messages.tomorrowMatches, matches: matchBuckets.tomorrow_matches },
            { label: messages.yesterdayMatches, matches: matchBuckets.yesterday_matches },
          ].map((bucket) =>
            bucket.matches.length > 0 ? (
              <div key={bucket.label} className="space-y-3">
                <p className="font-semibold text-[#f7f0e2]">{bucket.label}</p>
                <div className="space-y-2">
                  {bucket.matches.map((match) => (
                    <div key={match.external_match_id} className="flex flex-col gap-1 rounded-[1.2rem] border border-[#3a2b14] bg-[#17120d] p-4">
                      <p className="font-semibold text-[#f7f0e2]">{match.home_team} {messages.versus} {match.away_team}</p>
                      <p className="text-sm text-[#ccb992]">{match.competition_name}</p>
                      <p className="text-xs text-[#f4bb41]">{messages.matchId}: {match.external_match_id}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null,
          )}
        </Card>
      ) : null}
    </div>
  );
}

function streamTypeLabel(streamType: StreamLink["stream_type"], messages: Messages) {
  if (streamType === "iframe") return messages.streamTypeIframe;
  if (streamType === "external") return messages.streamTypeExternal;
  if (streamType === "embed") return messages.streamTypeEmbed;
  return messages.streamTypeHls;
}
