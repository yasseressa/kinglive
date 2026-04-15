"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { siteConfig } from "@/config/site";
import type { Locale, Messages } from "@/i18n";
import { clearAdminToken, getAdminToken } from "@/lib/auth";

export function AdminShell({ children, locale, messages }: { children: React.ReactNode; locale: Locale; messages: Messages }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname.endsWith("/admin/login");
  const [ready, setReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    setAuthenticated(Boolean(token));
    setReady(true);
    if (!token && !isLoginPage) {
      router.replace(`/${locale}/admin/login`);
    }
  }, [isLoginPage, locale, router]);

  const links = useMemo(
    () => [
      { href: `/${locale}/admin`, label: messages.dashboard },
      { href: `/${locale}/admin/streams`, label: messages.streamLinks },
      { href: `/${locale}/admin/redirects`, label: messages.redirects },
      { href: `/${locale}/admin/socials`, label: messages.socialLinks },
      { href: `/${locale}`, label: messages.publicSite },
    ],
    [locale, messages.dashboard, messages.publicSite, messages.redirects, messages.socialLinks, messages.streamLinks],
  );

  if (isLoginPage) {
    return <div className="min-h-screen bg-[var(--background)]">{children}</div>;
  }

  if (!ready || !authenticated) {
    return <div className="flex min-h-screen items-center justify-center text-[#f4bb41]">{messages.loading}</div>;
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto grid min-h-screen max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <aside className="rounded-[1.75rem] border border-[#4b3818] bg-[linear-gradient(180deg,_#17120d,_#0d0d0d)] p-5 text-[#f5efe3] shadow-card">
          <p className="text-xs uppercase tracking-[0.3em] text-[#f4bb41]">{siteConfig.name}</p>
          <div className="mt-4">
            <LanguageSwitcher locale={locale} />
          </div>
          <nav className="mt-8 space-y-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="block rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-[#21180f] hover:text-[#f4bb41]">
                {link.label}
              </Link>
            ))}
          </nav>
          <Button
            className="mt-8 w-full"
            variant="secondary"
            onClick={() => {
              clearAdminToken();
              router.replace(`/${locale}/admin/login`);
            }}
          >
            {messages.logout}
          </Button>
        </aside>
        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}
