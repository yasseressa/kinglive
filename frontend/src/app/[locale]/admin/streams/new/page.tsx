import { notFound } from "next/navigation";

import { StreamEditor } from "@/features/admin/StreamEditor";
import { getMessages, isLocale } from "@/i18n";
import { getHomePageData } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function NewStreamPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = await getMessages(locale);
  const initialMatchBuckets = await getHomePageData(locale).catch(() => null);

  return <StreamEditor locale={locale} messages={messages} initialMatchBuckets={initialMatchBuckets} />;
}
