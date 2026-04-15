import type { Locale } from "@/i18n";

export const siteConfig = {
  name: "Melbet Live",
  description: "Multilingual football matches and news platform",
  adminStorageKey: "melbet-admin-token",
  redirectStorageKey: "melbet-last-redirect",
  defaultSocialLinks: [
    { label: "Facebook", href: "https://facebook.com" },
    { label: "YouTube", href: "https://youtube.com" },
    { label: "Instagram", href: "https://instagram.com" },
    { label: "Telegram", href: "https://telegram.org" },
    { label: "WhatsApp", href: "https://whatsapp.com" },
  ],
};

export function getLocaleLabel(locale: Locale) {
  if (locale === "ar") return "العربية";
  if (locale === "fr") return "Français";
  if (locale === "es") return "Español";
  return "English";
}
