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
import { createRedirect, deleteRedirect, getRedirectSettings, getRedirects, updateRedirect, updateRedirectSettings } from "@/lib/api";
import type { RedirectCampaign, RedirectCampaignPayload, RedirectSettings } from "@/lib/api/types";

const emptyCampaign: RedirectCampaignPayload = {
  name: "",
  target_url: "",
  is_active: true,
  cooldown_seconds: 30,
  start_at: null,
  end_at: null,
};

export function RedirectsManager({ locale: _locale, messages }: { locale: Locale; messages: Messages }) {
  const text = messages as Record<string, string>;
  const [campaigns, setCampaigns] = useState<RedirectCampaign[]>([]);
  const [settings, setSettings] = useState<RedirectSettings | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState<RedirectCampaignPayload>(emptyCampaign);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const loadCampaigns = async () => {
    const token = getAdminToken();
    if (!token) return;
    const redirectsResponse = await getRedirects(token);
    setCampaigns(redirectsResponse.items);
  };

  const loadSettings = async () => {
    const token = getAdminToken();
    if (!token) return;
    const settingsResponse = await getRedirectSettings(token);
    setSettings(settingsResponse);
  };

  useEffect(() => {
    loadCampaigns().catch((err) => setCampaignError(err instanceof Error ? err.message : messages.loadFailed));
    loadSettings().catch((err) => setSettingsError(err instanceof Error ? err.message : messages.loadFailed));
  }, [messages.loadFailed]);

  const selectedCampaign = useMemo(() => campaigns.find((campaign) => campaign.id === editingId) ?? null, [campaigns, editingId]);

  useEffect(() => {
    if (!selectedCampaign) return;
    setCampaignForm({
      name: selectedCampaign.name,
      target_url: selectedCampaign.target_url,
      is_active: selectedCampaign.is_active,
      cooldown_seconds: selectedCampaign.cooldown_seconds,
      start_at: selectedCampaign.start_at ?? null,
      end_at: selectedCampaign.end_at ?? null,
    });
  }, [selectedCampaign]);

  function resetCampaignForm() {
    setEditingId(null);
    setCampaignForm(emptyCampaign);
  }

  async function handleSaveCampaign() {
    const token = getAdminToken();
    if (!token) return;
    setCampaignError(null);
    try {
      if (editingId) {
        await updateRedirect(editingId, campaignForm, token);
      } else {
        await createRedirect(campaignForm, token);
      }
      await loadCampaigns();
      setToastMessage(messages.saveSuccess);
      resetCampaignForm();
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : messages.loadFailed);
    }
  }

  async function handleDeleteCampaign() {
    const token = getAdminToken();
    if (!token || !deleteTarget) return;
    try {
      await deleteRedirect(deleteTarget, token);
      await loadCampaigns();
      await loadSettings();
      setToastMessage(text.deleteSuccess ?? "Item deleted successfully.");
      if (editingId === deleteTarget) resetCampaignForm();
      setDeleteTarget(null);
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : messages.loadFailed);
    }
  }

  async function handleSaveSettings() {
    const token = getAdminToken();
    if (!token || !settings) return;
    setSettingsError(null);
    try {
      await updateRedirectSettings(settings, token);
      await loadSettings();
      setToastMessage(messages.saveSuccess);
    } catch (err) {
      setSettingsError(err instanceof Error ? err.message : messages.loadFailed);
    }
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
        onConfirm={handleDeleteCampaign}
        onCancel={() => setDeleteTarget(null)}
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#931800]">{messages.admin}</p>
        <h1 className="text-4xl font-black text-[#222]">{messages.redirects}</h1>
        <p className="mt-2 text-sm text-[#626883]">{messages.manageRedirects}</p>
      </div>

      {campaignError ? <p className="text-sm text-[#931800]">{campaignError}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[#ddd] px-5 py-4">
            <h2 className="text-2xl font-black text-[#222]">{text.savedItems ?? messages.campaigns}</h2>
            <Button variant="ghost" onClick={resetCampaignForm}>{messages.createNew}</Button>
          </div>
          {campaigns.length === 0 ? <div className="p-6 text-[#626883]">{text.noSavedItems ?? messages.empty}</div> : null}
          {campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eceef2] text-[#931800]">
                  <tr>
                    <th className="px-4 py-3 text-left">{messages.campaigns}</th>
                    <th className="px-4 py-3 text-left">{messages.targetUrl}</th>
                    <th className="px-4 py-3 text-left">{messages.intervalSeconds}</th>
                    <th className="px-4 py-3 text-left">{messages.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-t border-[#ddd]">
                      <td className="px-4 py-3 text-[#222]">{campaign.name}</td>
                      <td className="px-4 py-3 text-[#626883]">{campaign.target_url}</td>
                      <td className="px-4 py-3 text-[#626883]">{campaign.cooldown_seconds}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => setEditingId(campaign.id)}>{messages.edit}</Button>
                          <button type="button" onClick={() => setDeleteTarget(campaign.id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#f0b4a8] bg-[#fff1ee] text-[#b42318] transition hover:bg-[#ffe1dc]" aria-label={text.delete ?? "Delete"}>
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
            <h2 className="text-2xl font-black text-[#222]">{editingId ? messages.update : messages.createCampaign}</h2>
            {editingId ? <Button variant="secondary" onClick={resetCampaignForm}>{messages.createNew}</Button> : null}
          </div>
          <Input value={campaignForm.name} onChange={(e) => setCampaignForm((c) => ({ ...c, name: e.target.value }))} placeholder={messages.createCampaign} />
          <Input value={campaignForm.target_url} onChange={(e) => setCampaignForm((c) => ({ ...c, target_url: e.target.value }))} placeholder={messages.targetUrl} />
          <Input value={String(campaignForm.cooldown_seconds)} onChange={(e) => setCampaignForm((c) => ({ ...c, cooldown_seconds: Number(e.target.value) || 0 }))} placeholder={messages.intervalSeconds} />
          <label className="flex items-center gap-3 text-sm font-semibold text-[#222]">
            <input type="checkbox" checked={campaignForm.is_active} onChange={(e) => setCampaignForm((c) => ({ ...c, is_active: e.target.checked }))} />
            {messages.enabled}
          </label>
          <Button onClick={handleSaveCampaign}>{editingId ? messages.update : messages.save}</Button>

          <div className="border-t border-[#ddd] pt-4">
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[#222]">{messages.settings}</h2>
              {settingsError ? <p className="text-sm text-[#931800]">{settingsError}</p> : null}
            </div>
            {settings ? (
              <div className="mt-4 space-y-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-[#222]">
                  <input type="checkbox" checked={settings.enabled} onChange={(e) => setSettings((current) => current ? { ...current, enabled: e.target.checked } : current)} />
                  {messages.enabled}
                </label>
                <Input value={String(settings.default_cooldown_seconds)} onChange={(e) => setSettings((current) => current ? { ...current, default_cooldown_seconds: Number(e.target.value) || 0 } : current)} placeholder={messages.intervalSeconds} />
                <Input value={settings.fallback_url ?? ""} onChange={(e) => setSettings((current) => current ? { ...current, fallback_url: e.target.value } : current)} placeholder={messages.targetUrl} />
                <Select value={settings.active_campaign_id ?? ""} onChange={(e) => setSettings((current) => current ? { ...current, active_campaign_id: e.target.value || null } : current)}>
                  <option value="">{messages.noActiveCampaign}</option>
                  {campaigns.map((campaign) => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </Select>
                <label className="flex items-center gap-3 text-sm font-semibold text-[#222]">
                  <input type="checkbox" checked={settings.open_in_new_tab} onChange={(e) => setSettings((current) => current ? { ...current, open_in_new_tab: e.target.checked } : current)} />
                  {messages.openInNewTab}
                </label>
                <Button onClick={handleSaveSettings}>{messages.save}</Button>
              </div>
            ) : (
              <p className="mt-4 text-[#626883]">{messages.loading}</p>
            )}
          </div>
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


