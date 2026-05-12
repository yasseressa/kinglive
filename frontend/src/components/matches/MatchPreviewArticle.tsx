import { Card } from "@/components/ui/Card";
import type { Locale, Messages } from "@/i18n";
import type { MatchDetails } from "@/lib/api/types";
import { formatDate, getDisplayMatchStatus } from "@/lib/utils";

export function MatchPreviewArticle({ locale, match, messages }: { locale: Locale; match: MatchDetails; messages: Messages }) {
  const status = getDisplayMatchStatus(match.status, match.start_time);
  const copy = buildPreviewCopy(locale, match, messages, status);

  return (
    <Card className="mx-auto w-full max-w-[900px] overflow-hidden border border-[#d8dbe1] bg-white shadow-[0_0_4px_rgba(0,0,0,0.12)]">
      <div className="border-b border-[#eceef2] bg-[#f7f8fb] p-4 min-[420px]:p-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#931800]">{copy.eyebrow}</p>
        <h2 className="mt-3 text-2xl font-bold leading-tight text-[#222] min-[420px]:text-3xl">{copy.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#626883] min-[420px]:text-base">{copy.summary}</p>
      </div>

      <div className="grid gap-4 p-4 min-[420px]:p-6 lg:grid-cols-[1.2fr_0.8fr]">
        <article className="space-y-4 text-sm leading-7 text-[#484848] min-[420px]:text-base min-[420px]:leading-8">
          {copy.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </article>

        <aside className="space-y-3">
          {copy.details.map((detail) => (
            <div key={detail.label} className="rounded-xl bg-[#f4f5f8] p-4">
              <p className="text-xs font-bold text-[#626883]">{detail.label}</p>
              <p className="mt-1 text-base font-bold text-[#222]">{detail.value}</p>
            </div>
          ))}
        </aside>
      </div>

      <div className="border-t border-[#eceef2] bg-[#fff7f5] p-4 text-sm font-semibold text-[#931800] min-[420px]:p-5">
        {copy.note}
      </div>
    </Card>
  );
}

function buildPreviewCopy(locale: Locale, match: MatchDetails, messages: Messages, status: string) {
  const date = formatDate(match.start_time, locale);
  const venue = match.venue || fallbackVenue(locale);
  const statusText = statusLabel(status, messages);

  if (locale === "ar") {
    return {
      eyebrow: "تقديم المباراة",
      title: `${match.home_team} ضد ${match.away_team} في ${match.competition_name}`,
      summary: `تعرف على موعد مباراة ${match.home_team} و${match.away_team} ضمن منافسات ${match.competition_name}، مع أهم التفاصيل قبل انطلاق اللقاء.`,
      paragraphs: [
        `تتجه الأنظار إلى مواجهة ${match.home_team} أمام ${match.away_team} في مباراة ينتظرها جمهور الفريقين ضمن منافسات ${match.competition_name}. وتأتي هذه الصفحة لتجميع أبرز معلومات اللقاء في مكان واحد، بداية من الموعد وحتى حالة المباراة وآخر الأخبار المرتبطة بها.`,
        `يدخل الفريقان المباراة بطموح تحقيق نتيجة إيجابية، بينما تبقى التفاصيل الصغيرة مثل البداية القوية، استغلال الفرص، والانضباط الدفاعي عوامل مهمة قد تصنع الفارق خلال مجريات اللقاء.`,
        `سيتم تحديث صفحة المباراة عند توفر رابط بث مباشر أو معلومات إضافية، ويمكنك متابعة الأخبار ذات الصلة أسفل الصفحة للحصول على صورة أوسع عن استعدادات الفريقين وسياق المواجهة.`,
      ],
      details: [
        { label: "البطولة", value: match.competition_name },
        { label: "الموعد", value: date },
        { label: "الحالة", value: statusText },
        { label: "الملعب", value: venue },
      ],
      note: "لا يوجد بث مباشر متاح لهذه المباراة حاليًا، لذلك نعرض لك تقديمًا سريعًا ومعلومات المباراة إلى حين توفر البث.",
    };
  }

  return {
    eyebrow: "Match preview",
    title: `${match.home_team} vs ${match.away_team} in ${match.competition_name}`,
    summary: `Preview ${match.home_team} against ${match.away_team}, including kickoff time, competition details, and the current match status.`,
    paragraphs: [
      `${match.home_team} meet ${match.away_team} in ${match.competition_name}, with both sides looking for a strong performance and a positive result.`,
      `The match could be shaped by early momentum, defensive discipline, and how efficiently each team turns possession into chances.`,
      `This page will continue to show the key match information, and the player area can be updated when a live stream becomes available.`,
    ],
    details: [
      { label: "Competition", value: match.competition_name },
      { label: "Kickoff", value: date },
      { label: "Status", value: statusText },
      { label: "Venue", value: venue },
    ],
    note: messages.noStreamAvailable,
  };
}

function fallbackVenue(locale: Locale) {
  return locale === "ar" ? "غير محدد" : "Not confirmed";
}

function statusLabel(status: string, messages: Messages) {
  if (status === "live") return messages.liveNowLabel;
  if (status === "finished") return messages.finished;
  if (status === "scheduled") return messages.comingUp;
  if (status === "postponed") return messages.postponed;
  if (status === "cancelled") return messages.cancelled;
  return status;
}
