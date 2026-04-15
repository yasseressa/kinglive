import Link from "next/link";

import type { Locale } from "@/i18n";

export function BrandLogo({ locale, compact = false }: { locale: Locale; compact?: boolean }) {
  return (
    <Link href={`/${locale}`} className="inline-flex items-center gap-3" data-disable-global-redirect>
      <span className={`flex items-center justify-center rounded-[1rem] border border-[rgba(255,194,0,0.24)] bg-[linear-gradient(180deg,#171717_0%,#0c0c0c_100%)] text-[#f1bc26] shadow-[0_10px_24px_rgba(0,0,0,0.3)] ${compact ? "h-11 w-11" : "h-14 w-14 sm:h-16 sm:w-16"}`}>
        <ShieldBallIcon compact={compact} />
      </span>
      <span className={`flex flex-col font-black uppercase leading-none ${compact ? "gap-0.5" : "gap-1"}`}>
        <span className={`tracking-[0.08em] text-white ${compact ? "text-base" : "text-lg sm:text-xl"}`}>Melbet</span>
        <span className={`tracking-[0.08em] text-[#f1bc26] ${compact ? "text-base" : "text-lg sm:text-xl"}`}>Live</span>
      </span>
    </Link>
  );
}

function ShieldBallIcon({ compact }: { compact: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={compact ? "h-6 w-6" : "h-8 w-8"} fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M12 2 20 5v6c0 5-3.3 8.5-8 11-4.7-2.5-8-6-8-11V5l8-3Z" />
      <circle cx="12" cy="11" r="3.3" />
      <path d="M9.6 8.8 12 7.2l2.4 1.6v2.5L12 13l-2.4-1.7Z" />
      <path d="M12 7.2V5.6M9.6 8.8 7.8 7.9M14.4 8.8l1.8-.9M9.6 11.3l-1.8.8M14.4 11.3l1.8.8M12 13v1.7" />
    </svg>
  );
}
