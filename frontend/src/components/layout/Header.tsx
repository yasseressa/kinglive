import Link from "next/link";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import type { Locale, Messages } from "@/i18n";

export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const navLinks = [
    { href: `/${locale}`, label: messages.home },
  ];

  return (
    <header className="relative z-40 mb-3 bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
      <div className="mx-auto flex min-h-[85px] max-w-[1024px] flex-col gap-3 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-center gap-3 sm:justify-start">
          <BrandLogo locale={locale} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav className="flex flex-wrap justify-center gap-1 sm:justify-start">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg px-2.5 py-2 text-[15px] font-semibold text-[#222] transition hover:text-[#931800] sm:text-[17px]"
                data-disable-global-redirect
              >
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex justify-center">
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </div>
    </header>
  );
}
