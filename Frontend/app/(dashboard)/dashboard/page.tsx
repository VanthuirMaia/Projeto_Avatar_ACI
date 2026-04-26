"use client";

import Link from "next/link";
import {
  Users,
  Sparkles,
  FileText,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { motion } from "framer-motion";
import { mockAlunos, mockAtividades } from "../../mock/data";

export default function DashboardPage() {
  const atividadesRecentes = mockAtividades.slice(0, 3);

  const stats = [
    {
      label: "Alunos Ativos",
      value: mockAlunos.length,
      icon: Users,
      color: "from-primary to-primary/80",
      change: "+2 este mês",
    },
    {
      label: "Atividades Adaptadas",
      value: "127",
      icon: Sparkles,
      color: "from-secondary to-secondary/80",
      change: "+18 esta semana",
    },
    {
      label: "PEIs Criados",
      value: "12",
      icon: FileText,
      color: "from-purple-500 to-purple-600",
      change: "4 em revisão",
    },
    {
      label: "Taxa de Sucesso",
      value: "94%",
      icon: TrendingUp,
      color: "from-green-500 to-green-600",
      change: "+5% vs mês anterior",
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
      title: "Conversar com IA",
      desc: "Tire dúvidas sobre estratégias pedagógicas",
      icon: Sparkles,
      link: "/assistant",
      color: "bg-gradient-to-br from-secondary to-secondary/80",
    },
  ];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary via-primary/90 to-secondary rounded-2xl p-6 lg:p-8 text-white shadow-lg"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold mb-2">
              Olá, Prof. Ana! 👋
            </h1>
            <p className="text-white/90 text-lg">
              Você tem {mockAlunos.length} alunos sob seu cuidado.
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
              <div
                className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>

            <div className="text-3xl font-bold text-foreground">
              {stat.value}
            </div>
            <div className="text-sm text-muted-foreground">
              {stat.label}
            </div>
            <div className="text-xs text-green-600 font-medium">
              {stat.change}
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground mb-4">
          Ações Rápidas
        </h2>

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
                <div
                  className={`w-14 h-14 rounded-xl ${acao.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <acao.icon className="w-7 h-7 text-white" />
                </div>

                <h3 className="font-semibold text-foreground mb-2 group-hover:text-primary">
                  {acao.title}
                </h3>

                <p className="text-sm text-muted-foreground">
                  {acao.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">Atividades Recentes</h2>

            <Link
              href="/activity-adaptation"
              className="text-primary text-sm flex items-center gap-1"
            >
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {atividadesRecentes.map((atividade) => (
              <div
                key={atividade.id}
                className="flex gap-4 p-4 bg-background rounded-lg"
              >
                <CheckCircle2 className="w-5 h-5 text-secondary" />

                <div className="flex-1">
                  <h3 className="font-medium">{atividade.titulo}</h3>
                  <p className="text-sm text-muted-foreground">
                    {atividade.alunoNome}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {atividade.data.toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card rounded-xl p-6 border border-border"
        >
          <div className="flex justify-between mb-6">
            <h2 className="font-bold">Meus Alunos</h2>

            <Link
              href="/students"
              className="text-primary text-sm flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {mockAlunos.slice(0, 4).map((aluno) => (
              <Link
                key={aluno.id}
                href={`/students/${aluno.id}`}
                className="flex items-center gap-4 p-3 bg-background rounded-lg"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-semibold">
                  {aluno.nome
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>

                <div className="flex-1">
                  <h3>{aluno.nome}</h3>
                </div>

                <span className="text-xs text-muted-foreground">
                  {aluno.serie}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}