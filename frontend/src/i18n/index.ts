export const locales = ["ar", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";

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
    case "en":
    default:
      return (await import("@/messages/en.json")).default;
  }
}

export type Messages = Awaited<ReturnType<typeof getMessages>>;
