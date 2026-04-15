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
    <div className="space-y-8 pb-10 sm:space-y-10 lg:space-y-12 lg:pb-14">
      <section className="rounded-[1.85rem] border border-[rgba(255,194,0,0.14)] bg-[linear-gradient(180deg,#0a0a0a_0%,#070707_100%)] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.34)] sm:p-6 lg:p-8">
        <div>
          <h1 className="text-[2rem] font-black uppercase leading-none tracking-[-0.04em] text-white sm:text-[2.5rem]">
            {messages.contactUs} <span className="text-[#f1bc26]">{messages.socialLinks}</span>
          </h1>
          <span className="mt-3 block h-[3px] w-16 bg-[#f1bc26]" />
          <p className="mt-4 max-w-[42rem] text-sm leading-7 text-[#a9a39a] sm:text-base">
            {messages.contactIntro}
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {socialLinks.map((link) => (
            <ContactCard key={link.label} link={link} />
          ))}
        </div>

        <div className="mt-8 rounded-[1.35rem] border border-[rgba(255,194,0,0.12)] bg-[#101010] px-5 py-5 text-sm leading-7 text-[#beb8ad]">
          <p className="font-bold text-white">{siteConfig.name}</p>
          <p className="mt-2">{siteConfig.description}</p>
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
      className="rounded-[1.3rem] border border-[rgba(255,194,0,0.12)] bg-[#101010] p-5 transition hover:border-[#f1bc26]"
      data-disable-global-redirect
    >
      <p className="text-[0.7rem] font-extrabold uppercase tracking-[0.18em] text-[#f1bc26]">{link.label}</p>
      <p className="mt-3 break-all text-sm leading-7 text-[#d8d2c7]">{link.href}</p>
    </Link>
  );
}
