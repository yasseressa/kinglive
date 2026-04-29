import Link from "next/link";

import { siteConfig } from "@/config/site";
import { getMessages, isLocale } from "@/i18n";
import { getSocialLinks } from "@/lib/api";
import type { SocialLink } from "@/lib/api/types";
import { notFound } from "next/navigation";

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;

  if (!isLocale(locale)) {
    notFound();
  }

  const [messages, socialLinks] = await Promise.all([
    getMessages(locale),
    getSocialLinks()
      .then((response) => (response.items.length > 0 ? response.items : siteConfig.defaultSocialLinks))
      .catch(() => siteConfig.defaultSocialLinks),
  ]);

  return (
    <div className="space-y-5 pb-8">
      <section className="overflow-hidden rounded-lg bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
        <div className="border-b border-[#ddd] bg-[#eceef2] p-3 sm:p-4">
          <h1 className="inline-flex items-center justify-center rounded-lg bg-[#273340] px-3 py-1.5 text-base font-semibold text-white sm:text-lg">
            {messages.contactUs}
          </h1>
          <p className="mt-4 max-w-[42rem] text-sm leading-7 text-[#484848] sm:text-base">
            {messages.contactIntro}
          </p>
        </div>

        <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {socialLinks.map((link) => (
            <ContactCard key={link.label} link={link} />
          ))}
        </div>

        <div className="border-t border-[#ddd] bg-[#f6f7fa] px-4 py-5 text-sm leading-7 text-[#484848]">
          <p className="font-semibold text-[#222]">{siteConfig.name}</p>
          <p className="mt-1">{siteConfig.description}</p>
        </div>
      </section>
    </div>
  );
}

function ContactCard({ link }: { link: SocialLink }) {
  return (
    <Link
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className="group flex min-h-[118px] items-center gap-4 rounded-lg bg-[#eceef2] p-4 text-[#222] transition hover:bg-[#e2e5eb] hover:text-[#931800]"
      data-disable-global-redirect
      aria-label={link.label}
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-white text-[#931800] shadow-[0_0_4px_rgba(0,0,0,0.16)]">
        <SocialIcon label={link.label} />
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">{link.label}</span>
        <span className="mt-1 block text-sm text-[#626883] group-hover:text-[#931800]">فتح وسيلة التواصل</span>
      </span>
    </Link>
  );
}

function SocialIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();

  if (normalized.includes("facebook")) {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M14 8.7V7.2c0-.7.5-1.2 1.2-1.2H17V3h-2.6C11.9 3 10 4.9 10 7.4v1.3H7.8V12H10v9h3.4v-9h2.7l.5-3.3H14Z" />
      </svg>
    );
  }

  if (normalized.includes("youtube")) {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.6 12 4.6 12 4.6s-5.6 0-7.5.5a3 3 0 0 0-2.1 2.1A31.2 31.2 0 0 0 2 12a31.2 31.2 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.9.5 7.5.5 7.5.5s5.6 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.2 31.2 0 0 0 22 12a31.2 31.2 0 0 0-.4-4.8ZM10 15.4V8.6l5.8 3.4L10 15.4Z" />
      </svg>
    );
  }

  if (normalized.includes("telegram")) {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M21.7 4.4 18.4 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.8 13.5 1 12c-1-.3-1-1 .2-1.5L20 3.3c.9-.3 1.7.2 1.7 1.1Z" />
      </svg>
    );
  }

  if (normalized.includes("whatsapp")) {
    return (
      <svg viewBox="0 0 24 24" className="h-7 w-7 fill-current" aria-hidden="true">
        <path d="M12 2a9.8 9.8 0 0 0-8.4 14.9L2.5 22l5.2-1.4A9.9 9.9 0 1 0 12 2Zm5.8 14.1c-.2.7-1.3 1.3-1.9 1.4-.5.1-1.2.2-3.7-.8-3.1-1.3-5.1-4.5-5.3-4.7-.1-.2-1.2-1.6-1.2-3.1s.8-2.2 1.1-2.5c.3-.3.6-.4.8-.4h.6c.2 0 .5 0 .7.5l.9 2.2c.1.2.1.5 0 .7l-.5.7c-.2.2-.3.4-.1.7.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.5-.3.8-.2l2.1 1c.3.2.6.3.7.5.1.1.1.8-.1 1.5Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}
