import type { Locale, Messages } from "@/i18n";
import type { MatchSummary } from "@/lib/api/types";

import { EmptyState } from "@/components/system/EmptyState";
import { MatchCard } from "@/components/matches/MatchCard";

export function MatchListSection({
  locale,
  title,
  matches,
  emptyLabel,
  messages,
}: {
  locale: Locale;
  title: string;
  matches: MatchSummary[];
  emptyLabel: string;
  messages: Messages;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="rounded-lg bg-[#273340] px-3 py-1.5 text-base font-semibold text-white">{title}</h2>
        <div className="ms-4 h-px flex-1 bg-[#d8dbe1]" />
      </div>
      {matches.length === 0 ? (
        <EmptyState message={emptyLabel} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.external_match_id} locale={locale} match={match} messages={messages} />
          ))}
        </div>
      )}
    </section>
  );
}
