"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { localeMeta, localizePathname, locales, type Locale } from "@/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-[#4d3a1a] bg-[#17120d] p-1 shadow-card backdrop-blur">
      {locales.map((item) => {
        const active = item === locale;
        const href = `${localizePathname(pathname, item)}${query ? `?${query}` : ""}`;

        return (
          <Link
            key={item}
            href={href}
            className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
              active ? "bg-[#f4bb41] text-[#17120d]" : "text-[#efe5d3] hover:bg-[#2a2117]"
            }`}
            data-disable-global-redirect
            prefetch={false}
            title={localeMeta[item].label}
          >
            {localeMeta[item].nativeLabel}
          </Link>
        );
      })}
    </div>
  );
}
