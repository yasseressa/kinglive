"use client";

import { useEffect, useState } from "react";

const POPUP_STORAGE_KEY = "goal-stream-bottom-image-popup-dismissed";

export function BottomImagePopup() {
  const imageUrl = process.env.NEXT_PUBLIC_POPUP_AD_IMAGE_URL?.trim();
  const linkUrl = process.env.NEXT_PUBLIC_POPUP_AD_LINK_URL?.trim();
  const imageAlt = process.env.NEXT_PUBLIC_POPUP_AD_ALT?.trim() || "Advertisement";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!imageUrl || !linkUrl || window.sessionStorage.getItem(POPUP_STORAGE_KEY) === "1") {
      return;
    }

    const timerId = window.setTimeout(() => {
      setVisible(true);
    }, 700);

    return () => window.clearTimeout(timerId);
  }, [imageUrl, linkUrl]);

  if (!imageUrl || !linkUrl) {
    return null;
  }

  const handleClick = () => {
    window.sessionStorage.setItem(POPUP_STORAGE_KEY, "1");
    setVisible(false);
    window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`fixed inset-x-0 bottom-3 z-50 mx-auto w-[min(92vw,360px)] overflow-hidden rounded-lg bg-white p-0 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-[opacity,transform] duration-[1500ms] ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-[130%] opacity-0"
      }`}
      aria-label={imageAlt}
      data-disable-global-redirect
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt={imageAlt} className="block h-auto w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </button>
  );
}
