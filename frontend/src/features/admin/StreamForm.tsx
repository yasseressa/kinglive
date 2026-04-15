"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Messages } from "@/i18n";
import type { MatchSummary, StreamLink } from "@/lib/api/types";

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
        <label className="flex items-center gap-3 text-sm font-semibold text-[#f5efe3]">
          <input
            type="checkbox"
            checked={values.show_stream}
            onChange={(event) => setValues((current) => ({ ...current, show_stream: event.target.checked }))}
            data-disable-global-redirect
          />
          {messages.showStream}
        </label>
        {error ? <p className="text-sm text-[#f5d7c9]">{error}</p> : null}
        <Button type="submit" disabled={loading}>{loading ? messages.loading : mode === "create" ? messages.save : messages.update}</Button>
      </form>
      {matchBucketsError ? <p className="text-sm text-[#f5d7c9]">{matchBucketsError}</p> : null}
      {matchBuckets?.some((bucket) => bucket.matches.length > 0) ? (
        <div className="space-y-4 border-t border-[#3a2b14] pt-5">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#f4bb41]">{messages.availableMatches}</p>
            <p className="mt-2 text-sm text-[#ccb992]">{messages.pickMatchIdHelp}</p>
          </div>
          <div className="space-y-4">
            {matchBuckets.map((bucket) =>
              bucket.matches.length > 0 ? (
                <div key={bucket.label} className="space-y-3">
                  <p className="text-sm font-semibold text-[#f7f0e2]">{bucket.label}</p>
                  <div className="space-y-2">
                    {bucket.matches.map((match) => (
                      <div key={match.external_match_id} className="flex flex-col gap-3 rounded-[1.25rem] border border-[#3a2b14] bg-[#17120d] p-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-[#f7f0e2]">{match.home_team} {messages.versus} {match.away_team}</p>
                          <p className="text-sm text-[#ccb992]">{match.competition_name}</p>
                          <p className="text-xs text-[#f4bb41]">{messages.matchId}: {match.external_match_id}</p>
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
