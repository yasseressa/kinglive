"use client";

import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-5 text-[#222] shadow-[0_25px_80px_rgba(0,0,0,0.24)]">
        <h3 className="text-xl font-semibold text-[#222]">{title}</h3>
        <p className="mt-3 text-sm leading-7 text-[#626883]">{description}</p>
        <div className="mt-6 flex items-center justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button type="button" onClick={onConfirm} disabled={busy} className="bg-[#d8583d] text-[#222] hover:bg-[#eb6a4f]">
            {busy ? "..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}


