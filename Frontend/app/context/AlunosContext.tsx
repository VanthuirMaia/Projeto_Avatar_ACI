"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { mockAlunos } from "../mock/data";
import type { Aluno } from "../mock/data";

interface AlunosContextValue {
  alunos: Aluno[];
  hydrated: boolean;
  alunoAtivo: Aluno | null;
  setAlunoAtivo: (aluno: Aluno | null) => void;
  criar: (dados: Omit<Aluno, "id">) => void;
  editar: (id: string, dados: Omit<Aluno, "id">) => void;
  remover: (id: string) => void;
}

const AlunosContext = createContext<AlunosContextValue | null>(null);

export function AlunosProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>(mockAlunos);
  const [hydrated, setHydrated] = useState(false);
  const [alunoAtivo, setAlunoAtivo] = useState<Aluno | null>(null);

  // Carrega do localStorage após hidratação (evita mismatch SSR)
  useEffect(() => {
    try {
      const stored = localStorage.getItem("lorna_alunos");
      if (stored) setAlunos(JSON.parse(stored));
    } catch {}
    setHydrated(true);
  }, []);

  // Persiste toda vez que alunos mudar
  useEffect(() => {
    if (hydrated) {
      localStorage.setItem("lorna_alunos", JSON.stringify(alunos));
    }
  }, [alunos, hydrated]);

  const criar = useCallback((dados: Omit<Aluno, "id">) => {
    setAlunos((prev) => [...prev, { ...dados, id: crypto.randomUUID() }]);
  }, []);

  const editar = useCallback((id: string, dados: Omit<Aluno, "id">) => {
    const updated = { ...dados, id };
    setAlunos((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setAlunoAtivo((prev) => (prev?.id === id ? updated : prev));
  }, []);

  const remover = useCallback((id: string) => {
    setAlunos((prev) => prev.filter((a) => a.id !== id));
    setAlunoAtivo((prev) => (prev?.id === id ? null : prev));
  }, []);

  return (
    <AlunosContext.Provider
      value={{ alunos, hydrated, alunoAtivo, setAlunoAtivo, criar, editar, remover }}
    >
      {children}
    </AlunosContext.Provider>
  );
}

export function useAlunos() {
  const ctx = useContext(AlunosContext);
  if (!ctx) throw new Error("useAlunos deve ser usado dentro de AlunosProvider");
  return ctx;
}
