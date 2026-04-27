"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockMensagensChat, perguntasRapidas } from "../../mock/data";
import { buscarRespostaChat } from "../../utils/api";
import AvatarPlayer, { AvatarEstado } from "../../components/AvatarPlayer";
import { RespostaChat } from "../../utils/api";

interface Mensagem {
  id: string;
  tipo: "user" | "assistant";
  conteudo: string;
  hora: string;
}

export default function AssistantPage() {
  const [mensagens, setMensagens] = useState<Mensagem[]>(mockMensagensChat);
  const [input, setInput] = useState("");
  const [processando, setProcessando] = useState(false);
  const [avatarEstado, setAvatarEstado] = useState<AvatarEstado>("aguardando");
  const avatarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [mensagens]);

  const gerarId = () => crypto.randomUUID();

  const horaNow = () =>
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const falarTexto = (texto: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setAvatarEstado("aguardando");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texto);
    utterance.lang = "pt-BR";
    utterance.rate = 0.95;
    utterance.onend = () => setAvatarEstado("aguardando");
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const enviarMensagem = async (texto?: string) => {
    const mensagemTexto = texto || input.trim();
    if (!mensagemTexto || processando) return;

    setMensagens((prev) => [
      ...prev,
      { id: gerarId(), tipo: "user", conteudo: mensagemTexto, hora: horaNow() },
    ]);
    setInput("");
    setProcessando(true);
    setAvatarEstado("pensando");

    let resposta: RespostaChat;
    try {
      resposta = await buscarRespostaChat(mensagemTexto, "geral");
    } catch {
      resposta = {
        content: "Não foi possível conectar ao servidor. Verifique se o backend está rodando na porta 5022.",
        audio_base64: null,
      };
    }

    setMensagens((prev) => [
      ...prev,
      { id: gerarId(), tipo: "assistant", conteudo: resposta.content, hora: horaNow() },
    ]);
    setProcessando(false);
    setAvatarEstado("comunicando");

    if (resposta.audio_base64) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`data:audio/mpeg;base64,${resposta.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setAvatarEstado("aguardando");
      audio.play().catch(() => falarTexto(resposta.content));
    } else {
      falarTexto(resposta.content);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarMensagem();
  };

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">
      <div className="flex-1 flex flex-col">
        <div className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Assistente Educacional IA</h1>
              <p className="text-sm text-muted-foreground">
                Especialista em Educação Inclusiva
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {mensagens.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Olá! Como posso ajudar hoje?
              </h2>
              <p className="text-muted-foreground">
                Pergunte sobre educação inclusiva, adaptações pedagógicas e mais.
              </p>
            </div>
          )}

          <AnimatePresence>
            {mensagens.map((mensagem) => (
              <motion.div
                key={mensagem.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-4 ${
                  mensagem.tipo === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {mensagem.tipo === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-2xl px-5 py-4 rounded-2xl shadow-sm ${
                    mensagem.tipo === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{mensagem.conteudo}</p>
                  <span className="text-xs opacity-70 mt-2 block">
                    {mensagem.hora}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {processando && (
            <motion.div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-5 py-4">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-primary rounded-full"
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {mensagens.length === 0 && (
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground mb-3">Perguntas rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {perguntasRapidas.map((pergunta, i) => (
                <button
                  key={i}
                  onClick={() => enviarMensagem(pergunta)}
                  className="px-4 py-2 bg-card border border-border rounded-full text-sm hover:border-primary"
                >
                  {pergunta}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border-t border-border p-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-4 py-3 border border-border rounded-lg"
            />
            <button
              type="submit"
              disabled={!input.trim() || processando}
              className="px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Sidebar do Avatar — altura total da área do chat */}
      <div className="hidden lg:flex lg:flex-col w-96 bg-card border-l border-border p-6 gap-4 overflow-y-auto">
        <h3 className="font-semibold">Sua Assistente</h3>
        <div className="flex-1 flex flex-col justify-center">
          <AvatarPlayer estado={avatarEstado} />
        </div>
        <p className="text-sm text-muted-foreground text-center">
          Especialista em educação inclusiva.
        </p>
      </div>
    </div>
  );
}
