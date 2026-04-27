"use client";

import { useRef, useEffect } from "react";

export type AvatarEstado = "aguardando" | "pensando" | "comunicando";

const VIDEOS: Record<AvatarEstado, string> = {
  aguardando: "/videos/aguardando.mp4",
  pensando: "/videos/pensando.mp4",
  comunicando: "/videos/comunicando.mp4",
};

const LABELS: Record<AvatarEstado, string> = {
  aguardando: "Aguardando...",
  pensando: "Pensando...",
  comunicando: "Respondendo",
};

export default function AvatarPlayer({ estado }: { estado: AvatarEstado }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = VIDEOS[estado];
    video.loop = true;
    video.play().catch(() => {});
  }, [estado]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/10 to-secondary/10">
        <video
          ref={videoRef}
          className="w-full"
          autoPlay
          loop
          playsInline
          muted
        />
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            estado === "aguardando"
              ? "bg-gray-400"
              : estado === "pensando"
              ? "bg-yellow-400 animate-pulse"
              : "bg-green-500 animate-pulse"
          }`}
        />
        <span className="text-xs text-muted-foreground">{LABELS[estado]}</span>
      </div>
    </div>
  );
}
