import { Card } from "@/components/ui/Card";
import type { Locale, Messages } from "@/i18n";
import type { NewsArticle } from "@/lib/api/types";
import { formatDate } from "@/lib/utils";

export function NewsArticleView({ locale, messages, article }: { locale: Locale; messages: Messages; article: NewsArticle }) {
  return (
    <article className="mx-auto max-w-4xl space-y-6">
      <Card className="overflow-hidden p-0">
        {article.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.image_url} alt={article.title} className="h-[320px] w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : null}
        <div className="space-y-4 p-6 sm:p-8">
          <p className="text-xs font-bold text-[#931800]">{article.source}</p>
          <h1 className="text-3xl font-semibold leading-tight text-[#222] sm:text-4xl">{article.title}</h1>
          <p className="text-sm text-[#626883]">{messages.publishedOn}: {formatDate(article.published_at, locale)}</p>
          <div className="prose-content text-base leading-8 text-[#333]">
            {article.content.split("\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
      </Card>
    </article>
  );
}
