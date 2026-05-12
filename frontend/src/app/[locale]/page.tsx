import { notFound } from "next/navigation";

import { HomePageView } from "@/features/home/HomePageView";
import { getMessages, isLocale } from "@/i18n";
import { getHomePageData } from "@/lib/api";
import type { HomeResponse } from "@/lib/api/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const emptyHomePageData: HomeResponse = {
  yesterday_matches: [],
  today_matches: [],
  tomorrow_matches: [],
  latest_news: [],
};

export default async function LocaleHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [messages, data] = await Promise.all([
    getMessages(locale),
    getHomePageData(locale).catch((error) => {
      console.error("home_page_data_load_failed", error);
      return emptyHomePageData;
    }),
  ]);

  return <HomePageView locale={locale} messages={messages} data={data} />;
}
