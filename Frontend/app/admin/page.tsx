"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart2, Users, Activity, ShieldCheck, FileDown,
  CheckCircle, XCircle, Clock, Zap, AlertTriangle,
  TrendingUp, MessageSquare, BookOpen, RefreshCw, LogOut, X, FileText,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  buscarAdminStats, listarAdminUsuarios, atualizarStatusUsuario,
  buscarAtividadeProfessor, buscarMetricasProfessor,
  type AdminStats, type AdminUser, type AtividadeItem, type MetricasProfessor,
} from "../utils/api";

const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Login", REGISTER: "Cadastro",
  ACCESS_ALUNOS: "Consultou alunos", CREATE_ALUNO: "Criou aluno",
  UPDATE_ALUNO: "Editou aluno", DELETE_ALUNO: "Removeu aluno",
  ACCESS_PEI: "Acessou PEI", SAVE_PEI: "Salvou PEI", DELETE_PEI: "Removeu PEI",
};

const INTENT_LABELS: Record<string, string> = {
  adaptacao_tea:           "Adaptação para TEA",
  elaborar_pei:            "Elaborar PEI",
  comunicacao_alternativa: "Comunicação Alternativa",
  comportamento_sala:      "Comportamento em Sala",
  legislacao_inclusao:     "Legislação / Inclusão",
  recursos_pedagogicos:    "Recursos Pedagógicos",
  tdah_sala:               "TDAH em Sala",
  dislexia:                "Dislexia",
  altas_habilidades:       "Altas Habilidades",
  aee:                     "AEE",
};

const TABS = [
  { id: "overview",  label: "Visão Geral", icon: BarChart2 },
  { id: "usuarios",  label: "Usuários",    icon: Users },
  { id: "uso",       label: "Uso",         icon: Activity },
  { id: "saude",     label: "Saúde",       icon: ShieldCheck },
  { id: "relatorio", label: "Relatório",   icon: FileDown },
] as const;

type TabId = (typeof TABS)[number]["id"];
const PERIODS = [7, 30, 90, 365] as const;

