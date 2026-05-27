"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send, Sparkles, UserCircle2, ChevronDown,
  Plus, Trash2, MessageSquare,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { perguntasRapidas } from "../../mock/data";
import { buscarRespostaChat } from "../../utils/api";
import { useAlunos } from "../../context/AlunosContext";
import { useChatHistory } from "../../context/ChatHistoryContext";
import type { ChatMensagem as Mensagem } from "../../context/ChatHistoryContext";
import type { ChatSession } from "../../context/ChatHistoryContext";
import type { Aluno } from "../../mock/data";
import AvatarPlayer, { AvatarEstado } from "../../components/AvatarPlayer";
import { RespostaChat } from "../../utils/api";

// ── Agrupamento por data ──────────────────────────────────────────────────────
function grupoData(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff <= 7) return "Últimos 7 dias";
  return "Mais antigos";
}

function agruparSessoes(sessions: ChatSession[]): { label: string; items: ChatSession[] }[] {
  const map = new Map<string, ChatSession[]>();
  const ordem = ["Hoje", "Ontem", "Últimos 7 dias", "Mais antigos"];
  for (const s of sessions) {
    const g = grupoData(s.updatedAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(s);
  }
  return ordem.filter(l => map.has(l)).map(l => ({ label: l, items: map.get(l)! }));
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AssistantPage() {
  const { alunos, alunoAtivo } = useAlunos();
  const chatHistory = useChatHistory();

  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [processando, setProcessando] = useState(false);
  const [avatarEstado, setAvatarEstado] = useState<AvatarEstado>("aguardando");
  const [mutado, setMutado] = useState(false);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Aluno | null>(alunoAtivo);
  const mutadoRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  useEffect(() => {
    return () => { audioRef.current?.pause(); };
  }, []);

  // Sincroniza sessionIdRef com o contexto
  useEffect(() => {
    sessionIdRef.current = chatHistory.activeSessionId;
  }, [chatHistory.activeSessionId]);

  const gerarId = () => crypto.randomUUID();
  const horaNow = () =>
    new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  // ── Audio ──────────────────────────────────────────────────────────────────
  // Sem fallback para Web Speech API: a voz padrão do sistema pode ser pt-PT
  // ou variar entre browsers/dispositivos, quebrando a identidade da Lorna.
  // Se ElevenLabs não retornar áudio, o avatar volta a aguardando silenciosamente.
  const toggleMudo = () => {
    const novo = !mutadoRef.current;
    mutadoRef.current = novo;
    setMutado(novo);
    if (novo) {
      audioRef.current?.pause();
      setAvatarEstado("aguardando");
    }
  };

  // ── Histórico: novo chat ──────────────────────────────────────────────────
  const novoChat = () => {
    setMensagens([]);
    sessionIdRef.current = null;
    chatHistory.setActiveSessionId(null);
    audioRef.current?.pause();
    setAvatarEstado("aguardando");
  };

  // ── Histórico: carregar sessão ────────────────────────────────────────────
  const carregarSessao = (session: ChatSession) => {
    setMensagens(session.mensagens);
    sessionIdRef.current = session.id;
    chatHistory.setActiveSessionId(session.id);
    const aluno = session.alunoId
      ? (alunos.find(a => a.id === session.alunoId) ?? null)
      : null;
    setAlunoSelecionado(aluno);
    audioRef.current?.pause();
    setAvatarEstado("aguardando");
  };

  // ── Envio de mensagem ─────────────────────────────────────────────────────
  const enviarMensagem = async (texto?: string) => {
    const mensagemTexto = texto || input.trim();
    if (!mensagemTexto || processando) return;

    const msgUsuario: Mensagem = { id: gerarId(), tipo: "user", conteudo: mensagemTexto, hora: horaNow() };

    // Cria sessão na primeira mensagem
    let sessionId = sessionIdRef.current;
    if (!sessionId) {
      sessionId = chatHistory.criarSessao(
        alunoSelecionado?.id ?? null,
        alunoSelecionado?.nome ?? null,
      );
      sessionIdRef.current = sessionId;
    }

    const comUsuario = [...mensagens, msgUsuario];
    setMensagens(comUsuario);
    setInput("");
    setProcessando(true);
    setAvatarEstado("pensando");

    let resposta: RespostaChat;
    const abortController = new AbortController();
    try {
      resposta = await buscarRespostaChat(mensagemTexto, "geral", alunoSelecionado ?? undefined, abortController.signal);
    } catch (err) {
      const isTimeout = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
      resposta = {
        content: isTimeout
          ? "A Lorna está demorando para responder. Tente novamente em instantes."
          : "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
        audio_base64: null,
      };
    }

    const msgAssistente: Mensagem = { id: gerarId(), tipo: "assistant", conteudo: resposta.content, hora: horaNow() };
    const mensagensFinais = [...comUsuario, msgAssistente];
    setMensagens(mensagensFinais);
    setProcessando(false);
    setAvatarEstado("comunicando");

    // Persiste no histórico
    if (sessionId) chatHistory.atualizarSessao(sessionId, mensagensFinais);

    if (mutadoRef.current) {
      setAvatarEstado("aguardando");
    } else if (resposta.audio_base64) {
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(`data:audio/mpeg;base64,${resposta.audio_base64}`);
      audioRef.current = audio;
      audio.onended = () => setAvatarEstado("aguardando");
      audio.onerror = () => setAvatarEstado("aguardando");
      audio.play().catch(() => setAvatarEstado("aguardando"));
    } else {
      // ElevenLabs indisponível: exibe texto, avatar retorna ao estado padrão
      setAvatarEstado("aguardando");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    enviarMensagem();
  };

  const grupos = agruparSessoes(chatHistory.sessions);

  return (
    <div className="h-full flex flex-col lg:flex-row bg-background">

      {/* ── Área de chat ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="bg-card border-b border-border px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-lg font-bold leading-tight truncate">Assistente IA</h1>
                <p className="text-xs text-muted-foreground hidden sm:block">Especialista em Educação Inclusiva</p>
              </div>
            </div>

            {/* Selector de aluno */}
            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <UserCircle2 className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <div className="relative">
                <select
                  value={alunoSelecionado?.id ?? ""}
                  onChange={(e) => {
                    const aluno = alunos.find((a) => a.id === e.target.value) ?? null;
                    setAlunoSelecionado(aluno);
                    setMensagens([]);
                    sessionIdRef.current = null;
                    chatHistory.setActiveSessionId(null);
                  }}
                  className="appearance-none text-xs sm:text-sm bg-background border border-border rounded-lg pl-2 sm:pl-3 pr-6 sm:pr-8 py-2 text-foreground focus:outline-none focus:border-primary cursor-pointer max-w-[140px] sm:max-w-none"
                >
                  <option value="">Sem aluno</option>
                  {alunos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nome} — {a.diagnostico}, {a.serie}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-3 h-3 sm:w-3.5 sm:h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Banner de contexto ativo */}
          {alunoSelecionado && (
            <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs sm:text-sm">
              <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
              <span className="text-primary font-medium">Contexto:</span>
              <span className="text-foreground">
                {alunoSelecionado.nome} · {alunoSelecionado.diagnostico} · {alunoSelecionado.serie}
              </span>
            </div>
          )}
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {mensagens.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Olá! Como posso ajudar hoje?</h2>
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
                className={`flex gap-4 ${mensagem.tipo === "user" ? "justify-end" : "justify-start"}`}
              >
                {mensagem.tipo === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[85vw] sm:max-w-2xl px-3 py-3 sm:px-5 sm:py-4 rounded-2xl shadow-sm ${
                    mensagem.tipo === "user"
                      ? "bg-primary text-white rounded-tr-sm"
                      : "bg-card border border-border rounded-tl-sm"
                  }`}
                >
                  {mensagem.tipo === "user" ? (
                    <p className="whitespace-pre-wrap">{mensagem.conteudo}</p>
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                        em: ({ children }) => <em className="italic">{children}</em>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                        li: ({ children }) => <li className="ml-2 leading-relaxed">{children}</li>,
                        h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-base font-bold mb-1 mt-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1 mt-1">{children}</h3>,
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-2">{children}</blockquote>
                        ),
                        pre: ({ children }) => (
                          <pre className="bg-muted p-3 rounded-lg text-sm font-mono my-2 overflow-x-auto">{children}</pre>
                        ),
                        code: ({ children }) => (
                          <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                        ),
                        hr: () => <hr className="border-border my-3" />,
                      }}
                    >
                      {mensagem.conteudo}
                    </ReactMarkdown>
                  )}
                  <span className="text-xs opacity-70 mt-2 block">{mensagem.hora}</span>
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

        {/* Perguntas rápidas */}
        {mensagens.length === 0 && (
          <div className="px-3 sm:px-6 pb-3 sm:pb-4">
            <p className="text-sm text-muted-foreground mb-2 sm:mb-3">Perguntas rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {perguntasRapidas.map((pergunta, i) => (
                <button
                  key={i}
                  onClick={() => enviarMensagem(pergunta)}
                  className="px-3 py-2 sm:px-4 bg-card border border-border rounded-full text-xs sm:text-sm hover:border-primary min-h-[44px]"
                >
                  {pergunta}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input — fixo no bottom em mobile via estrutura flex */}
        <div className="bg-card border-t border-border p-3 sm:p-4 flex-shrink-0">
          <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua pergunta..."
              className="flex-1 px-3 sm:px-4 py-3 border border-border rounded-lg text-sm sm:text-base min-h-[44px]"
            />
            <button
              type="submit"
              disabled={!input.trim() || processando}
              className="px-4 sm:px-6 py-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px] min-w-[44px] flex-shrink-0"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Painel direito: Avatar + Histórico ── */}
      <div className="hidden lg:flex lg:flex-col w-80 bg-card border-l border-border flex-shrink-0 overflow-hidden">

        {/* Avatar */}
        <div className="flex-shrink-0 p-6 flex flex-col gap-4 border-b border-border">
          <h3 className="font-semibold">Lorna</h3>
          <AvatarPlayer estado={avatarEstado} mutado={mutado} onToggleMudo={toggleMudo} />
          <p className="text-sm text-muted-foreground text-center">
            Especialista em educação inclusiva.
          </p>
        </div>

        {/* Histórico de conversas */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-4 pb-2">
            <span className="text-sm font-semibold text-foreground">Conversas</span>
            <button
              onClick={novoChat}
              title="Nova conversa"
              className="p-1 rounded hover:bg-accent text-muted-foreground"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
            {!chatHistory.hydrated && (
              <div className="text-xs text-muted-foreground px-2 py-4 text-center">Carregando…</div>
            )}
            {chatHistory.hydrated && grupos.length === 0 && (
              <div className="text-xs text-muted-foreground px-2 py-4 text-center">
                Nenhuma conversa ainda
              </div>
            )}
            {grupos.map(grupo => (
              <div key={grupo.label}>
                <p className="text-xs text-muted-foreground font-medium px-2 pb-1">{grupo.label}</p>
                <div className="space-y-0.5">
                  {grupo.items.map(session => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === chatHistory.activeSessionId}
                      onSelect={() => carregarSessao(session)}
                      onDelete={() => {
                        chatHistory.removerSessao(session.id);
                        if (session.id === sessionIdRef.current) novoChat();
                      }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ── Item de sessão ────────────────────────────────────────────────────────────
function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-primary/10 text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MessageSquare className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug truncate">{session.title}</p>
        {session.alunoNome && (
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{session.alunoNome}</p>
        )}
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Apagar conversa"
          className="flex-shrink-0 p-0.5 rounded hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
