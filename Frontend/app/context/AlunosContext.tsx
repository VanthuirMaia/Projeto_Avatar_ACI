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

const CACHE_KEY = "lorna_alunos";

function lerCache(): Aluno[] {
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    return stored ? (JSON.parse(stored) as Aluno[]) : [];
  } catch {
    return [];
  }
}

function gravarCache(alunos: Aluno[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(alunos));
  } catch { /* ignora quota exceeded */ }
}

interface AlunosContextValue {
  alunos: Aluno[];
  hydrated: boolean;
  erro: string | null;
  alunoAtivo: Aluno | null;
  setAlunoAtivo: (aluno: Aluno | null) => void;
  criar: (dados: Omit<Aluno, "id">) => Promise<void>;
  editar: (id: string, dados: Omit<Aluno, "id">) => Promise<void>;
  remover: (id: string) => Promise<void>;
  recarregar: () => void;
}

const AlunosContext = createContext<AlunosContextValue | null>(null);

export function AlunosProvider({ children }: { children: ReactNode }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [alunoAtivo, setAlunoAtivo] = useState<Aluno | null>(null);

  const carregar = useCallback(() => {
    setErro(null);
    // Exibe cache imediatamente enquanto busca do backend
    const cached = lerCache();
    if (cached.length > 0) setAlunos(cached);

    listarAlunos()
      .then((lista) => {
        setAlunos(lista);
        gravarCache(lista);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Erro ao carregar alunos";
        setErro(msg);
        // Mantém cache se houver — melhor do que lista vazia
        const cached = lerCache();
        if (cached.length > 0) setAlunos(cached);
      })
      .finally(() => setHydrated(true));
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { carregar(); }, []);

  const criar = useCallback(async (dados: Omit<Aluno, "id">) => {
    const id = crypto.randomUUID();
    const novo = { ...dados, id };
    setAlunos((prev) => [...prev, novo]);
    try {
      const confirmado = await criarAluno({ ...dados, id });
      setAlunos((prev) => {
        const next = prev.map((a) => (a.id === id ? { ...confirmado, id: confirmado.id ?? id } : a));
        gravarCache(next);
        return next;
      });
    } catch {
      setAlunos((prev) => {
        const next = prev.filter((a) => a.id !== id);
        gravarCache(next);
        return next;
      });
    }
  }, []);

  const editar = useCallback(async (id: string, dados: Omit<Aluno, "id">) => {
    const updated = { ...dados, id };
    setAlunos((prev) => {
      const next = prev.map((a) => (a.id === id ? updated : a));
      gravarCache(next);
      return next;
    });
    setAlunoAtivo((prev) => (prev?.id === id ? updated : prev));
    try {
      await editarAluno(id, dados);
    } catch {
      listarAlunos().then((lista) => { setAlunos(lista); gravarCache(lista); }).catch(() => {});
    }
  }, []);

  const remover = useCallback(async (id: string) => {
    setAlunos((prev) => {
      const next = prev.filter((a) => a.id !== id);
      gravarCache(next);
      return next;
    });
    setAlunoAtivo((prev) => (prev?.id === id ? null : prev));
    try {
      await removerAluno(id);
    } catch {
      listarAlunos().then((lista) => { setAlunos(lista); gravarCache(lista); }).catch(() => {});
    }
  }, []);

  return (
    <AlunosContext.Provider
      value={{ alunos, hydrated, erro, alunoAtivo, setAlunoAtivo, criar, editar, remover, recarregar: carregar }}
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
