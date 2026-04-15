export const locales = ["ar", "en", "fr", "es"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

export const localeMeta: Record<Locale, { label: string; nativeLabel: string }> = {
  ar: { label: "Arabic", nativeLabel: "العربية" },
  en: { label: "English", nativeLabel: "English" },
  fr: { label: "French", nativeLabel: "Français" },
  es: { label: "Spanish", nativeLabel: "Español" },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export async function getMessages(locale: Locale) {
  switch (locale) {
    case "ar":
      return (await import("@/messages/ar.json")).default;
    case "fr":
      return (await import("@/messages/fr.json")).default;
    case "es":
      return (await import("@/messages/es.json")).default;
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export function localizePathname(pathname: string | null | undefined, targetLocale: Locale) {
  if (!pathname || pathname === "/") {
    return `/${targetLocale}`;
  }

  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return `/${targetLocale}`;
  }

  if (isLocale(segments[0])) {
    segments[0] = targetLocale;
    return `/${segments.join("/")}`;
  }

  return `/${targetLocale}/${segments.join("/")}`;
}

export type Messages = Awaited<ReturnType<typeof getMessages>>;
