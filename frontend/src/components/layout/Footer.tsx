import Link from "next/link";

import { BrandLogo } from "@/components/layout/BrandLogo";
import type { Locale, Messages } from "@/i18n";

export function Footer({ locale, messages }: { locale: Locale; messages: Messages }) {
  return (
    <footer className="mt-auto bg-white text-[#222] shadow-[0_0_4px_rgba(0,0,0,0.3)]">
      <div className="mx-auto flex max-w-[1024px] flex-col gap-5 px-3 py-6 md:flex-row md:items-center md:justify-between">
        <div className="space-y-3 text-center md:text-start">
          <BrandLogo locale={locale} compact />
          <p className="max-w-md text-sm leading-7 text-[#484848]">{messages.footerTagline}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm font-semibold text-[#484848] md:justify-end">
          <Link href={`/${locale}`} className="rounded-lg px-2 py-1 transition hover:text-[#931800]" data-disable-global-redirect>{messages.home}</Link>
          <Link href={`/${locale}/contact`} className="rounded-lg px-2 py-1 transition hover:text-[#931800]" data-disable-global-redirect>{messages.contactUs}</Link>
        </div>
      </div>
      <div className="bg-[#eceef2]">
        <div className="mx-auto max-w-[1024px] px-3 py-4 text-center text-xs text-[#222]">
          (c) 2026 King Live
        </div>
      </div>
    </footer>
  );
}
