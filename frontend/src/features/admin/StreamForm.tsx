"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Messages } from "@/i18n";
import type { MatchSummary, StreamLink } from "@/lib/api/types";
import { getDisplayMatchStatus } from "@/lib/utils";

export interface StreamFormValues {
  external_match_id: string;
  stream_url: string;
  stream_type: StreamLink["stream_type"];
  show_stream: boolean;
}

export function StreamForm({
  messages,
  initialValues,
  onSubmit,
  mode,
  matchBuckets,
  matchBucketsError,
}: {
  messages: Messages;
  initialValues?: StreamFormValues;
  onSubmit: (values: StreamFormValues) => Promise<void>;
  mode: "create" | "edit";
  matchBuckets?: Array<{ label: string; matches: MatchSummary[] }>;
  matchBucketsError?: string | null;
}) {
  const [values, setValues] = useState<StreamFormValues>(
    initialValues ?? {
      external_match_id: "",
      stream_url: "",
      stream_type: "iframe",
      show_stream: true,
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const availableMatchBuckets = useMemo(() => {
    if (!matchBuckets) return undefined;

    const now = new Date();
    return matchBuckets.map((bucket) => ({
      ...bucket,
      matches: bucket.matches.filter((match) => getDisplayMatchStatus(match.status, match.start_time, now) !== "finished"),
    }));
  }, [matchBuckets]);

  return (
    <Card className="space-y-5">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setLoading(true);
          setError(null);
          try {
            await onSubmit(values);
          } catch (err) {
            setError(err instanceof Error ? err.message : messages.loadFailed);
          } finally {
            setLoading(false);
          }
        }}
      >
        <Input
          value={values.external_match_id}
          onChange={(event) => setValues((current) => ({ ...current, external_match_id: event.target.value }))}
          placeholder={messages.externalMatchId}
          disabled={mode === "edit"}
          required
          data-disable-global-redirect
        />
        <Input
          value={values.stream_url}
          onChange={(event) => setValues((current) => ({ ...current, stream_url: event.target.value }))}
          placeholder={messages.streamUrl}
          required
          data-disable-global-redirect
        />
        <Select
          value={values.stream_type}
          onChange={(event) => setValues((current) => ({ ...current, stream_type: event.target.value as StreamLink["stream_type"] }))}
          data-disable-global-redirect
        >
          <option value="iframe">{messages.streamTypeIframe}</option>
          <option value="external">{messages.streamTypeExternal}</option>
          <option value="embed">{messages.streamTypeEmbed}</option>
          <option value="hls">{messages.streamTypeHls}</option>
        </Select>
        <label className="flex items-center gap-3 text-sm font-semibold text-[#222]">
          <input
            type="checkbox"
            checked={values.show_stream}
            onChange={(event) => setValues((current) => ({ ...current, show_stream: event.target.checked }))}
            data-disable-global-redirect
          />
          {messages.showStream}
        </label>
        {error ? <p className="text-sm text-[#931800]">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? messages.loading : mode === "create" ? messages.save : messages.update}</Button>
      </form>
      {matchBucketsError ? <p className="text-sm text-[#931800]">{matchBucketsError}</p> : null}
      {availableMatchBuckets?.some((bucket) => bucket.matches.length > 0) ? (
        <div className="space-y-4 border-t border-[#ddd] pt-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#931800]">{messages.availableMatches}</p>
            <p className="mt-2 text-sm text-[#626883]">{messages.pickMatchIdHelp}</p>
          </div>
          <div className="space-y-4">
            {availableMatchBuckets.map((bucket) =>
              bucket.matches.length > 0 ? (
                <div key={bucket.label} className="space-y-3">
                  <p className="text-sm font-semibold text-[#222]">{bucket.label}</p>
                  <div className="space-y-2">
                    {bucket.matches.map((match) => (
                      <div key={match.external_match_id} className="flex flex-col gap-3 rounded-lg border border-[#ddd] bg-[#f6f7fa] p-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#222]">{match.home_team} {messages.versus} {match.away_team}</p>
                          <p className="text-sm text-[#626883]">{match.competition_name}</p>
                          <p className="text-xs text-[#931800]">{messages.matchId}: {match.external_match_id}</p>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setValues((current) => ({ ...current, external_match_id: match.external_match_id }))}
                        >
                          {messages.useMatchId}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      ) : null}
    </Card>
  );
}


