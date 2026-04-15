"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Locale, Messages } from "@/i18n";
import { getAdminToken } from "@/lib/auth";
import { createStream, getHomePageData, getStream, updateStream } from "@/lib/api";
import type { HomeResponse } from "@/lib/api/types";

import { StreamForm, type StreamFormValues } from "./StreamForm";

export function StreamEditor({
  locale,
  messages,
  externalId,
  initialMatchBuckets,
}: {
  locale: Locale;
  messages: Messages;
  externalId?: string;
  initialMatchBuckets?: HomeResponse | null;
}) {
  const router = useRouter();
  const [initialValues, setInitialValues] = useState<StreamFormValues | undefined>(undefined);
  const [matchBuckets, setMatchBuckets] = useState<HomeResponse | null>(initialMatchBuckets ?? null);
  const [matchBucketsError, setMatchBucketsError] = useState<string | null>(initialMatchBuckets ? null : null);
  const [loading, setLoading] = useState(Boolean(externalId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!externalId || !token) {
      setLoading(false);
      return;
    }

    getStream(externalId, token)
      .then((stream) =>
        setInitialValues({
          external_match_id: stream.external_match_id,
          stream_url: stream.stream_url,
          stream_type: stream.stream_type,
          show_stream: stream.show_stream,
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : messages.loadFailed))
      .finally(() => setLoading(false));
  }, [externalId, messages.loadFailed]);

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

  if (loading) {
    return <div className="text-[#f4bb41]">{messages.loading}</div>;
  }

  if (error) {
    return <div className="text-[#f5d7c9]">{error}</div>;
  }

  return (
    <StreamForm
      messages={messages}
      initialValues={initialValues}
      mode={externalId ? "edit" : "create"}
      matchBucketsError={matchBucketsError}
      matchBuckets={matchBuckets ? [
        { label: messages.todayMatches, matches: matchBuckets.today_matches },
        { label: messages.tomorrowMatches, matches: matchBuckets.tomorrow_matches },
        { label: messages.yesterdayMatches, matches: matchBuckets.yesterday_matches },
      ] : undefined}
      onSubmit={async (values) => {
        const token = getAdminToken();
        if (!token) {
          throw new Error(messages.loginFailed);
        }

        if (externalId) {
          await updateStream(externalId, {
            stream_url: values.stream_url,
            stream_type: values.stream_type,
            show_stream: values.show_stream,
          }, token);
        } else {
          await createStream(values, token);
        }
        router.push(`/${locale}/admin/streams`);
      }}
    />
  );
}
