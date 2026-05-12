"use client";

import { useEffect, useRef, useState } from "react";

const INITIAL_POPUP_DELAY_MS = 700;
const POPUP_REPEAT_DELAY_MS = 30_000;

interface PopupAdConfig {
  imageUrl: string;
  linkUrl: string;
  alt: string;
}

export function BottomImagePopup() {
  const [config, setConfig] = useState<PopupAdConfig | null>(null);
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/v1/popup-ad/config", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: PopupAdConfig | null) => {
        if (!active || !payload?.imageUrl?.trim() || !payload?.linkUrl?.trim()) {
          return;
        }

        setConfig({
          imageUrl: payload.imageUrl.trim(),
          linkUrl: payload.linkUrl.trim(),
          alt: payload.alt?.trim() || "Advertisement",
        });

        showTimerRef.current = window.setTimeout(() => {
          if (active) {
            setVisible(true);
          }
        }, INITIAL_POPUP_DELAY_MS);
      })
      .catch(() => undefined);

    return () => {
      active = false;
      if (showTimerRef.current !== null) {
        window.clearTimeout(showTimerRef.current);
      }
    };
  }, []);

  if (!config) {
    return null;
  }

  const handleClick = () => {
    setVisible(false);
    window.open(config.linkUrl, "_blank", "noopener,noreferrer");

    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
    }

    showTimerRef.current = window.setTimeout(() => {
      setVisible(true);
    }, POPUP_REPEAT_DELAY_MS);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`fixed inset-x-0 bottom-3 z-50 mx-auto w-[min(92vw,360px)] overflow-hidden rounded-lg bg-white p-0 shadow-[0_18px_50px_rgba(0,0,0,0.32)] transition-[opacity,transform] duration-[1500ms] ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-[130%] opacity-0"
      }`}
      aria-label={config.alt}
      data-disable-global-redirect
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={config.imageUrl} alt={config.alt} className="block h-auto w-full object-contain" loading="lazy" referrerPolicy="no-referrer" />
    </button>
  );
}
