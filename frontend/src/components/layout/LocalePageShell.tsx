"use client";

import { usePathname } from "next/navigation";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import type { Locale, Messages } from "@/i18n";

export function LocalePageShell({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.includes(`/${locale}/admin`);

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#eceef2] text-[#111827]">
      <Header locale={locale} messages={messages} />
      <main className="mx-auto min-h-[calc(100vh-180px)] w-full max-w-[1024px] px-2 py-3 min-[420px]:px-3 sm:py-4">
        {children}
      </main>
      <Footer locale={locale} messages={messages} />
    </div>
  );
}
