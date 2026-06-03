"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  FileText,
  Sparkles,
  Calendar,
  Award,
  TrendingUp,
  Clock,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAlunos } from "../../../context/AlunosContext";
import StudentFormModal from "../../../components/StudentFormModal";
import { carregarPEI, type PEIPayload } from "../../../utils/api";
import { useAdaptacoesHistory } from "../../../context/AdaptacoesHistoryContext";
import type { Aluno } from "../../../mock/data";

export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { alunos, editar, remover, setAlunoAtivo, hydrated } = useAlunos();
  const { adaptacoes } = useAdaptacoesHistory();
  const [editOpen, setEditOpen] = useState(false);
  const [peiAluno, setPeiAluno] = useState<PEIPayload | null>(null);

  const aluno = alunos.find((a) => a.id === params.id);

  useEffect(() => {
    if (!aluno) return;
    carregarPEI(aluno.id).then(setPeiAluno).catch(() => setPeiAluno(null));
  }, [aluno?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!hydrated) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-48 bg-muted rounded-2xl" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-xl font-semibold">Aluno não encontrado</p>
        <Link href="/students" className="text-primary hover:underline text-sm">
          ← Voltar para alunos
        </Link>
      </div>
    );
  }

  const atividadesAluno = adaptacoes.filter((a) => a.alunoId === aluno.id);

  const handleEdit = (dados: Omit<Aluno, "id">) => {
    editar(aluno.id, dados);
    setEditOpen(false);
  };

  const handleDelete = () => {
    if (window.confirm(`Remover ${aluno.nome} permanentemente?`)) {
      remover(aluno.id);
      router.push("/students");
    }
  };

  const handleChat = () => {
    setAlunoAtivo(aluno);
    router.push("/assistant");
  };

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl">
        <div className="p-6 lg:p-8">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-6 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para alunos
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-4 border-white/30 flex-shrink-0">
              {aluno.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{aluno.nome}</h1>
              <div className="flex gap-3 flex-wrap">
                <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">{aluno.serie}</span>
                <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">{aluno.idade} anos</span>
                <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">{aluno.diagnostico}</span>
                {aluno.cid && (
                  <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">CID {aluno.cid}</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleChat}
                className="px-5 py-3 bg-white text-primary font-semibold rounded-lg flex items-center gap-2 hover:bg-white/90 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Iniciar Chat
              </button>
              <button
                onClick={() => setEditOpen(true)}
                className="px-5 py-3 bg-white/20 text-white rounded-lg flex items-center gap-2 border border-white/30 hover:bg-white/30 transition-colors"
              >
                <Pencil className="w-5 h-5" />
                Editar
              </button>
              <Link
                href="/pei-editor"
                className="px-5 py-3 bg-white/20 text-white rounded-lg flex items-center gap-2 border border-white/30 hover:bg-white/30 transition-colors"
              >
                <FileText className="w-5 h-5" />
                PEI
              </Link>
              <Link
                href="/activity-adaptation"
                className="px-5 py-3 bg-white/20 text-white rounded-lg flex items-center gap-2 border border-white/30 hover:bg-white/30 transition-colors"
              >
                <Sparkles className="w-5 h-5" />
                Adaptar
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card p-6 rounded-xl border border-border">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Atividades <Sparkles className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-2xl font-bold">{atividadesAluno.length}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card p-6 rounded-xl border border-border">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            PEI Ativo <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">{peiAluno ? "Sim" : "Não"}</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card p-6 rounded-xl border border-border">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Progresso <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold">85%</div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card p-6 rounded-xl border border-border">
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Objetivos PEI <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold">{peiAluno?.objetivos?.length ?? 0}</div>
        </motion.div>
      </div>

      {/* Conteúdo */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-3">Sobre</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {aluno.observacoes || "Sem observações registradas."}
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-3">Adaptações preferidas</h2>
            {aluno.adaptacoesPreferidas?.length ? (
              <div className="space-y-2">
                {aluno.adaptacoesPreferidas.map((a, i) => (
                  <div key={i} className="text-sm px-3 py-2 bg-secondary/10 text-secondary rounded-lg">
                    {a}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma adaptação registrada.</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {peiAluno && (
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex justify-between mb-4">
                <h2 className="font-bold">PEI</h2>
                <Link href="/pei-editor" className="text-primary text-sm flex items-center gap-1 hover:underline">
                  <Pencil className="w-4 h-4" /> Editar
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Objetivos</p>
                  <ul className="space-y-1">
                    {peiAluno.objetivos.slice(0, 2).map((o, i) => (
                      <li key={i} className="text-sm">• {o}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Estratégias</p>
                  <ul className="space-y-1">
                    {peiAluno.estrategias.slice(0, 2).map((e, i) => (
                      <li key={i} className="text-sm">• {e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-4">Atividades adaptadas</h2>
            {atividadesAluno.length > 0 ? (
              atividadesAluno.map((a) => (
                <div key={a.id} className="mb-4 p-4 bg-background rounded-lg border border-border">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-medium text-sm">{a.title}</h3>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  <details>
                    <summary className="text-primary text-sm cursor-pointer">Ver adaptação</summary>
                    <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{a.textoAdaptado}</p>
                  </details>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma atividade adaptada ainda.</p>
            )}
          </div>

          {/* Zona de perigo */}
          <div className="bg-card p-6 rounded-xl border border-destructive/20">
            <h2 className="font-bold text-destructive mb-2">Zona de perigo</h2>
            <p className="text-sm text-muted-foreground mb-4">
              A remoção do aluno é permanente e não pode ser desfeita.
            </p>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 border border-destructive/40 text-destructive text-sm rounded-lg hover:bg-destructive/10 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Remover aluno
            </button>
          </div>
        </div>
      </div>

      {/* Modal de edição */}
      {editOpen && (
        <StudentFormModal
          aluno={aluno}
          onSave={handleEdit}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  );
}
