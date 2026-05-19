"use client";

import { useRef, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";

export type AvatarEstado = "aguardando" | "pensando" | "comunicando";

const VIDEOS: Record<AvatarEstado, string[]> = {
  aguardando:  ["/videos/aguardando.mp4", "/videos/aguardando2.mp4"],
  pensando:    ["/videos/pensando.mp4"],
  comunicando: ["/videos/comunicando.mp4", "/videos/comunicando2.mp4", "/videos/comunicando3.mp4"],
};

const LABELS: Record<AvatarEstado, string> = {
  aguardando:  "Aguardando...",
  pensando:    "Pensando...",
  comunicando: "Respondendo",
};

const FADE = 400; // ms do crossfade

function pickRandom(pool: string[], avoid?: string): string {
  if (pool.length === 1) return pool[0];
  const opts = avoid ? pool.filter(v => v !== avoid) : pool;
  return opts[Math.floor(Math.random() * opts.length)];
}

interface AvatarPlayerProps {
  estado: AvatarEstado;
  mutado: boolean;
  onToggleMudo: () => void;
}

export default function AvatarPlayer({ estado, mutado, onToggleMudo }: AvatarPlayerProps) {
  const refA     = useRef<HTMLVideoElement>(null);
  const refB     = useRef<HTMLVideoElement>(null);
  const fgSlot   = useRef<"a" | "b">("a");   // qual slot está visível
  const lastSrc  = useRef<string>("");

  useEffect(() => {
    const videoA = refA.current;
    const videoB = refB.current;
    if (!videoA || !videoB) return;

    let cancelled = false;

    const pool = VIDEOS[estado];
    const loop = pool.length === 1;

    const fg  = () => fgSlot.current === "a" ? videoA : videoB;
    const bg  = () => fgSlot.current === "a" ? videoB : videoA;

    /**
     * Carrega `src` no slot de fundo (invisível), espera o primeiro frame,
     * faz crossfade com o slot de frente e troca os papéis.
     */
    const crossfadeTo = async (src: string) => {
      const bgVid = bg();
      const fgVid = fg();

      // Prepara o slot de fundo sem mostrar ainda
      bgVid.src  = src;
      bgVid.loop = loop;
      bgVid.style.transition = "none";
      bgVid.style.opacity    = "0";

      // Aguarda o primeiro frame estar pronto — sem blank
      try {
        await bgVid.play();
      } catch {
        bgVid.src = pool[0];
        bgVid.play().catch(() => {});
      }

      if (cancelled) return;

      lastSrc.current = src;

      // Crossfade simultâneo: bg entra, fg sai
      bgVid.style.transition = `opacity ${FADE}ms ease`;
      bgVid.style.opacity    = "1";
      fgVid.style.transition = `opacity ${FADE}ms ease`;
      fgVid.style.opacity    = "0";

      await new Promise<void>(r => setTimeout(r, FADE));
      if (cancelled) return;

      fgVid.pause();
      fgSlot.current = fgSlot.current === "a" ? "b" : "a";
    };

    // Inicia o primeiro vídeo deste estado
    crossfadeTo(pickRandom(pool, lastSrc.current));

    if (loop) {
      return () => { cancelled = true; };
    }

    // Ao terminar, crossfade para o próximo
    const onEnded = () => {
      if (cancelled) return;
      crossfadeTo(pickRandom(pool, lastSrc.current));
    };

    const onError = () => {
      if (cancelled) return;
      crossfadeTo(pool[0]);
    };

    videoA.addEventListener("ended", onEnded);
    videoB.addEventListener("ended", onEnded);
    videoA.addEventListener("error", onError);
    videoB.addEventListener("error", onError);

    return () => {
      cancelled = true;
      videoA.removeEventListener("ended", onEnded);
      videoB.removeEventListener("ended", onEnded);
      videoA.removeEventListener("error", onError);
      videoB.removeEventListener("error", onError);
    };
  }, [estado]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-full aspect-square">
        {/* brilho externo */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-secondary opacity-20 blur-md" />

        {/* borda gradiente */}
        <div className="absolute inset-0 rounded-full p-[3px] bg-gradient-to-br from-primary to-secondary">
          <div className="relative w-full h-full rounded-full overflow-hidden bg-background">
            {/* Slot A — começa como foreground */}
            <video
              ref={refA}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 8%", opacity: 1 }}
              playsInline
              muted
            />
            {/* Slot B — começa como background */}
            <video
              ref={refB}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: "center 8%", opacity: 0 }}
              playsInline
              muted
            />
          </div>
        </div>

        {/* Botão mudo */}
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
        {mutado && <span className="text-xs text-muted-foreground">(mudo)</span>}
      </div>
    </div>
  );
}
