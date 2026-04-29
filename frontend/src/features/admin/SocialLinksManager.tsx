"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminToast } from "@/components/admin/AdminToast";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Locale, Messages } from "@/i18n";
import { getAdminToken } from "@/lib/auth";
import { getRedirectSettings, updateRedirectSettings } from "@/lib/api";
import type { RedirectSettings } from "@/lib/api/types";

type SocialKey = "facebook_url" | "youtube_url" | "instagram_url" | "telegram_url" | "whatsapp_url";

const socialOptions: Array<{ key: SocialKey; messageKey: string }> = [
  { key: "facebook_url", messageKey: "facebookUrl" },
  { key: "youtube_url", messageKey: "youtubeUrl" },
  { key: "instagram_url", messageKey: "instagramUrl" },
  { key: "telegram_url", messageKey: "telegramUrl" },
  { key: "whatsapp_url", messageKey: "whatsappUrl" },
];

export function SocialLinksManager({ locale: _locale, messages }: { locale: Locale; messages: Messages }) {
  const text = messages as Record<string, string>;
  const [settings, setSettings] = useState<RedirectSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<SocialKey>("facebook_url");
  const [urlValue, setUrlValue] = useState("");
  const [editingKey, setEditingKey] = useState<SocialKey | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SocialKey | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    getRedirectSettings(token)
      .then((response) => setSettings(response))
      .catch((err) => setError(err instanceof Error ? err.message : messages.loadFailed));
  }, [messages.loadFailed]);

  const rows = useMemo(() => {
    if (!settings) return [];
    return socialOptions
      .map((option) => ({
        key: option.key,
        label: text[option.messageKey] ?? option.messageKey,
        value: settings[option.key],
      }))
      .filter((row) => row.value);
  }, [settings, text]);

  async function persist(nextSettings: RedirectSettings, successMessage: string) {
    const token = getAdminToken();
    if (!token) return;
    setError(null);
    try {
      const updated = await updateRedirectSettings(nextSettings, token);
      setSettings(updated);
      setToastMessage(successMessage);
      setEditingKey(null);
      setDeleteTarget(null);
      setUrlValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.loadFailed);
    }
  }

  function startEdit(key: SocialKey, value: string) {
    setEditingKey(key);
    setSelectedKey(key);
    setUrlValue(value);
  }

  function resetForm() {
    setEditingKey(null);
    setSelectedKey("facebook_url");
    setUrlValue("");
  }

  async function handleSave() {
    if (!settings || !urlValue) return;
    await persist({ ...settings, [selectedKey]: urlValue }, messages.saveSuccess);
  }

  async function handleDelete() {
    if (!settings || !deleteTarget) return;
    await persist({ ...settings, [deleteTarget]: null }, text.deleteSuccess ?? "Item deleted successfully.");
  }

  return (
    <div className="space-y-6">
      <AdminToast message={toastMessage} onClose={() => setToastMessage(null)} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={text.confirmDeleteTitle ?? "Confirm deletion"}
        description={text.confirmDeleteMessage ?? "This item will be deleted permanently."}
        confirmLabel={text.delete ?? "Delete"}
        cancelLabel={text.cancelAction ?? "Cancel"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#931800]">{messages.admin}</p>
        <h1 className="text-4xl font-black text-[#222]">{messages.socialLinks}</h1>
      </div>
      {error ? <p className="text-sm text-[#931800]">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[#ddd] px-5 py-4">
            <h2 className="text-2xl font-black text-[#222]">{text.savedItems ?? messages.socialLinks}</h2>
            <Button variant="ghost" onClick={resetForm}>{messages.createNew}</Button>
          </div>
          {rows.length === 0 ? <div className="p-6 text-[#626883]">{text.noSavedItems ?? messages.manageSocialLinks}</div> : null}
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eceef2] text-[#931800]">
                  <tr>
                    <th className="px-4 py-3 text-left">{text.platform ?? "Platform"}</th>
                    <th className="px-4 py-3 text-left">{messages.targetUrl}</th>
                    <th className="px-4 py-3 text-left">{messages.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-t border-[#ddd]">
                      <td className="px-4 py-3 text-[#222]">{row.label}</td>
                      <td className="px-4 py-3 text-[#626883]">{row.value}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => startEdit(row.key, row.value ?? "")}>{messages.edit}</Button>
                          <button type="button" onClick={() => setDeleteTarget(row.key)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#f0b4a8] bg-[#fff1ee] text-[#b42318] transition hover:bg-[#ffe1dc]" aria-label={text.delete ?? "Delete"}>
                            <TrashIcon />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black text-[#222]">{editingKey ? messages.edit : messages.socialLinks}</h2>
            {editingKey ? <Button variant="secondary" onClick={resetForm}>{messages.createNew}</Button> : null}
          </div>
          <p className="text-sm text-[#626883]">{messages.manageSocialLinks}</p>
          <Select value={selectedKey} onChange={(e) => setSelectedKey(e.target.value as SocialKey)} disabled={Boolean(editingKey)}>
            {socialOptions.map((option) => (
              <option key={option.key} value={option.key}>{text[option.messageKey] ?? option.messageKey}</option>
            ))}
          </Select>
          <Input value={urlValue} onChange={(e) => setUrlValue(e.target.value)} placeholder={messages.targetUrl} />
          <Button onClick={handleSave} disabled={!settings || !urlValue}>
            {editingKey ? messages.update : messages.save}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.8" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M10 11v6M14 11v6" />
      <path d="M6 7l1 12h10l1-12" />
      <path d="M9 7V4h6v3" />
    </svg>
  );
}


