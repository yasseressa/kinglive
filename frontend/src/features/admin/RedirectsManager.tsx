"use client";

import { useEffect, useState } from "react";

import { AdminToast } from "@/components/admin/AdminToast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import type { Locale, Messages } from "@/i18n";
import { getRedirectSettings, updateRedirectSettings } from "@/lib/api";
import type { RedirectSettings } from "@/lib/api/types";
import { getAdminToken } from "@/lib/auth";

const defaultCooldownSeconds = 30;
const maxCooldownSeconds = 86400;

export function RedirectsManager({ locale: _locale, messages }: { locale: Locale; messages: Messages }) {
  const [settings, setSettings] = useState<RedirectSettings | null>(null);
  const [targetUrl, setTargetUrl] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(String(defaultCooldownSeconds));
  const [openInNewTab, setOpenInNewTab] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLoading(false);
      return;
    }

    getRedirectSettings(token)
      .then((response) => {
        setSettings(response);
        setTargetUrl(response.fallback_url ?? "");
        setCooldownSeconds(String(response.default_cooldown_seconds ?? defaultCooldownSeconds));
        setOpenInNewTab(response.open_in_new_tab);
      })
      .catch((err) => setError(err instanceof Error ? err.message : messages.loadFailed))
      .finally(() => setLoading(false));
  }, [messages.loadFailed]);

  async function handleSave() {
    const token = getAdminToken();
    if (!token || !settings) return;

    const normalizedUrl = targetUrl.trim();
    const parsedCooldown = Number(cooldownSeconds);
    const nextCooldownSeconds = Number.isFinite(parsedCooldown)
      ? Math.min(Math.max(Math.trunc(parsedCooldown), 0), maxCooldownSeconds)
      : defaultCooldownSeconds;

    setSaving(true);
    setError(null);
    try {
      const updated = await updateRedirectSettings(
        {
          ...settings,
          enabled: Boolean(normalizedUrl),
          fallback_url: normalizedUrl || null,
          default_cooldown_seconds: nextCooldownSeconds,
          open_in_new_tab: openInNewTab,
          active_campaign_id: null,
        },
        token,
      );

      setSettings(updated);
      setTargetUrl(updated.fallback_url ?? "");
      setCooldownSeconds(String(updated.default_cooldown_seconds ?? defaultCooldownSeconds));
      setOpenInNewTab(updated.open_in_new_tab);
      setToastMessage(messages.saveSuccess);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.loadFailed);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast message={toastMessage} onClose={() => setToastMessage(null)} />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#931800]">{messages.admin}</p>
        <h1 className="text-4xl font-black text-[#222]">{messages.redirects}</h1>
        <p className="mt-2 text-sm text-[#626883]">{messages.manageRedirects}</p>
      </div>

      {error ? <p className="text-sm text-[#931800]">{error}</p> : null}

      <Card className="max-w-3xl space-y-5">
        <div className="border-b border-[#ddd] pb-4">
          <h2 className="text-2xl font-black text-[#222]">{messages.settings}</h2>
        </div>

        {loading ? (
          <p className="text-[#626883]">{messages.loading}</p>
        ) : (
          <div className="space-y-4">
            <Input
              value={targetUrl}
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder={messages.targetUrl}
              dir="ltr"
              data-disable-global-redirect="true"
            />
            <Input
              value={cooldownSeconds}
              onChange={(event) => setCooldownSeconds(event.target.value)}
              placeholder={messages.intervalSeconds}
              type="number"
              min={0}
              max={maxCooldownSeconds}
              data-disable-global-redirect="true"
            />
            <label className="flex items-center gap-3 rounded-lg border border-[#ddd] bg-[#f6f7fa] px-4 py-3 text-sm font-semibold text-[#222]">
              <input
                type="checkbox"
                checked={openInNewTab}
                onChange={(event) => setOpenInNewTab(event.target.checked)}
                data-disable-global-redirect="true"
              />
              {messages.openInNewTab}
            </label>
            <Button onClick={handleSave} disabled={!settings || saving} data-disable-global-redirect="true">
              {saving ? messages.loading : messages.save}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