export default function AdminPage() {
  const router = useRouter();
  const [adminKey,    setAdminKey]    = useState("");
  const [keyInput,    setKeyInput]    = useState("");
  const [keyError,    setKeyError]    = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const [tab,          setTab]          = useState<TabId>("overview");
  const [days,         setDays]         = useState<number>(30);
  const [stats,        setStats]        = useState<AdminStats | null>(null);
  const [users,        setUsers]        = useState<AdminUser[]>([]);
  const [statsLoading, setStatsLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userFilter,   setUserFilter]   = useState<"todos" | "pendente" | "aprovado" | "bloqueado">("todos");
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userActivity, setUserActivity] = useState<AtividadeItem[]>([]);
  const [userMetrics,  setUserMetrics]  = useState<MetricasProfessor | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    // Requer sessão ativa — admin é operação sensível
    if (!localStorage.getItem("avatartea_token")) {
      router.replace("/login");
      return;
    }
    const saved = sessionStorage.getItem("avatartea_admin_key");
    if (saved) setAdminKey(saved);
  }, [router]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchStats = useCallback(async (key: string, d: number) => {
    setStatsLoading(true);
    try { setStats(await buscarAdminStats(key, d)); }
    catch { /* backend indisponível */ }
    finally { setStatsLoading(false); }
  }, []);

  const fetchUsers = useCallback(async (key: string) => {
    setUsersLoading(true);
    try { setUsers(await listarAdminUsuarios(key)); }
    catch { /* backend indisponível */ }
    finally { setUsersLoading(false); }
  }, []);

  useEffect(() => {
    if (!adminKey) return;
    fetchStats(adminKey, days);
    fetchUsers(adminKey);
  }, [adminKey, days, fetchStats, fetchUsers]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setKeyError("");
    try {
      await buscarAdminStats(keyInput, 1);
      sessionStorage.setItem("avatartea_admin_key", keyInput);
      setAdminKey(keyInput);
    } catch {
      setKeyError("Chave inválida ou servidor indisponível.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("avatartea_admin_key");
    setAdminKey("");
    setStats(null);
    setUsers([]);
    setSelectedUser(null);
  };

  const abrirDetalhesUsuario = async (user: AdminUser) => {
    setSelectedUser(user);
    setDetailLoading(true);
    setUserActivity([]);
    setUserMetrics(null);
    try {
      const [metrics, activity] = await Promise.all([
        buscarMetricasProfessor(user.id, 30, adminKey),
        buscarAtividadeProfessor(user.id, 50, adminKey),
      ]);
      setUserMetrics(metrics);
      setUserActivity(activity);
    } catch { /* exibe painel vazio com estado de erro */ }
    finally { setDetailLoading(false); }
  };

  const handleUpdateUser = async (userId: string, status: "aprovado" | "bloqueado") => {
    try {
      await atualizarStatusUsuario(adminKey, userId, status);
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status } : u)));
      showToast(`Usuário ${status === "aprovado" ? "aprovado" : "bloqueado"} com sucesso.`);
    } catch {
      showToast("Erro ao atualizar usuário.", false);
    }
  };

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold">AvaTEA Admin</h1>
            <p className="text-sm text-muted-foreground mt-1">Painel administrativo</p>
          </div>
          <form onSubmit={handleLogin} className="bg-card p-8 rounded-2xl border border-border space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Chave de administrador</label>
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="ADMIN_KEY"
                className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:border-primary"
              />
              {keyError && <p className="text-sm text-red-500 mt-2">{keyError}</p>}
            </div>
            <button
              type="submit"
              disabled={authLoading || !keyInput}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {authLoading ? "Verificando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const pendentes = users.filter((u) => u.status === "pendente").length;

  return (
    <div className="min-h-screen bg-background">
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white
          ${toast.ok ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-sm">AvaTEA Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon className="w-4 h-4" />
                {t.label}
                {t.id === "usuarios" && pendentes > 0 && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full font-bold">
                    {pendentes}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Period selector */}
      {tab !== "usuarios" && (
        <div className="max-w-7xl mx-auto px-4 pt-5 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground">Período:</span>
          {PERIODS.map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                days === d
                  ? "bg-primary text-white"
                  : "bg-card border border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {d === 365 ? "1 ano" : `${d} dias`}
            </button>
          ))}
          {statsLoading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin ml-1" />}
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6 pb-16">
        {tab === "overview"  && <TabOverview  stats={stats}  loading={statsLoading} />}
        {tab === "usuarios"  && (
          <TabUsuarios
            users={users} loading={usersLoading}
            filter={userFilter} setFilter={setUserFilter}
            onUpdate={handleUpdateUser}
            onDetail={abrirDetalhesUsuario}
          />
        )}
        {tab === "uso"       && <TabUso       stats={stats}  loading={statsLoading} />}
        {tab === "saude"     && <TabSaude     stats={stats}  loading={statsLoading} />}
        {tab === "relatorio" && <TabRelatorio stats={stats}  users={users} days={days} loading={statsLoading} />}
      </main>

      {/* Painel de detalhes do usuário (drill-down) */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-30"
              onClick={() => setSelectedUser(null)}
            />
            <motion.div
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.2 }}
              className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border shadow-2xl z-40 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <div>
                  <p className="font-bold">{selectedUser.nome}</p>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} aria-label="Fechar" className="p-1.5 rounded-lg hover:bg-accent">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {detailLoading && (
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Carregando...
                  </p>
                )}
                {!detailLoading && userMetrics && (
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Alunos", value: userMetrics.total_alunos },
                      { label: "PEIs", value: userMetrics.total_peis },
                      { label: "Ações (30d)", value: userMetrics.audit.total_eventos },
                      { label: "Dias ativos", value: userMetrics.audit.dias_ativos },
                    ].map((c) => (
                      <div key={c.label} className="bg-background rounded-xl p-4 border border-border">
                        <p className="text-xs text-muted-foreground mb-1">{c.label}</p>
                        <p className="text-2xl font-bold">{c.value}</p>
                      </div>
                    ))}
                  </div>
                )}
                {!detailLoading && userMetrics && Object.keys(userMetrics.audit.por_acao).length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Por tipo de ação</p>
                    {Object.entries(userMetrics.audit.por_acao).sort(([,a],[,b]) => b-a).map(([k, v]) => (
                      <div key={k} className="flex justify-between text-sm py-1 border-b border-border/50 last:border-0">
                        <span className="text-muted-foreground">{ACTION_LABELS[k] ?? k}</span>
                        <span className="font-medium">{v}</span>
                      </div>
                    ))}
                  </div>
                )}
                {!detailLoading && userActivity.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Últimas ações</p>
                    <div className="space-y-2">
                      {userActivity.slice(0, 20).map((item, i) => (
                        <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                          <p className="font-medium">{ACTION_LABELS[item.action] ?? item.action}</p>
                          {typeof item.details?.nome === "string" && <p className="text-xs text-muted-foreground">{item.details.nome}</p>}
                          <p className="text-xs text-muted-foreground">
                            {new Date(item.ts).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!detailLoading && userActivity.length === 0 && !userMetrics && (
                  <p className="text-sm text-muted-foreground">Sem dados disponíveis para este usuário.</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab: Visão Geral ───────────────────────────────────────────────────────────
function TabOverview({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  if (loading) return <Spinner />;
  if (!stats || stats.total_requests === 0) return <Empty msg="Nenhuma interação registrada ainda." />;

  const kpis = [
    {
      label: "Total de Interações",
      value: stats.total_requests,
      icon: MessageSquare,
      grad: "from-primary to-primary/80",
      sub: `em ${stats.periodo_dias} dias`,
    },
    {
      label: "Usuários Únicos",
      value: stats.adocao?.usuarios_unicos_hash ?? 0,
      icon: Users,
      grad: "from-secondary to-secondary/80",
      sub: "identificadores anônimos",
    },
    {
      label: "Tempo Médio",
      value: `${((stats.saude_sistema?.tempo_medio_resposta_ms ?? 0) / 1000).toFixed(1)}s`,
      icon: Clock,
      grad: "from-amber-500 to-amber-600",
      sub: `máx. ${((stats.saude_sistema?.tempo_maximo_resposta_ms ?? 0) / 1000).toFixed(1)}s`,
    },
    {
      label: "Fora do Escopo",
      value: `${stats.qualidade_nlu?.taxa_offtopic_pct ?? 0}%`,
      icon: AlertTriangle,
      grad: (stats.qualidade_nlu?.taxa_offtopic_pct ?? 0) > 20
        ? "from-red-500 to-red-600"
        : "from-green-500 to-green-600",
      sub: `${stats.qualidade_nlu?.perguntas_fora_escopo ?? 0} perguntas`,
    },
  ];

  const dailyEntries = Object.entries(stats.adocao?.perguntas_por_dia ?? {})
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30);
  const maxDaily = Math.max(...dailyEntries.map(([, v]) => v), 1);

  const endpointTotal = Object.values(stats.por_endpoint ?? {}).reduce((a, b) => a + b, 0);
  const endpoints = [
    { label: "Chat (Lorna)",      key: "/search"      as const, color: "bg-primary" },
    { label: "Adaptar Atividade", key: "/adapt"       as const, color: "bg-secondary" },
    { label: "Sugerir PEI",       key: "/suggest-pei" as const, color: "bg-purple-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div key={i}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="bg-card rounded-xl p-5 border border-border"
          >
            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${kpi.grad} flex items-center justify-center mb-3`}>
              <kpi.icon className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="text-sm text-muted-foreground">{kpi.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{kpi.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Atividade diária */}
        <div className="lg:col-span-2 bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Atividade diária (chat)
          </h3>
          {dailyEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de atividade diária.</p>
          ) : (
            <>
              <div className="flex items-end gap-0.5 h-28">
                {dailyEntries.map(([date, count]) => (
                  <div
                    key={date}
                    title={`${date.slice(5)}: ${count}`}
                    className="flex-1 bg-primary/70 hover:bg-primary rounded-t transition-colors cursor-default"
                    style={{ height: `${Math.max((count / maxDaily) * 100, count > 0 ? 4 : 0)}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{dailyEntries[0]?.[0]?.slice(5)}</span>
                <span>{dailyEntries.at(-1)?.[0]?.slice(5)}</span>
              </div>
            </>
          )}
        </div>

        {/* Distribuição por funcionalidade */}
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Por funcionalidade</h3>
          <div className="space-y-4">
            {endpoints.map((ep) => {
              const count = stats.por_endpoint?.[ep.key] ?? 0;
              const pct = endpointTotal > 0 ? Math.round((count / endpointTotal) * 100) : 0;
              return (
                <div key={ep.key}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">{ep.label}</span>
                    <span className="font-medium">{count} <span className="text-xs text-muted-foreground">({pct}%)</span></span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${ep.color} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Usuários ─────────────────────────────────────────────────────────────
function TabUsuarios({ users, loading, filter, setFilter, onUpdate, onDetail }: {
  users: AdminUser[];
  loading: boolean;
  filter: "todos" | "pendente" | "aprovado" | "bloqueado";
  setFilter: (f: "todos" | "pendente" | "aprovado" | "bloqueado") => void;
  onUpdate: (id: string, status: "aprovado" | "bloqueado") => void;
  onDetail: (user: AdminUser) => void;
}) {
  if (loading) return <Spinner />;

  const counts = {
    todos:     users.length,
    pendente:  users.filter((u) => u.status === "pendente").length,
    aprovado:  users.filter((u) => u.status === "aprovado").length,
    bloqueado: users.filter((u) => u.status === "bloqueado").length,
  };
  const filtered = filter === "todos" ? users : users.filter((u) => u.status === filter);

  const statusStyle: Record<string, string> = {
    aprovado:  "bg-green-100 text-green-700",
    pendente:  "bg-amber-100 text-amber-700",
    bloqueado: "bg-red-100 text-red-700",
  };
  const roleStyle: Record<string, string> = {
    professor:   "bg-primary/10 text-primary",
    coordenador: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(["todos", "pendente", "aprovado", "bloqueado"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-white"
                : "bg-card border border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            <span className="ml-2 text-xs opacity-70">({counts[f]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Empty msg="Nenhum usuário nesta categoria." />
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Perfil</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Cadastro</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((user) => (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle[user.role] ?? "bg-muted text-muted-foreground"}`}>
                      {user.role === "coordenador" ? "Coordenador" : "Professor"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle[user.status] ?? ""}`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {new Date(user.criado_em).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onDetail(user)}
                        className="px-3 py-1 text-xs bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors font-medium"
                      >
                        Detalhes
                      </button>
                      {user.status !== "aprovado" && (
                        <button
                          onClick={() => onUpdate(user.id, "aprovado")}
                          className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                        >
                          Aprovar
                        </button>
                      )}
                      {user.status !== "bloqueado" && (
                        <button
                          onClick={() => onUpdate(user.id, "bloqueado")}
                          className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                        >
                          Bloquear
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Uso ──────────────────────────────────────────────────────────────────
function TabUso({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  if (loading) return <Spinner />;
  if (!stats || stats.total_requests === 0) return <Empty msg="Nenhuma interação registrada ainda." />;

  const intents   = stats.uso_pedagogico?.intents_mais_usados ?? [];
  const maxIntent = Math.max(...intents.map((i) => i.count), 1);
  const idades    = Object.entries(stats.uso_pedagogico?.distribuicao_faixa_etaria ?? {});
  const maxIdade  = Math.max(...idades.map(([, v]) => v), 1);

  const totalSearch = stats.por_endpoint?.["/search"] ?? 0;
  const comAluno    = stats.uso_pedagogico?.perguntas_com_aluno_ativo ?? 0;
  const semAluno    = totalSearch - comAluno;

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            Tópicos mais consultados
          </h3>
          {intents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de tópicos ainda.</p>
          ) : (
            <div className="space-y-3">
              {intents.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{INTENT_LABELS[item.tag] ?? item.tag}</span>
                    <span className="font-medium text-muted-foreground">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(item.count / maxIntent) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-secondary" />
            Faixa etária dos alunos
          </h3>
          {idades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados de faixa etária ainda.</p>
          ) : (
            <div className="space-y-3">
              {idades.map(([faixa, count]) => (
                <div key={faixa}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize">{faixa}</span>
                    <span className="font-medium text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${(count / maxIdade) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-4">Uso com aluno selecionado</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Com aluno ativo</span>
              <span className="font-medium text-primary">
                {comAluno} ({totalSearch > 0 ? Math.round((comAluno / totalSearch) * 100) : 0}%)
              </span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full"
                style={{ width: `${totalSearch > 0 ? (comAluno / totalSearch) * 100 : 0}%` }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">Sem aluno</span>
              <span className="font-medium text-muted-foreground">{semAluno}</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-muted-foreground/40 rounded-full"
                style={{ width: `${totalSearch > 0 ? (semAluno / totalSearch) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Quanto maior o uso com aluno ativo, mais os professores personalizam o atendimento.
        </p>
      </div>
    </div>
  );
}

// ── Tab: Saúde ────────────────────────────────────────────────────────────────
function TabSaude({ stats, loading }: { stats: AdminStats | null; loading: boolean }) {
  if (loading) return <Spinner />;
  if (!stats || stats.total_requests === 0) return <Empty msg="Nenhuma interação registrada ainda." />;

  const s = stats.saude_sistema!;
  const q = stats.qualidade_nlu!;

  const cards = [
    {
      label: "Erros OpenAI",
      value: s.erros_openai,
      Icon: s.erros_openai === 0 ? CheckCircle : XCircle,
      colorIcon: s.erros_openai === 0 ? "text-green-500" : "text-red-500",
      colorBg:   s.erros_openai === 0 ? "bg-green-50"   : "bg-red-50",
      sub: s.erros_openai === 0 ? "Sistema estável" : "Verificar chave API",
    },
    {
      label: "Erros ElevenLabs",
      value: s.erros_elevenlabs,
      Icon: s.erros_elevenlabs === 0 ? CheckCircle : AlertTriangle,
      colorIcon: s.erros_elevenlabs === 0 ? "text-green-500" : "text-amber-500",
      colorBg:   s.erros_elevenlabs === 0 ? "bg-green-50"    : "bg-amber-50",
      sub: s.erros_elevenlabs === 0 ? "TTS operacional" : "TTS instável",
    },
    {
      label: "Tempo Médio",
      value: `${(s.tempo_medio_resposta_ms / 1000).toFixed(1)}s`,
      Icon: Clock,
      colorIcon: s.tempo_medio_resposta_ms < 3000 ? "text-green-500" : "text-amber-500",
      colorBg:   s.tempo_medio_resposta_ms < 3000 ? "bg-green-50"    : "bg-amber-50",
      sub: `máx: ${(s.tempo_maximo_resposta_ms / 1000).toFixed(1)}s`,
    },
    {
      label: "Confiança NLU",
      value: q.confianca_media !== null ? `${((q.confianca_media ?? 0) * 100).toFixed(0)}%` : "—",
      Icon: Zap,
      colorIcon: (q.confianca_media ?? 0) >= 0.7 ? "text-green-500" : "text-amber-500",
      colorBg:   (q.confianca_media ?? 0) >= 0.7 ? "bg-green-50"    : "bg-amber-50",
      sub: "Classificador de intenção",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-card rounded-xl p-5 border border-border">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${card.colorBg}`}>
              <card.Icon className={`w-5 h-5 ${card.colorIcon}`} />
            </div>
            <div className="text-2xl font-bold">{card.value}</div>
            <div className="text-sm text-muted-foreground">{card.label}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-3">Perguntas fora do escopo pedagógico</h3>
        <div className="flex items-center gap-6">
          <div className="text-4xl font-bold">{q.taxa_offtopic_pct}%</div>
          <div>
            <p className="text-sm text-muted-foreground">{q.perguntas_fora_escopo} perguntas bloqueadas pelo guardrail</p>
            <p className="text-xs text-muted-foreground mt-1">
              {q.taxa_offtopic_pct <= 10
                ? "Sistema bem calibrado — professores consultam temas relevantes."
                : q.taxa_offtopic_pct <= 25
                ? "Taxa moderada — considere revisar o guardrail."
                : "Taxa elevada — revisar intents e guardrail."}
            </p>
          </div>
        </div>
      </div>

      {Object.keys(s.tipos_de_erro).length > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-4">Tipos de erro registrados</h3>
          <div className="divide-y divide-border">
            {Object.entries(s.tipos_de_erro).map(([tipo, count]) => (
              <div key={tipo} className="flex justify-between py-2.5 text-sm">
                <span className="font-mono text-muted-foreground">{tipo}</span>
                <span className="font-medium text-red-500">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tab: Relatório ────────────────────────────────────────────────────────────
function TabRelatorio({ stats, users, days, loading }: {
  stats: AdminStats | null;
  users: AdminUser[];
  days: number;
  loading: boolean;
}) {
  if (loading) return <Spinner />;

  const handleExport = () => {
    const hoje = new Date().toLocaleDateString("pt-BR");
    const s = stats;
    const total = s?.total_requests ?? 0;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório AvaTEA — ${hoje}</title>
  <style>
    body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;color:#1a1a1a;font-size:13px}
    h1{font-size:20px;color:#6366f1;border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:4px}
    .sub{color:#888;font-size:11px;margin-bottom:24px}
    h2{font-size:13px;color:#374151;margin:24px 0 8px;border-left:3px solid #6366f1;padding-left:8px;text-transform:uppercase;letter-spacing:.04em}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:8px}
    .card{background:#f8f7ff;padding:10px;border-radius:8px;text-align:center}
    .card .val{font-size:22px;font-weight:bold;color:#6366f1}
    .card .lbl{font-size:10px;color:#888;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:6px}
    th{background:#f3f4f6;padding:7px 8px;text-align:left;font-size:11px;color:#374151;border-bottom:2px solid #e5e7eb}
    td{padding:7px 8px;border-bottom:1px solid #e5e7eb;font-size:12px}
    .badge{display:inline-block;padding:2px 7px;border-radius:99px;font-size:10px;font-weight:bold}
    .apr{background:#dcfce7;color:#15803d}.pen{background:#fef3c7;color:#b45309}.blo{background:#fee2e2;color:#b91c1c}
    .ok{color:#15803d}.warn{color:#b45309}.err{color:#b91c1c}
    .footer{margin-top:36px;font-size:10px;color:#999;border-top:1px solid #e5e7eb;padding-top:8px}
    @media print{body{margin:20px}}
  </style>
</head>
<body>
  <h1>Relatório de Uso — AvaTEA / Lorna</h1>
  <div class="sub">Período: últimos ${days} dias &nbsp;·&nbsp; Gerado em: ${hoje} &nbsp;·&nbsp; Projeto de Mestrado ACI/UPE</div>

  <h2>Resumo Executivo</h2>
  ${total > 0 && s ? `
  <div class="grid">
    <div class="card"><div class="val">${total}</div><div class="lbl">Total de interações</div></div>
    <div class="card"><div class="val">${s.adocao?.usuarios_unicos_hash ?? 0}</div><div class="lbl">Usuários únicos</div></div>
    <div class="card"><div class="val">${s.por_endpoint?.["/search"] ?? 0}</div><div class="lbl">Consultas ao chat</div></div>
    <div class="card"><div class="val">${s.por_endpoint?.["/adapt"] ?? 0}</div><div class="lbl">Adaptações geradas</div></div>
  </div>` : "<p>Sem interações registradas no período selecionado.</p>"}

  ${total > 0 && s ? `
  <h2>Uso por Funcionalidade</h2>
  <table>
    <tr><th>Funcionalidade</th><th>Interações</th><th>% do Total</th></tr>
    <tr><td>Chat com Lorna</td><td>${s.por_endpoint?.["/search"] ?? 0}</td><td>${Math.round(((s.por_endpoint?.["/search"] ?? 0) / total) * 100)}%</td></tr>
    <tr><td>Adaptação de Atividade</td><td>${s.por_endpoint?.["/adapt"] ?? 0}</td><td>${Math.round(((s.por_endpoint?.["/adapt"] ?? 0) / total) * 100)}%</td></tr>
    <tr><td>Sugestão de PEI</td><td>${s.por_endpoint?.["/suggest-pei"] ?? 0}</td><td>${Math.round(((s.por_endpoint?.["/suggest-pei"] ?? 0) / total) * 100)}%</td></tr>
  </table>

  <h2>Tópicos Mais Consultados</h2>
  <table>
    <tr><th>Tópico</th><th>Consultas</th></tr>
    ${(s.uso_pedagogico?.intents_mais_usados ?? []).map((i) =>
      `<tr><td>${INTENT_LABELS[i.tag] ?? i.tag}</td><td>${i.count}</td></tr>`
    ).join("")}
  </table>

  <h2>Saúde do Sistema</h2>
  <table>
    <tr><th>Indicador</th><th>Valor</th><th>Avaliação</th></tr>
    <tr><td>Tempo médio de resposta</td>
      <td>${((s.saude_sistema?.tempo_medio_resposta_ms ?? 0) / 1000).toFixed(1)}s</td>
      <td class="${(s.saude_sistema?.tempo_medio_resposta_ms ?? 0) < 3000 ? "ok" : "warn"}">${(s.saude_sistema?.tempo_medio_resposta_ms ?? 0) < 3000 ? "✓ Normal" : "⚠ Lento"}</td></tr>
    <tr><td>Erros OpenAI</td><td>${s.saude_sistema?.erros_openai ?? 0}</td>
      <td class="${(s.saude_sistema?.erros_openai ?? 0) === 0 ? "ok" : "err"}">${(s.saude_sistema?.erros_openai ?? 0) === 0 ? "✓ Normal" : "✗ Verificar"}</td></tr>
    <tr><td>Erros ElevenLabs TTS</td><td>${s.saude_sistema?.erros_elevenlabs ?? 0}</td>
      <td class="${(s.saude_sistema?.erros_elevenlabs ?? 0) === 0 ? "ok" : "warn"}">${(s.saude_sistema?.erros_elevenlabs ?? 0) === 0 ? "✓ Normal" : "⚠ Instável"}</td></tr>
    <tr><td>Confiança NLU média</td>
      <td>${s.qualidade_nlu?.confianca_media != null ? ((s.qualidade_nlu.confianca_media) * 100).toFixed(0) + "%" : "—"}</td>
      <td class="${(s.qualidade_nlu?.confianca_media ?? 0) >= 0.7 ? "ok" : "warn"}">${(s.qualidade_nlu?.confianca_media ?? 0) >= 0.7 ? "✓ Boa" : "⚠ Verificar"}</td></tr>
    <tr><td>Taxa off-topic</td><td>${s.qualidade_nlu?.taxa_offtopic_pct ?? 0}%</td>
      <td class="${(s.qualidade_nlu?.taxa_offtopic_pct ?? 0) <= 10 ? "ok" : "warn"}">${(s.qualidade_nlu?.taxa_offtopic_pct ?? 0) <= 10 ? "✓ Adequada" : "⚠ Alta"}</td></tr>
  </table>` : ""}

  ${users.length > 0 ? `
  <h2>Cadastro de Usuários (${users.length})</h2>
  <table>
    <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th>Cadastro</th></tr>
    ${users.map((u) => `
    <tr>
      <td>${u.nome}</td><td>${u.email}</td>
      <td>${u.role === "coordenador" ? "Coordenador" : "Professor"}</td>
      <td><span class="badge ${u.status === "aprovado" ? "apr" : u.status === "pendente" ? "pen" : "blo"}">${u.status}</span></td>
      <td>${new Date(u.criado_em).toLocaleDateString("pt-BR")}</td>
    </tr>`).join("")}
  </table>` : ""}

  <div class="footer">
    Relatório gerado automaticamente pelo sistema AvaTEA (Lorna) &nbsp;·&nbsp;
    ${new Date().toLocaleString("pt-BR")} &nbsp;·&nbsp;
    Mestrado em Aplicações em Computação Inteligente — UPE
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 300);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="bg-card rounded-xl p-6 border border-border">
        <h3 className="font-semibold mb-2">Exportar Relatório de Uso</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Gera um relatório completo com métricas de uso, tópicos pedagógicos, saúde do sistema
          e lista de usuários — ideal para apresentações e acompanhamento acadêmico.
        </p>
        <div className="text-sm text-muted-foreground mb-4 space-y-0.5">
          <p>Período selecionado: <strong>{days === 365 ? "1 ano" : `${days} dias`}</strong></p>
          {stats && <p>Interações no período: <strong>{stats.total_requests}</strong></p>}
          <p>Usuários cadastrados: <strong>{users.length}</strong></p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-semibold"
        >
          <FileDown className="w-5 h-5" />
          Gerar PDF
        </button>
      </div>

      {stats && stats.total_requests > 0 && (
        <div className="bg-card rounded-xl p-6 border border-border">
          <h3 className="font-semibold mb-3">O relatório incluirá</h3>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li>✓ Resumo executivo com 4 KPIs principais</li>
            <li>✓ Distribuição de uso por funcionalidade (chat, adaptação, PEI)</li>
            <li>✓ Top {stats.uso_pedagogico?.intents_mais_usados.length ?? 0} tópicos pedagógicos consultados</li>
            <li>✓ Indicadores de saúde (OpenAI, ElevenLabs, NLU, off-topic)</li>
            <li>✓ Lista de {users.length} usuário{users.length !== 1 ? "s" : ""} com status e perfil</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Shared ────────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return (
    <div className="text-center py-16">
      <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-sm text-muted-foreground">{msg}</p>
    </div>
  );
}
