import Link from "next/link";

import { Button } from "@/components/ui/Button";
import type { Messages } from "@/i18n";
import type { StreamLink } from "@/lib/api/types";

export function MatchPlayer({ stream, canShowPlayer, messages }: { stream?: StreamLink | null; canShowPlayer: boolean; messages: Messages }) {
  if (!canShowPlayer || !stream) {
    return (
      <div className="mx-auto w-full max-w-[860px] rounded-lg border border-dashed border-[#d8dbe1] bg-white p-4 text-[#666] shadow-[0_0_4px_rgba(0,0,0,0.12)] min-[420px]:p-6">
        {messages.noStreamAvailable}
      </div>
    );
  }

  if (stream.stream_type === "iframe" || stream.stream_type === "embed") {
    return (
      <div className="mx-auto w-full max-w-[860px] overflow-hidden rounded-lg border border-[#ddd] bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
        <iframe
          src={stream.stream_url}
          className="aspect-[16/9] w-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title={messages.playerTitle}
        />
      </div>
    );
  }

  if (stream.stream_type === "external") {
    return (
      <div className="mx-auto w-full max-w-[860px] rounded-lg border border-[#ddd] bg-white p-4 shadow-[0_0_4px_rgba(0,0,0,0.3)] min-[420px]:p-6">
        <Link href={stream.stream_url} target="_blank" rel="noreferrer" data-disable-global-redirect>
          <Button>{messages.watchMatch}</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[860px] overflow-hidden rounded-lg border border-[#ddd] bg-white shadow-[0_0_4px_rgba(0,0,0,0.3)]">
      <video src={stream.stream_url} controls className="aspect-[16/9] w-full" />
    </div>
  );
}
