import { EmptyState } from "@/components/system/EmptyState";
import { NewsCard } from "@/components/news/NewsCard";
import type { Locale } from "@/i18n";
import type { NewsSummary } from "@/lib/api/types";

export function NewsListSection({ locale, title, articles, emptyLabel, readMoreLabel }: { locale: Locale; title: string; articles: NewsSummary[]; emptyLabel: string; readMoreLabel: string }) {
  return (
    <section id="news" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="rounded-lg bg-[#273340] px-3 py-1.5 text-base font-semibold text-white">{title}</h2>
        <div className="ms-4 h-px flex-1 bg-[#d8dbe1]" />
      </div>
      {articles.length === 0 ? (
        <EmptyState message={emptyLabel} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {articles.map((article) => (
            <NewsCard key={article.slug} locale={locale} article={article} readMoreLabel={readMoreLabel} />
          ))}
        </div>
      )}
    </section>
  );
}
