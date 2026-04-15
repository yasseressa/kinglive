import Link from "next/link";

import { BrandLogo } from "@/components/layout/BrandLogo";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import type { Locale, Messages } from "@/i18n";

export function Header({ locale, messages }: { locale: Locale; messages: Messages }) {
  const navLinks = [
    { href: `/${locale}#matches`, label: messages.matches, icon: <CalendarIcon /> },
    { href: `/${locale}#news`, label: messages.sportsNews, icon: <NewsIcon /> },
    { href: `/${locale}/contact`, label: messages.contactUs, icon: <MailIcon /> },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(255,194,0,0.16)] bg-[rgba(7,7,7,0.92)] backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-3 py-4 sm:px-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <BrandLogo locale={locale} />
          <div className="lg:hidden">
            <LanguageSwitcher locale={locale} />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-6">
          <nav className="flex flex-wrap gap-2 sm:gap-3">
            {navLinks.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                className={`inline-flex min-h-[3.2rem] items-center gap-2 rounded-[0.95rem] border px-4 text-sm font-extrabold uppercase tracking-[0.08em] transition sm:px-5 ${
                  index === 0
                    ? "border-[#c69111] bg-[rgba(255,194,0,0.06)] text-white shadow-[inset_0_0_0_1px_rgba(255,194,0,0.06)]"
                    : "border-[rgba(255,194,0,0.14)] bg-[#0f0f0f] text-[#d8d1c5] hover:border-[#c69111] hover:text-white"
                }`}
                data-disable-global-redirect
              >
                <span className="text-[#f1bc26]">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
          </nav>

          <div className="hidden lg:block">
            <LanguageSwitcher locale={locale} />
          </div>
        </div>
      </div>
    </header>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <path d="M5 5h11a3 3 0 0 1 3 3v10H8a3 3 0 0 1-3-3V5Z" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 6h16v12H4z" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}
