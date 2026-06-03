"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users, BarChart2, Clock, Activity, TrendingUp,
  ChevronRight, X, FileText, Sparkles, MessageSquare,
  RefreshCw, AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  listarProfessores, buscarAtividadeProfessor, buscarMetricasProfessor,
  type ProfessorResumo, type AtividadeItem, type MetricasProfessor,
} from "../../utils/api";

const ACTION_LABELS: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  LOGIN:         { label: "Login", icon: Activity },
  REGISTER:      { label: "Cadastro", icon: Users },
  ACCESS_ALUNOS: { label: "Consultou alunos", icon: Users },
  CREATE_ALUNO:  { label: "Criou aluno", icon: Users },
  UPDATE_ALUNO:  { label: "Editou aluno", icon: Users },
  DELETE_ALUNO:  { label: "Removeu aluno", icon: Users },
  ACCESS_PEI:    { label: "Acessou PEI", icon: FileText },
  SAVE_PEI:      { label: "Salvou PEI", icon: FileText },
  DELETE_PEI:    { label: "Removeu PEI", icon: FileText },
};

function formatTs(ts: string) {
  return new Date(ts).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatRelativa(ts: string | null) {
  if (!ts) return "Nunca";
  const diff = Date.now() - new Date(ts).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1)  return "Há menos de 1h";
  if (h < 24) return `Há ${h}h`;
  const d = Math.floor(h / 24);
  return `Há ${d} dia${d > 1 ? "s" : ""}`;
}

