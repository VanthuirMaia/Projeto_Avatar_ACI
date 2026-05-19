"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ChatMensagem {
  id: string;
  tipo: "user" | "assistant";
  conteudo: string;
  hora: string;
}

export interface ChatSession {
  id: string;
  title: string;
  alunoId: string | null;
  alunoNome: string | null;
  createdAt: string;
  updatedAt: string;
  mensagens: ChatMensagem[];
}

interface ChatHistoryContextType {
  sessions: ChatSession[];
  activeSessionId: string | null;
  hydrated: boolean;
  setActiveSessionId: (id: string | null) => void;
  criarSessao: (alunoId: string | null, alunoNome: string | null) => string;
  atualizarSessao: (id: string, mensagens: ChatMensagem[]) => void;
  removerSessao: (id: string) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | null>(null);

const STORAGE_KEY = "lorna_chats";
const MAX_SESSIONS = 50;

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSessions(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, hydrated]);

  const criarSessao = useCallback((alunoId: string | null, alunoNome: string | null): string => {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const nova: ChatSession = {
      id,
      title: "Nova conversa",
      alunoId,
      alunoNome,
      createdAt: now,
      updatedAt: now,
      mensagens: [],
    };
    setSessions(prev => [nova, ...prev].slice(0, MAX_SESSIONS));
    setActiveSessionId(id);
    return id;
  }, []);

  const atualizarSessao = useCallback((id: string, mensagens: ChatMensagem[]) => {
    setSessions(prev => prev.map(s => {
      if (s.id !== id) return s;
      const firstUser = mensagens.find(m => m.tipo === "user");
      const raw = firstUser?.conteudo ?? "";
      const title = raw ? (raw.length > 52 ? raw.slice(0, 52) + "…" : raw) : s.title;
      return { ...s, mensagens, title, updatedAt: new Date().toISOString() };
    }));
  }, []);

  const removerSessao = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    setActiveSessionId(prev => (prev === id ? null : prev));
  }, []);

  return (
    <ChatHistoryContext.Provider value={{
      sessions, activeSessionId, hydrated,
      setActiveSessionId, criarSessao, atualizarSessao, removerSessao,
    }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const ctx = useContext(ChatHistoryContext);
  if (!ctx) throw new Error("useChatHistory must be used inside ChatHistoryProvider");
  return ctx;
}
