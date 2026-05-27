"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Sparkles, FileText, TrendingUp,
  ArrowRight, CheckCircle2, BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAlunos } from "../../context/AlunosContext";
import { useAdaptacoesHistory } from "../../context/AdaptacoesHistoryContext";
import { listarPEIs, type PEIPayload } from "../../utils/api";

interface PEIItem extends PEIPayload {
  aluno_id?: string;
  professor_id?: string;
  updated_at?: string;
}

export default function DashboardPage() {
  const { alunos } = useAlunos();
  const { adaptacoes } = useAdaptacoesHistory();

  const [nomeUsuario, setNomeUsuario] = useState("");
  const [peis, setPeis] = useState<PEIItem[]>([]);

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("avatartea_user") ?? "");
    listarPEIs()
      .then((lista) => setPeis(lista as PEIItem[]))
      .catch(() => {});
  }, []);

  const primeiroNome = nomeUsuario.split(" ")[0] || "Professor(a)";

  const stats = [
    {
      label: "Alunos Ativos",
      value: alunos.length,
      icon: Users,
      color: "from-primary to-primary/80",
      change: alunos.length > 0 ? `${alunos.length} cadastrado${alunos.length > 1 ? "s" : ""}` : "Nenhum ainda",
    },
    {
      label: "Adaptações Realizadas",
      value: adaptacoes.length,
      icon: Sparkles,
      color: "from-secondary to-secondary/80",
      change: adaptacoes.length > 0
        ? `Última: ${new Date(adaptacoes[0].createdAt).toLocaleDateString("pt-BR")}`
        : "Nenhuma ainda",
    },
    {
      label: "PEIs Criados",
      value: peis.length,
      icon: FileText,
      color: "from-purple-500 to-purple-600",
      change: peis.length > 0 ? `Atualizado recentemente` : "Nenhum ainda",
    },
    {
      label: "Alunos com PEI",
      value: peis.length > 0 ? `${Math.round((peis.length / Math.max(alunos.length, 1)) * 100)}%` : "—",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      change: peis.length > 0 ? `${peis.length} de ${alunos.length} alunos` : "Crie o primeiro PEI",
    },
  ];

  const acoesRapidas = [
    {
      title: "Adaptar Atividade Agora",
      desc: "Cole um texto e receba adaptação instantânea",
      icon: Sparkles,
      link: "/activity-adaptation",
      color: "bg-gradient-to-br from-primary to-primary/80",
    },
    {
      title: "Criar Novo PEI",
      desc: "Assistente guiado para plano educacional",
      icon: FileText,
      link: "/pei-editor",
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
    },
    {
      title: "Conversar com Lorna",
      desc: "Tire dúvidas sobre estratégias pedagógicas",
      icon: BookOpen,
      link: "/assistant",
      color: "bg-gradient-to-br from-secondary to-secondary/80",
    },
  ];

  const atividadesRecentes = [...adaptacoes]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Boas-vindas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-secondary rounded-2xl p-6 lg:p-8 text-white shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Olá, {primeiroNome}! 👋
            </h1>
            <p className="text-white/90 text-lg">
              {alunos.length > 0
                ? `Você tem ${alunos.length} aluno${alunos.length > 1 ? "s" : ""} cadastrado${alunos.length > 1 ? "s" : ""}.`
                : "Comece adicionando seus alunos para personalizar o atendimento."}
            </p>
          </div>
          <Link
            href="/activity-adaptation"
            className="px-6 py-3 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-all shadow-lg flex items-center gap-2 w-fit"
          >
            <Sparkles className="w-5 h-5" />
            Adaptar Agora
          </Link>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-card rounded-xl p-6 border border-border hover:shadow-lg transition-shadow"
          >
            <div className="mb-4">
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.change}</div>
          </motion.div>
        ))}
      </div>

      {/* Ações rápidas */}
      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {acoesRapidas.map((acao, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + i * 0.1 }}
            >
              <Link
                href={acao.link}
                className="block h-full p-6 bg-card rounded-xl border border-border hover:border-primary hover:shadow-lg transition-all group"
              >
                <div className={`w-14 h-14 rounded-xl ${acao.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <acao.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary">{acao.title}</h3>
                <p className="text-sm text-muted-foreground">{acao.desc}</p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Adaptações recentes */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">Adaptações Recentes</h2>
            <Link href="/activity-adaptation" className="text-primary text-sm flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {atividadesRecentes.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma adaptação realizada ainda.</p>
              <Link href="/activity-adaptation" className="mt-3 inline-block text-sm text-primary hover:underline">
                Criar primeira adaptação →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {atividadesRecentes.map((a) => (
                <div key={a.id} className="flex gap-4 p-4 bg-background rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-secondary flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{a.title}</h3>
                    <p className="text-sm text-muted-foreground">{a.alunoNome}</p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Meus PEIs */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">Meus PEIs</h2>
            <Link href="/pei-editor" className="text-primary text-sm flex items-center gap-1">
              Criar PEI <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {peis.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum PEI salvo ainda.</p>
              <Link href="/pei-editor" className="mt-3 inline-block text-sm text-primary hover:underline">
                Criar primeiro PEI →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {peis.slice(0, 4).map((pei, i) => {
                const aluno = alunos.find((a) => a.id === pei.aluno_id);
                return (
                  <Link
                    key={i}
                    href={`/pei-editor?alunoId=${pei.aluno_id}`}
                    className="flex items-center gap-4 p-3 bg-background rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {aluno?.nome.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{aluno?.nome ?? `Aluno ${i + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {pei.objetivos?.length ?? 0} objetivos · {pei.estrategias?.length ?? 0} estratégias
                      </p>
                    </div>
                    {pei.updated_at && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {new Date(pei.updated_at).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
