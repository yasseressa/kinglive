"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

export function HlsVideo({ src, title }: { src: string; title: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    if (!Hls.isSupported()) {
      video.src = src;
      return;
    }

    const hls = new Hls();
    hls.loadSource(src);
    hls.attachMedia(video);

    return () => {
      hls.destroy();
    };
  }, [src]);

  return <video ref={videoRef} controls playsInline className="aspect-[16/9] w-full bg-black" aria-label={title} />;
}
