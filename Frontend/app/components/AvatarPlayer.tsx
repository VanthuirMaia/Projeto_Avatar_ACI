"use client";

import { useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

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

interface AvatarPlayerProps {
  estado: AvatarEstado;
  mutado: boolean;
  onToggleMudo: () => void;
}

export default function AvatarPlayer({ estado, mutado, onToggleMudo }: AvatarPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.src = VIDEOS[estado];
    video.loop = true;
    video.play().catch(() => {});
  }, [estado]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Moldura circular com borda gradiente */}
      <div className="relative w-full aspect-square">
        {/* brilho externo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20 blur-md" />

        {/* borda gradiente: wrapper com padding + fundo gradiente */}
        <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-br from-primary to-secondary">
          <div className="w-full h-full rounded-full overflow-hidden bg-background">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ objectPosition: "center 8%" }}
              autoPlay
              loop
              playsInline
              muted
            />
          </div>
        </div>

        {/* Botão mudo/voz — canto inferior direito da moldura */}
        <button
          onClick={onToggleMudo}
          title={mutado ? "Ativar voz" : "Silenciar voz"}
          className={`
            absolute bottom-2 right-2 z-10
            w-9 h-9 rounded-full flex items-center justify-center
            shadow-md border-2 transition-colors duration-200
            ${mutado
              ? "bg-muted border-border text-muted-foreground hover:bg-muted/80"
              : "bg-primary border-primary text-white hover:bg-primary/90"
            }
          `}
        >
          {mutado ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Indicador de estado */}
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
        {mutado && (
          <span className="text-xs text-muted-foreground">(mudo)</span>
        )}
      </div>
    </div>
  );
}
