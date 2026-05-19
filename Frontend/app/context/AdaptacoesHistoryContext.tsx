"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface AdaptacaoSalva {
  id: string;
  title: string;
  alunoId: string;
  alunoNome: string;
  alunodiagnostico: string;
  alunoSerie: string;
  textoOriginal: string;
  textoAdaptado: string;
  createdAt: string;
}

interface AdaptacoesHistoryContextType {
  adaptacoes: AdaptacaoSalva[];
  hydrated: boolean;
  salvarAdaptacao: (data: Omit<AdaptacaoSalva, "id" | "title" | "createdAt">) => string;
  removerAdaptacao: (id: string) => void;
}

const AdaptacoesHistoryContext = createContext<AdaptacoesHistoryContextType | null>(null);

const STORAGE_KEY = "lorna_adaptacoes";
const MAX_ITEMS = 50;

export function AdaptacoesHistoryProvider({ children }: { children: React.ReactNode }) {
  const [adaptacoes, setAdaptacoes] = useState<AdaptacaoSalva[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setAdaptacoes(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(STORAGE_KEY, JSON.stringify(adaptacoes));
  }, [adaptacoes, hydrated]);

  const salvarAdaptacao = useCallback(
    (data: Omit<AdaptacaoSalva, "id" | "title" | "createdAt">): string => {
      const id = crypto.randomUUID();
      const raw = data.textoOriginal.trim();
      const title = raw.length > 52 ? raw.slice(0, 52) + "…" : raw;
      const nova: AdaptacaoSalva = {
        id,
        title,
        ...data,
        createdAt: new Date().toISOString(),
      };
      setAdaptacoes(prev => [nova, ...prev].slice(0, MAX_ITEMS));
      return id;
    },
    [],
  );

  const removerAdaptacao = useCallback((id: string) => {
    setAdaptacoes(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <AdaptacoesHistoryContext.Provider value={{ adaptacoes, hydrated, salvarAdaptacao, removerAdaptacao }}>
      {children}
    </AdaptacoesHistoryContext.Provider>
  );
}

export function useAdaptacoesHistory() {
  const ctx = useContext(AdaptacoesHistoryContext);
  if (!ctx) throw new Error("useAdaptacoesHistory must be used inside AdaptacoesHistoryProvider");
  return ctx;
}
