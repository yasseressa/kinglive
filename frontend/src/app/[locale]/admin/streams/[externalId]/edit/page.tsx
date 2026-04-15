import { notFound } from "next/navigation";

import { StreamEditor } from "@/features/admin/StreamEditor";
import { getMessages, isLocale } from "@/i18n";
import { getHomePageData } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function EditStreamPage({
  params,
}: {
  params: Promise<{ locale: string; externalId: string }>;
}) {
  const { locale, externalId } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = await getMessages(locale);
  const initialMatchBuckets = await getHomePageData(locale).catch(() => null);

  return (
    <StreamEditor
      locale={locale}
      messages={messages}
      externalId={decodeURIComponent(externalId)}
      initialMatchBuckets={initialMatchBuckets}
    />
  );
}
