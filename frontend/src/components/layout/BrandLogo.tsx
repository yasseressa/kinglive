import Link from "next/link";

import type { Locale } from "@/i18n";

export function BrandLogo({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return (
    <Link href={`/${locale}`} className="inline-flex items-center" data-disable-global-redirect>
      <span
        className={`flex flex-col items-center justify-center rounded-lg bg-[#931800] px-4 py-1.5 text-center text-white shadow-[0_0_4px_rgba(0,0,0,0.3)] ${
          compact ? "min-h-11 min-w-[132px]" : "min-h-[70px] min-w-[172px] sm:min-w-[200px]"
        }`}
      >
        <span className={`font-bold leading-8 ${compact ? "text-xl" : "text-2xl sm:text-[30px]"}`}>Goal Stream</span>
        <span className={`leading-6 opacity-95 ${compact ? "text-xs" : "text-sm sm:text-base"}`}>melbet-live</span>
      </span>
    </Link>
  );
}
