"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { localeMeta, localizePathname, locales, type Locale } from "@/i18n";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#273340] px-3 text-white shadow-[0_0_4px_rgba(0,0,0,0.18)] transition hover:bg-[#931800]"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={localeMeta[locale].label}
      >
        <GlobeIcon />
        <span className="hidden text-sm font-bold min-[420px]:inline">{localeMeta[locale].nativeLabel}</span>
        <ChevronIcon isOpen={isOpen} />
      </button>

      <div
        className={`absolute top-[calc(100%+0.45rem)] z-50 min-w-[13rem] overflow-hidden rounded-lg border border-[#ddd] bg-white p-2 shadow-[0_12px_30px_rgba(0,0,0,0.22)] transition-all duration-200 ${
          locale === "ar" ? "left-0" : "right-0"
        } ${isOpen ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"}`}
      >
        <div className="mb-1 px-2 py-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[#626883]">
          Language
        </div>
        <div className="space-y-1">
          {locales.map((item) => {
            const active = item === locale;
            const href = `${localizePathname(pathname, item)}${query ? `?${query}` : ""}`;

            return (
              <Link
                key={item}
                href={href}
                className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  active ? "bg-[#931800] text-white" : "text-[#222] hover:bg-[#eceef2] hover:text-[#931800]"
                }`}
                data-disable-global-redirect
                prefetch={false}
                title={localeMeta[item].label}
                onClick={() => setIsOpen(false)}
              >
                <span>{localeMeta[item].nativeLabel}</span>
                <span className={`text-[0.68rem] uppercase tracking-[0.14em] ${active ? "text-white/80" : "text-[#626883]"}`}>
                  {item}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[1.1rem] w-[1.1rem] fill-none stroke-current" strokeWidth="1.7" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15.3 15.3 0 0 1 0 18M12 3a15.3 15.3 0 0 0 0 18" />
    </svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 fill-none stroke-current transition-transform ${isOpen ? "rotate-180" : ""}`}
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
