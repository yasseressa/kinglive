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
import { createStream, deleteStream, getHomePageData, getStreams, updateStream } from "@/lib/api";
import type { HomeResponse, StreamLink } from "@/lib/api/types";

const emptyForm = {
  external_match_id: "",
  stream_url: "",
  stream_type: "iframe" as StreamLink["stream_type"],
  show_stream: true,
};

export function StreamsPage({ locale, messages, initialMatchBuckets }: { locale: Locale; messages: Messages; initialMatchBuckets?: HomeResponse | null }) {
  const text = messages as Record<string, string>;
  const [items, setItems] = useState<StreamLink[]>([]);
  const [matchBuckets, setMatchBuckets] = useState<HomeResponse | null>(initialMatchBuckets ?? null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const loadStreams = async () => {
    const token = getAdminToken();
    if (!token) return;
    const response = await getStreams(token);
    setItems(response.items);
  };

  useEffect(() => {
    loadStreams()
      .catch((err) => setError(err instanceof Error ? err.message : messages.loadFailed))
      .finally(() => setLoading(false));
  }, [messages.loadFailed]);

  useEffect(() => {
    if (initialMatchBuckets) return;
    getHomePageData(locale).then(setMatchBuckets).catch(() => setMatchBuckets(null));
  }, [initialMatchBuckets, locale]);

  const availableMatches = useMemo(
    () => (matchBuckets ? [...matchBuckets.today_matches, ...matchBuckets.tomorrow_matches, ...matchBuckets.yesterday_matches] : []),
    [matchBuckets],
  );

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function startEdit(item: StreamLink) {
    setEditingId(item.external_match_id);
    setForm({
      external_match_id: item.external_match_id,
      stream_url: item.stream_url,
      stream_type: item.stream_type,
      show_stream: item.show_stream,
    });
  }

  async function handleSubmit() {
    const token = getAdminToken();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editingId) {
        await updateStream(editingId, { stream_url: form.stream_url, stream_type: form.stream_type, show_stream: form.show_stream }, token);
      } else {
        await createStream(form, token);
      }
      await loadStreams();
      setToastMessage(messages.saveSuccess);
      startCreate();
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.loadFailed);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    const token = getAdminToken();
    if (!token || !deleteTarget) return;
    setDeleteBusy(true);
    try {
      await deleteStream(deleteTarget, token);
      await loadStreams();
      setToastMessage(text.deleteSuccess ?? "Item deleted successfully.");
      if (editingId === deleteTarget) startCreate();
      setDeleteTarget(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : messages.loadFailed);
    } finally {
      setDeleteBusy(false);
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
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        busy={deleteBusy}
      />

      <div>
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#931800]">{messages.admin}</p>
        <h1 className="text-4xl font-black text-[#222]">{messages.streamLinks}</h1>
        <p className="mt-2 text-sm text-[#626883]">{messages.manageStreams}</p>
      </div>

      {error ? <p className="text-sm text-[#931800]">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-[#ddd] px-5 py-4">
            <h2 className="text-2xl font-black text-[#222]">{text.savedItems ?? messages.streamLinks}</h2>
            <Button variant="ghost" onClick={startCreate}>{messages.createNew}</Button>
          </div>
          {loading ? <div className="p-6 text-[#931800]">{messages.loading}</div> : null}
          {!loading && items.length === 0 ? <div className="p-6 text-[#626883]">{text.noSavedItems ?? messages.noStreamsYet}</div> : null}
          {!loading && items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#eceef2] text-[#931800]">
                  <tr>
                    <th className="px-4 py-3 text-left">{messages.matchId}</th>
                    <th className="px-4 py-3 text-left">{messages.streamType}</th>
                    <th className="px-4 py-3 text-left">{messages.visible}</th>
                    <th className="px-4 py-3 text-left">{messages.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.external_match_id} className="border-t border-[#ddd]">
                      <td className="px-4 py-3 text-[#222]">{item.external_match_id}</td>
                      <td className="px-4 py-3 text-[#626883]">{streamTypeLabel(item.stream_type, messages)}</td>
                      <td className="px-4 py-3 text-[#626883]">{item.show_stream ? messages.visible : messages.hidden}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button variant="ghost" onClick={() => startEdit(item)}>{messages.edit}</Button>
                          <button type="button" onClick={() => setDeleteTarget(item.external_match_id)} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#f0b4a8] bg-[#fff1ee] text-[#b42318] transition hover:bg-[#ffe1dc]" aria-label={text.delete ?? "Delete"}>
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
            <h2 className="text-2xl font-black text-[#222]">{editingId ? messages.editStream : messages.createStream}</h2>
            {editingId ? <Button variant="secondary" onClick={startCreate}>{messages.createNew}</Button> : null}
          </div>
          <Input value={form.external_match_id} onChange={(e) => setForm((current) => ({ ...current, external_match_id: e.target.value }))} placeholder={messages.externalMatchId} disabled={Boolean(editingId)} />
          <Input value={form.stream_url} onChange={(e) => setForm((current) => ({ ...current, stream_url: e.target.value }))} placeholder={messages.streamUrl} />
          <Select value={form.stream_type} onChange={(e) => setForm((current) => ({ ...current, stream_type: e.target.value as StreamLink["stream_type"] }))}>
            <option value="iframe">{messages.streamTypeIframe}</option>
            <option value="external">{messages.streamTypeExternal}</option>
            <option value="embed">{messages.streamTypeEmbed}</option>
            <option value="hls">{messages.streamTypeHls}</option>
          </Select>
          <label className="flex items-center gap-3 text-sm font-semibold text-[#222]">
            <input type="checkbox" checked={form.show_stream} onChange={(e) => setForm((current) => ({ ...current, show_stream: e.target.checked }))} />
            {messages.showStream}
          </label>
          <Button onClick={handleSubmit} disabled={submitting || !form.external_match_id || !form.stream_url}>
            {submitting ? messages.loading : editingId ? messages.update : messages.save}
          </Button>

          {availableMatches.length > 0 ? (
            <div className="space-y-3 border-t border-[#ddd] pt-4">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#931800]">{messages.availableMatches}</p>
              <div className="max-h-[18rem] space-y-2 overflow-auto">
                {availableMatches.map((match) => (
                  <button key={match.external_match_id} type="button" onClick={() => setForm((current) => ({ ...current, external_match_id: match.external_match_id }))} className="block w-full rounded-lg border border-[#ddd] bg-[#f6f7fa] px-3 py-3 text-left transition hover:border-[#931800]">
                    <p className="font-semibold text-[#222]">{match.home_team} {messages.versus} {match.away_team}</p>
                    <p className="text-xs text-[#931800]">{messages.matchId}: {match.external_match_id}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function streamTypeLabel(streamType: StreamLink["stream_type"], messages: Messages) {
  if (streamType === "iframe") return messages.streamTypeIframe;
  if (streamType === "external") return messages.streamTypeExternal;
  if (streamType === "embed") return messages.streamTypeEmbed;
  return messages.streamTypeHls;
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


