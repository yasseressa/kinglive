import Link from "next/link";

import { Card } from "@/components/ui/Card";
import type { Locale, Messages } from "@/i18n";

export function AdminDashboard({ locale, messages }: { locale: Locale; messages: Messages }) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#931800]">{messages.admin}</p>
        <h1 className="text-3xl font-semibold text-[#222] sm:text-4xl">{messages.adminOverview}</h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold text-[#222]">{messages.streamLinks}</h2>
          <p className="text-sm leading-6 text-[#626883]">{messages.manageStreams}</p>
          <Link href={`/${locale}/admin/streams`} className="inline-flex rounded-lg bg-[#273340] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#931800]">
            {messages.streamLinks}
          </Link>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold text-[#222]">{messages.redirects}</h2>
          <p className="text-sm leading-6 text-[#626883]">{messages.manageRedirects}</p>
          <Link href={`/${locale}/admin/redirects`} className="inline-flex rounded-lg bg-[#273340] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#931800]">
            {messages.redirects}
          </Link>
        </Card>
        <Card className="space-y-3">
          <h2 className="text-xl font-semibold text-[#222]">{messages.socialLinks}</h2>
          <p className="text-sm leading-6 text-[#626883]">{messages.manageSocialLinks}</p>
          <Link href={`/${locale}/admin/socials`} className="inline-flex rounded-lg bg-[#273340] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#931800]">
            {messages.socialLinks}
          </Link>
        </Card>
      </div>
    </div>
  );
}


