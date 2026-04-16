import { clsx } from "clsx";

const MATCH_DURATION_MS = 2 * 60 * 60 * 1000;

export type MatchDisplayStatus = "live" | "finished" | "scheduled" | "postponed" | "cancelled";

export function cn(...inputs: Array<string | false | null | undefined>) {
  return clsx(inputs);
}

export function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getDisplayMatchStatus(rawStatus: string, startTime: string, now = new Date()): MatchDisplayStatus {
  const normalized = rawStatus.toLowerCase();

  if (normalized === "postponed") return "postponed";
  if (normalized === "cancelled") return "cancelled";

  const kickoff = new Date(startTime);
  if (Number.isNaN(kickoff.getTime())) {
    return normalized === "finished" ? "finished" : "scheduled";
  }

  if (now.getTime() < kickoff.getTime()) {
    return "scheduled";
  }

  if (now.getTime() <= kickoff.getTime() + MATCH_DURATION_MS) {
    return "live";
  }

  return "finished";
}

export function getMatchBucket(startTime: string, now = new Date()): "yesterday" | "today" | "tomorrow" | null {
  const kickoff = new Date(startTime);
  if (Number.isNaN(kickoff.getTime())) return null;

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const dayAfterTomorrowStart = new Date(todayStart);
  dayAfterTomorrowStart.setDate(todayStart.getDate() + 2);

  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  if (kickoff >= todayStart && kickoff < tomorrowStart) return "today";
  if (kickoff >= yesterdayStart && kickoff < todayStart) return "yesterday";
  if (kickoff >= tomorrowStart && kickoff < dayAfterTomorrowStart) return "tomorrow";

  return null;
}
