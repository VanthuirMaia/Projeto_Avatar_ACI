"use client";

import { useState } from "react";
import {
  Sparkles, Upload, User, CheckCircle2, ArrowRight, ArrowLeft,
  Copy, AlertCircle, FileText, Download, Printer, Check,
  Plus, Trash2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAlunos } from "../../context/AlunosContext";
import { useAdaptacoesHistory } from "../../context/AdaptacoesHistoryContext";
import type { AdaptacaoSalva } from "../../context/AdaptacoesHistoryContext";
import { adaptarAtividade } from "../../utils/api";
import { escapeHtml } from "../../utils/html";

type Step = 1 | 2 | 3;

// ── Agrupamento por data ──────────────────────────────────────────────────────
function grupoData(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date();
  const diff = Math.floor((hoje.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  if (diff <= 7) return "Últimos 7 dias";
  return "Mais antigos";
}

function agrupar(items: AdaptacaoSalva[]): { label: string; items: AdaptacaoSalva[] }[] {
  const map = new Map<string, AdaptacaoSalva[]>();
  const ordem = ["Hoje", "Ontem", "Últimos 7 dias", "Mais antigos"];
  for (const a of items) {
    const g = grupoData(a.createdAt);
    if (!map.has(g)) map.set(g, []);
    map.get(g)!.push(a);
  }
  return ordem.filter(l => map.has(l)).map(l => ({ label: l, items: map.get(l)! }));
}

// ── Markdown → HTML (para janela de impressão) ────────────────────────────────
function mdToHtml(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false, inOl = false;
  const inline = (t: string) =>
    t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  for (const raw of lines) {
    const line = raw.trim();
    const closeList = () => {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (inOl) { out.push("</ol>"); inOl = false; }
    };
    if (/^#{1,2} /.test(line)) { closeList(); out.push(`<h2>${inline(line.replace(/^#+\s/, ""))}</h2>`); }
    else if (/^### /.test(line)) { closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if (/^[-*] /.test(line)) { if (inOl) { out.push("</ol>"); inOl = false; } if (!inUl) { out.push("<ul>"); inUl = true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else if (/^\d+\. /.test(line)) { if (inUl) { out.push("</ul>"); inUl = false; } if (!inOl) { out.push("<ol>"); inOl = true; } out.push(`<li>${inline(line.replace(/^\d+\.\s/, ""))}</li>`); }
    else if (line === "") { closeList(); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  if (inUl) out.push("</ul>");
  if (inOl) out.push("</ol>");
  return out.join("\n");
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function AdaptarAtividadePage() {
  const { alunos } = useAlunos();
  const history = useAdaptacoesHistory();

  const [activeId, setActiveId] = useState<string | null>(null);

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [textoOriginal, setTextoOriginal] = useState("");
  const [alunoId, setAlunoId] = useState("");
  const [textoAdaptado, setTextoAdaptado] = useState("");
  const [dataGeracao, setDataGeracao] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");
  const [copiado, setCopiado] = useState(false);

  const aluno = alunos.find((a) => a.id === alunoId);

  // ── Carregar adaptação do histórico ───────────────────────────────────────
  const carregarAdaptacao = (item: AdaptacaoSalva) => {
    setTextoOriginal(item.textoOriginal);
    setTextoAdaptado(item.textoAdaptado);
    setAlunoId(item.alunoId);
    setDataGeracao(new Date(item.createdAt).toLocaleDateString("pt-BR"));
    setCurrentStep(3);
    setActiveId(item.id);
    setErro("");
    setCopiado(false);
  };

  const novaAdaptacao = () => {
    setCurrentStep(1);
    setTextoOriginal("");
    setAlunoId("");
    setTextoAdaptado("");
    setDataGeracao("");
    setErro("");
    setCopiado(false);
    setActiveId(null);
  };

  // ── Adaptar ───────────────────────────────────────────────────────────────
  const handleAdaptar = async () => {
    if (!textoOriginal || !aluno) return;
    setProcessando(true);
    setErro("");
    setCurrentStep(3);
    const hoje = new Date().toLocaleDateString("pt-BR");
    setDataGeracao(hoje);
    try {
      const adaptado = await adaptarAtividade(textoOriginal, aluno);
      setTextoAdaptado(adaptado);

      // Salva automaticamente no histórico
      const id = history.salvarAdaptacao({
        alunoId: aluno.id,
        alunoNome: aluno.nome,
        alunodiagnostico: aluno.diagnostico,
        alunoSerie: aluno.serie,
        textoOriginal,
        textoAdaptado: adaptado,
      });
      setActiveId(id);
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === "AbortError";
      setErro(isTimeout
        ? "A adaptação está demorando mais que o esperado. Tente novamente."
        : "Não foi possível adaptar a atividade. Verifique sua conexão.");
      setCurrentStep(2);
    } finally {
      setProcessando(false);
    }
  };

  // ── Ações do artefato ─────────────────────────────────────────────────────
  const copiarTexto = async () => {
    if (!textoAdaptado) return;
    await navigator.clipboard.writeText(textoAdaptado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const downloadTxt = () => {
    const sep = "─".repeat(48);
    const header = [
      "ATIVIDADE ADAPTADA",
      sep,
      `Aluno: ${aluno?.nome}`,
      `Diagnóstico: ${aluno?.diagnostico}${aluno?.cid ? ` (CID ${aluno.cid})` : ""}`,
      `Série: ${aluno?.serie}  |  Idade: ${aluno?.idade} anos`,
      `Gerado em: ${dataGeracao}`,
      sep,
      "",
    ].join("\n");
    const blob = new Blob([header + textoAdaptado], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `adaptacao_${aluno?.nome.replace(/\s+/g, "_")}_${dataGeracao.replace(/\//g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const win = window.open("", "_blank", "width=860,height=700");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Atividade Adaptada – ${aluno?.nome}</title>
  <style>
    body{font-family:'Segoe UI',Arial,sans-serif;max-width:720px;margin:40px auto;padding:0 24px;color:#1a1a1a;line-height:1.65}
    h1{font-size:22px;border-bottom:2px solid #6366f1;padding-bottom:8px;margin-bottom:4px;color:#1a1a1a}
    .meta{color:#555;font-size:13px;margin-bottom:28px}
    h2,h3,h4{color:#374151;margin-top:20px;margin-bottom:6px}
    strong{font-weight:600}
    ul,ol{padding-left:24px}
    li{margin-bottom:4px}
    p{margin:6px 0}
    code{background:#f3f4f6;padding:1px 4px;border-radius:3px;font-size:13px}
    @media print{body{margin:20px}}
  </style>
</head>
<body>
  <h1>Atividade Adaptada</h1>
  <div class="meta">
    Aluno: <strong>${escapeHtml(aluno?.nome ?? "")}</strong> &bull;
    ${escapeHtml(aluno?.diagnostico ?? "")} &bull;
    ${escapeHtml(aluno?.serie ?? "")} &bull;
    ${aluno?.idade ?? ""} anos &bull;
    Gerado em ${dataGeracao}
  </div>
  ${mdToHtml(textoAdaptado)}
</body>
</html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  };

  const grupos = agrupar(history.adaptacoes);

  const steps = [
    { number: 1, label: "Texto Original", icon: Upload },
    { number: 2, label: "Selecionar Aluno", icon: User },
    { number: 3, label: "Resultado", icon: Sparkles },
  ];

  return (
    <div className="flex h-full bg-background">

      {/* ── Conteúdo principal ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 lg:p-8">

          {/* Título */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Adaptar Atividade</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Cole o texto da atividade e receba uma versão adaptada em segundos
            </p>
          </div>

          {/* Stepper */}
          <div className="mb-12">
            <div className="flex items-center justify-between max-w-2xl mx-auto">
              {steps.map((step, i) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                        currentStep >= step.number ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.number
                        ? <CheckCircle2 className="w-6 h-6" />
                        : <step.icon className="w-6 h-6" />
                      }
                    </div>
                    <span className="text-sm mt-2 font-medium hidden sm:block">{step.label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`h-1 flex-1 mx-2 ${currentStep > step.number ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {erro && (
            <div className="mb-6 flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{erro}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* Step 1 */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-card rounded-2xl p-4 sm:p-8 border border-border shadow-lg"
              >
                <textarea
                  value={textoOriginal}
                  onChange={(e) => setTextoOriginal(e.target.value)}
                  placeholder="Cole o texto da atividade aqui..."
                  className="w-full h-64 p-4 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none resize-none"
                />
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!textoOriginal.trim()}
                    className="px-4 sm:px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                  >
                    Próximo <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2 */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-card rounded-2xl p-4 sm:p-8 border border-border shadow-lg"
              >
                <p className="text-sm text-muted-foreground mb-4">Selecione o aluno para personalizar a adaptação:</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {alunos.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAlunoId(a.id)}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        alunoId === a.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
                          {a.nome.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <h3 className="font-semibold">{a.nome}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground ml-11">
                        {a.diagnostico} · {a.serie} · {a.idade} anos
                      </p>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between mt-8">
                  <button onClick={() => setCurrentStep(1)} className="px-4 sm:px-6 py-3 bg-muted rounded-lg flex items-center gap-2 min-h-[44px]">
                    <ArrowLeft className="w-5 h-5" /> Voltar
                  </button>
                  <button
                    onClick={handleAdaptar}
                    disabled={!alunoId}
                    className="px-4 sm:px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg flex items-center gap-2 disabled:opacity-50 min-h-[44px]"
                  >
                    <Sparkles className="w-5 h-5" /> Adaptar com IA
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 3 */}
            {currentStep === 3 && (
              <motion.div key="step3" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {processando ? (
                  <div className="text-center p-16">
                    <Sparkles className="w-10 h-10 mx-auto animate-pulse text-primary mb-4" />
                    <p className="text-muted-foreground">Adaptando para {aluno?.nome}...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid lg:grid-cols-5 gap-6">
                      {/* Texto original */}
                      <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5">
                        <h3 className="font-semibold text-sm text-muted-foreground uppercase mb-3">Texto Original</h3>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
                          {textoOriginal}
                        </p>
                      </div>

                      {/* Artifact card */}
                      <div className="lg:col-span-3 flex flex-col border-2 border-primary/20 rounded-2xl overflow-hidden shadow-xl bg-card">
                        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 px-6 py-4 border-b border-primary/20 flex-shrink-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-foreground">Atividade Adaptada</p>
                              <p className="text-xs text-muted-foreground">
                                {aluno?.nome} · {aluno?.diagnostico} · {aluno?.serie} · {dataGeracao}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 p-6 overflow-y-auto text-sm">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              p:          ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                              strong:     ({ children }) => <strong className="font-semibold">{children}</strong>,
                              em:         ({ children }) => <em className="italic">{children}</em>,
                              ul:         ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol:         ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                              li:         ({ children }) => <li className="ml-2 leading-relaxed">{children}</li>,
                              h1:         ({ children }) => <h1 className="text-base font-bold mb-2 mt-3">{children}</h1>,
                              h2:         ({ children }) => <h2 className="text-base font-bold mb-1 mt-3">{children}</h2>,
                              h3:         ({ children }) => <h3 className="text-sm font-bold mb-1 mt-2">{children}</h3>,
                              blockquote: ({ children }) => <blockquote className="border-l-2 border-primary pl-3 italic text-muted-foreground my-2">{children}</blockquote>,
                              hr:         () => <hr className="border-border my-3" />,
                            }}
                          >
                            {textoAdaptado}
                          </ReactMarkdown>
                        </div>

                        <div className="px-6 py-4 border-t border-border bg-muted/30 flex flex-wrap gap-2 justify-end flex-shrink-0">
                          <button
                            onClick={copiarTexto}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
                          >
                            {copiado ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                            {copiado ? "Copiado!" : "Copiar"}
                          </button>
                          <button
                            onClick={downloadTxt}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            Baixar .txt
                          </button>
                          <button
                            onClick={handlePrint}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm hover:bg-primary/90 transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                            Imprimir / PDF
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={novaAdaptacao}
                      className="px-6 py-3 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                    >
                      Nova Adaptação
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Painel direito: Histórico ── */}
      <aside className="hidden lg:flex flex-col w-72 bg-card border-l border-border flex-shrink-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-4 pb-3">
          <span className="text-sm font-semibold text-foreground">Histórico</span>
          <button
            onClick={novaAdaptacao}
            title="Nova adaptação"
            aria-label="Nova adaptação"
            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
          {!history.hydrated && (
            <p className="text-xs text-muted-foreground text-center py-4">Carregando…</p>
          )}
          {history.hydrated && grupos.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nenhuma adaptação ainda</p>
          )}
          {grupos.map(grupo => (
            <div key={grupo.label}>
              <p className="text-xs text-muted-foreground font-medium px-2 pb-1">{grupo.label}</p>
              <div className="space-y-0.5">
                {grupo.items.map(item => (
                  <HistoryItem
                    key={item.id}
                    item={item}
                    isActive={item.id === activeId}
                    onSelect={() => carregarAdaptacao(item)}
                    onDelete={() => {
                      history.removerAdaptacao(item.id);
                      if (item.id === activeId) novaAdaptacao();
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>

    </div>
  );
}

// ── Item do histórico ─────────────────────────────────────────────────────────
function HistoryItem({
  item,
  isActive,
  onSelect,
  onDelete,
}: {
  item: AdaptacaoSalva;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group relative flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-primary/10 text-foreground" : "hover:bg-accent text-muted-foreground hover:text-foreground"
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <FileText className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isActive ? "text-primary" : ""}`} />
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug truncate">{item.title}</p>
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{item.alunoNome}</p>
      </div>
      {hovered && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Apagar adaptação"
          className="flex-shrink-0 p-0.5 rounded hover:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
