"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  FileText,
  Sparkles,
  Calendar,
  Award,
  TrendingUp,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { mockAlunos, mockAtividades, mockPEIs } from "../../../mock/data";

export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const alunoId = params.id;

  const aluno = mockAlunos.find((a) => String(a.id) === alunoId);

  if (!aluno) return notFound();

  const atividadesAluno = mockAtividades.filter(
    (a) => String(a.alunoId) === alunoId
  );

  const peiAluno = mockPEIs.find(
    (p) => String(p.alunoId) === alunoId
  );

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-primary to-secondary text-white rounded-2xl">
        <div className="p-6 lg:p-8">
          <Link
            href="/students"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para alunos
          </Link>

          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold border-4 border-white/30">
              {aluno.nome
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{aluno.nome}</h1>

              <div className="flex gap-3 flex-wrap">
                <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">
                  {aluno.serie}
                </span>
                <span className="px-4 py-1.5 bg-white/20 rounded-full text-sm">
                  {aluno.idade} anos
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href={`/pei-editor`}
                className="px-6 py-3 bg-white text-primary font-semibold rounded-lg flex items-center gap-2"
              >
                <FileText className="w-5 h-5" />
                Editar PEI
              </Link>

              <Link
                href="/activity-adaptation"
                className="px-6 py-3 bg-white/20 text-white rounded-lg flex items-center gap-2 border border-white/30"
              >
                <Sparkles className="w-5 h-5" />
                Adaptar
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card p-6 rounded-xl border border-border"
        >
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Atividades <Sparkles className="w-5 h-5 text-secondary" />
          </div>
          <div className="text-2xl font-bold">
            {atividadesAluno.length}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-6 rounded-xl border border-border"
        >
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            PEI Atualizado <Calendar className="w-5 h-5 text-primary" />
          </div>
          <div className="text-2xl font-bold">
            {peiAluno ? "Sim" : "Não"}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-xl border border-border"
        >
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Progresso <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <div className="text-2xl font-bold">85%</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-xl border border-border"
        >
          <div className="flex justify-between mb-2 text-sm text-muted-foreground">
            Objetivos <Award className="w-5 h-5 text-yellow-600" />
          </div>
          <div className="text-2xl font-bold">
            {peiAluno?.objetivos?.length ?? 0}
          </div>
        </motion.div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-4">Sobre</h2>
            <p className="text-sm text-muted-foreground">
              {aluno.observacoes || "Sem observações"}
            </p>
          </div>

          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-4">Adaptações</h2>

            {aluno.adaptacoesPreferidas?.length ? (
              aluno.adaptacoesPreferidas.map((a, i) => (
                <div
                  key={i}
                  className="text-sm p-2 bg-secondary/10 rounded mb-2"
                >
                  {a}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhuma adaptação
              </p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {peiAluno && (
            <div className="bg-card p-6 rounded-xl border border-border">
              <div className="flex justify-between mb-4">
                <h2 className="font-bold">PEI</h2>
                <Link
                  href="/pei-editor"
                  className="text-primary text-sm flex items-center gap-1"
                >
                  <Edit className="w-4 h-4" /> Editar
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <ul>
                  {peiAluno.objetivos.slice(0, 2).map((o, i) => (
                    <li key={i} className="text-sm">
                      • {o}
                    </li>
                  ))}
                </ul>

                <ul>
                  {peiAluno.estrategias.slice(0, 2).map((e, i) => (
                    <li key={i} className="text-sm">
                      • {e}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="bg-card p-6 rounded-xl border border-border">
            <h2 className="font-bold mb-4">Atividades</h2>

            {atividadesAluno.map((a) => (
              <div key={a.id} className="mb-4 p-4 bg-background rounded-lg">
                <div className="flex justify-between mb-2">
                  <h3>{a.titulo}</h3>
                  <span className="text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {a.data.toLocaleDateString("pt-BR")}
                  </span>
                </div>

                <details>
                  <summary className="text-primary cursor-pointer">
                    Ver adaptação
                  </summary>
                  <p className="mt-2 text-sm whitespace-pre-wrap">
                    {a.textoAdaptado}
                  </p>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}