// ── Painel lateral de detalhes ────────────────────────────────────────────────
function ProfessorDetailPanel({
  professor,
  onClose,
}: {
  professor: ProfessorResumo;
  onClose: () => void;
}) {
  const [metrics, setMetrics] = useState<MetricasProfessor | null>(null);
  const [activity, setActivity] = useState<AtividadeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErro(null);
    Promise.all([
      buscarMetricasProfessor(professor.id, 30),
      buscarAtividadeProfessor(professor.id, 30),
    ])
      .then(([m, a]) => { setMetrics(m); setActivity(a); })
      .catch(() => setErro("Não foi possível carregar os dados. Verifique a conexão."))
      .finally(() => setLoading(false));
  }, [professor.id]);

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.2 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-40 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div>
          <h2 className="font-bold text-lg">{professor.nome}</h2>
          <p className="text-sm text-muted-foreground">{professor.email}</p>
        </div>
        <button onClick={onClose} aria-label="Fechar painel" className="p-1.5 rounded-lg hover:bg-accent">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading && (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando dados...
          </div>
        )}

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {erro}
          </div>
        )}

        {!loading && metrics && (
          <>
            {/* Cards de resumo */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Alunos", value: metrics.total_alunos, icon: Users },
                { label: "PEIs", value: metrics.total_peis, icon: FileText },
                { label: "Ações (30d)", value: metrics.audit.total_eventos, icon: Activity },
                { label: "Dias ativos", value: metrics.audit.dias_ativos, icon: TrendingUp },
              ].map((c) => (
                <div key={c.label} className="bg-background rounded-xl p-4 border border-border">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <c.icon className="w-3.5 h-3.5" />
                    {c.label}
                  </div>
                  <div className="text-2xl font-bold">{c.value}</div>
                </div>
              ))}
            </div>

            {/* Ações por tipo */}
            {Object.keys(metrics.audit.por_acao).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Ações por tipo (30d)</p>
                <div className="space-y-1.5">
                  {Object.entries(metrics.audit.por_acao)
                    .sort(([, a], [, b]) => b - a)
                    .map(([action, count]) => {
                      const info = ACTION_LABELS[action];
                      return (
                        <div key={action} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{info?.label ?? action}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Timeline de atividade */}
        {!loading && activity.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Últimas ações</p>
            <div className="space-y-2">
              {activity.map((item, i) => {
                const info = ACTION_LABELS[item.action];
                const Icon = info?.icon ?? Activity;
                return (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium leading-snug">{info?.label ?? item.action}</p>
                      {typeof item.details?.nome === "string" && (
                        <p className="text-xs text-muted-foreground truncate">
                          {item.details.nome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{formatTs(item.ts)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && activity.length === 0 && !erro && (
          <p className="text-sm text-muted-foreground text-center py-8">Sem atividade registrada.</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function CoordinatorPage() {
  const router = useRouter();
  const [professores, setProfessores] = useState<ProfessorResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProfessorResumo | null>(null);
  const [days, setDays] = useState(30);

  // Proteção de rota: apenas coordenadores
  useEffect(() => {
    const role = localStorage.getItem("avatartea_role");
    if (role !== "coordenador") {
      router.replace("/dashboard");
    }
  }, [router]);

  const carregar = useCallback(() => {
    setLoading(true);
    setErro(null);
    listarProfessores(days)
      .then(setProfessores)
      .catch(() => setErro("Não foi possível carregar os professores. Verifique a conexão com o servidor."))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { carregar(); }, [carregar]);

  // Totais para os cards de visão geral
  const totalAlunos  = professores.reduce((s, p) => s + p.total_alunos, 0);
  const totalPEIs    = professores.reduce((s, p) => s + p.total_peis, 0);
  const totalEventos = professores.reduce((s, p) => s + p.total_eventos, 0);
  const profsAtivos  = professores.filter((p) => (p.dias_ativos ?? 0) > 0).length;

  return (
    <div className="space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Relatórios da Equipe</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Acompanhe o uso do sistema por professor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-border rounded-lg px-3 py-2 bg-background"
          >
            {[7, 30, 90].map((d) => (
              <option key={d} value={d}>Últimos {d} dias</option>
            ))}
          </select>
          <button
            onClick={carregar}
            aria-label="Atualizar dados"
            className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {erro}
          <button onClick={carregar} className="ml-auto font-medium underline">Tentar novamente</button>
        </div>
      )}

      {/* Cards de visão geral */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Professores ativos", value: profsAtivos, total: professores.length, icon: Users, color: "text-primary" },
          { label: "Total de alunos", value: totalAlunos, icon: Users, color: "text-secondary" },
          { label: "PEIs criados", value: totalPEIs, icon: FileText, color: "text-purple-600" },
          { label: "Ações no período", value: totalEventos, icon: Activity, color: "text-green-600" },
        ].map((card, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl p-5 border border-border"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              {card.label}
            </div>
            <div className="text-3xl font-bold">{loading ? "—" : card.value}</div>
            {"total" in card && !loading && (
              <p className="text-xs text-muted-foreground mt-0.5">de {card.total} cadastrados</p>
            )}
          </motion.div>
        ))}
      </div>

      {/* Tabela de professores */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-primary" />
            Professores
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Carregando...
          </div>
        ) : professores.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-12">Nenhum professor cadastrado.</p>
        ) : (
          <div className="divide-y divide-border">
            {professores.map((prof, i) => (
              <motion.button
                key={prof.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(prof)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-accent/50 transition-colors text-left"
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {prof.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{prof.nome}</p>
                  <p className="text-xs text-muted-foreground truncate">{prof.email}</p>
                </div>

                {/* Stats rápidos */}
                <div className="hidden sm:flex items-center gap-6 text-sm text-muted-foreground flex-shrink-0">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {prof.total_alunos}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" />
                    {prof.total_peis}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatRelativa(prof.ultima_atividade)}
                  </span>
                </div>

                {/* Status */}
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  prof.status === "aprovado" ? "bg-green-100 text-green-700" :
                  prof.status === "pendente" ? "bg-yellow-100 text-yellow-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {prof.status}
                </span>

                <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Painel de detalhes */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => setSelected(null)}
            />
            <ProfessorDetailPanel professor={selected} onClose={() => setSelected(null)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
