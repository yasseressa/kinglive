"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { siteConfig } from "@/config/site";
import { getRedirectConfig } from "@/lib/api";
import type { RedirectConfig } from "@/lib/api/types";

export function GlobalClickRedirectProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const configRef = useRef<RedirectConfig | null>(null);
  const configRequestRef = useRef<Promise<RedirectConfig | null> | null>(null);

  useEffect(() => {
    if (pathname.includes("/admin")) {
      return;
    }

    refreshRedirectConfig()
      .then((config) => {
        configRef.current = config;
      })
      .catch(() => {
        configRef.current = null;
      });
  }, [pathname]);

  useEffect(() => {
    if (pathname.includes("/admin")) {
      return;
    }

    const handleClick = (event: MouseEvent) => {
      const config = configRef.current;
      if (!config?.enabled || !config.target_url) {
        refreshRedirectConfig().catch(() => undefined);
        return;
      }

      const now = Date.now();
      const lastRedirect = Number(window.localStorage.getItem(siteConfig.redirectStorageKey) || 0);
      if (now - lastRedirect < config.interval_seconds * 1000) {
        refreshRedirectConfig().catch(() => undefined);
        return;
      }

      window.localStorage.setItem(siteConfig.redirectStorageKey, String(now));
      event.preventDefault();
      event.stopPropagation();
      if (config.open_in_new_tab) {
        const redirectedWindow = window.open(config.target_url, "_blank");
        if (redirectedWindow) {
          redirectedWindow.opener = null;
        }
      } else {
        window.location.href = config.target_url;
      }
      refreshRedirectConfig().catch(() => undefined);
    };

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname]);

  async function refreshRedirectConfig() {
    if (!configRequestRef.current) {
      configRequestRef.current = getRedirectConfig()
        .then((config) => {
          configRef.current = config;
          return config;
        })
        .catch(() => {
          configRef.current = null;
          return null;
        })
        .finally(() => {
          configRequestRef.current = null;
        });
    }

    return configRequestRef.current;
  }

  return <>{children}</>;
}
