"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import type { Aluno } from "../mock/data";
import { listarAlunos, criarAluno, editarAluno, removerAluno } from "../utils/api";

interface AlunosContextValue {
  alunos: Aluno[];
  hydrated: boolean;
  alunoAtivo: Aluno | null;
  setAlunoAtivo: (aluno: Aluno | null) => void;
  criar: (dados: Omit<Aluno, "id">) => Promise<void>;
  editar: (id: string, dados: Omit<Aluno, "id">) => Promise<void>;
  remover: (id: string) => Promise<void>;
}

const AlunosContext = createContext<AlunosContextValue | null>(null);

export function AlunosProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [alunoAtivo, setAlunoAtivo] = useState<Aluno | null>(null);

  useEffect(() => {
    listarAlunos()
      .then(setAlunos)
      .catch(() => {
        // Fallback: tenta localStorage (offline / backend indisponível)
        try {
          const stored = localStorage.getItem("lorna_alunos");
          if (stored) setAlunos(JSON.parse(stored));
        } catch { /* ignora */ }
      })
      .finally(() => setHydrated(true));
  }, []);

  const criar = useCallback(async (dados: Omit<Aluno, "id">) => {
    const id = crypto.randomUUID();
    // Optimistic update
    const novo = { ...dados, id };
    setAlunos((prev) => [...prev, novo]);
    try {
      const confirmado = await criarAluno({ ...dados, id });
      // Substitui pelo objeto confirmado pelo backend (pode ter campos extras)
      setAlunos((prev) => prev.map((a) => (a.id === id ? { ...confirmado, id: confirmado.id ?? id } : a)));
    } catch {
      // Reverte em caso de falha
      setAlunos((prev) => prev.filter((a) => a.id !== id));
    }
  }, []);

  const editar = useCallback(async (id: string, dados: Omit<Aluno, "id">) => {
    const updated = { ...dados, id };
    setAlunos((prev) => prev.map((a) => (a.id === id ? updated : a)));
    setAlunoAtivo((prev) => (prev?.id === id ? updated : prev));
    try {
      await editarAluno(id, dados);
    } catch {
      // Recarrega lista em caso de falha
      listarAlunos().then(setAlunos).catch(() => {});
    }
  }, []);

  const remover = useCallback(async (id: string) => {
    setAlunos((prev) => prev.filter((a) => a.id !== id));
    setAlunoAtivo((prev) => (prev?.id === id ? null : prev));
    try {
      await removerAluno(id);
    } catch {
      listarAlunos().then(setAlunos).catch(() => {});
    }
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
