"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles, Save, Download, User, Target, Lightbulb,
  Package, ClipboardCheck, Plus, X, Loader2, FileText, Calendar, Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import { useForm, useFieldArray, Control, UseFormRegister, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAlunos } from "../../context/AlunosContext";
import { sugerirPEI, salvarPEI, carregarPEI, listarPEIs, deletarPEI, type SugestoesPEI, type PEIPayload } from "../../utils/api";
import { escapeHtml } from "../../utils/html";
import { peiSchema, PEIFormData } from "../../schemas/pei.schema";

// ── Exemplos por seção ────────────────────────────────────────────────────────
const EXEMPLOS: Record<keyof Pick<PEIFormData, "objetivos" | "estrategias" | "recursos" | "avaliacoes">, string> = {
  objetivos:   "Ex: Desenvolver comunicação funcional utilizando prancha de CAA",
  estrategias: "Ex: Usar agenda visual para antecipar a rotina do dia",
  recursos:    "Ex: Prancha de comunicação alternativa (CAA) personalizada",
  avaliacoes:  "Ex: Portfólio com registros fotográficos e atividades adaptadas",
};

// ── Dicas de preenchimento ────────────────────────────────────────────────────
const DICAS: Record<keyof typeof EXEMPLOS, string[]> = {
  objetivos: [
    "Ampliar a participação em atividades em grupo com apoio do professor",
    "Reconhecer e escrever o próprio nome com autonomia",
    "Desenvolver habilidades de autorregulação em situações de conflito",
    "Melhorar a interação social em momentos de recreio dirigido",
  ],
  estrategias: [
    "Oferecer pausas sensoriais a cada 20 minutos de atividade",
    "Adaptar textos com linguagem simples e apoio de imagens",
    "Antecipar mudanças de rotina com aviso verbal e visual",
    "Posicionar o aluno próximo ao professor para apoio imediato",
  ],
  recursos: [
    "Cartões de rotina com imagens e palavras",
    "Materiais concretos e manipuláveis para matemática",
    "Fone de ouvido para redução de estímulos auditivos",
    "Temporizador visual para gestão do tempo nas atividades",
  ],
  avaliacoes: [
    "Observação direta durante atividades com registro em diário",
    "Avaliação processual com critérios adaptados ao perfil do aluno",
    "Autoavaliação guiada com escala visual de emojis",
    "Relatório bimestral descritivo com evidências de aprendizagem",
  ],
};

// ── Tipos ─────────────────────────────────────────────────────────────────────
type SectionKey = keyof typeof EXEMPLOS;

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  name: SectionKey;
  control: Control<PEIFormData>;
  register: UseFormRegister<PEIFormData>;
  error?: string;
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function PEIEditorPage() {
  const { alunos } = useAlunos();

  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sugestoes, setSugestoes] = useState<SugestoesPEI | null>(null);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState("");
  const [toast, setToast] = useState<{ msg: string; tipo: "ok" | "erro" } | null>(null);
  const [peisExistentes, setPeisExistentes] = useState<PEIPayload[]>([]);
  const [editandoPEI, setEditandoPEI] = useState<PEIPayload | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Carrega lista de PEIs salvos
  useEffect(() => {
    listarPEIs().then(setPeisExistentes).catch(() => {});
  }, []);

  const { control, register, handleSubmit, watch, getValues, reset, setValue, formState: { errors } } = useForm<PEIFormData>({
    resolver: zodResolver(peiSchema),
    defaultValues: {
      alunoId:     "",
      objetivos:   [{ value: "" }],
      estrategias: [{ value: "" }],
      recursos:    [{ value: "" }],
      avaliacoes:  [{ value: "" }],
    },
  });

  // Lê ?alunoId= da URL sem useSearchParams (evita necessidade de Suspense)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("alunoId");
    if (id) setValue("alunoId", id);
  }, [setValue]);

  // Todos os field arrays no nível da página para poder manipular da sidebar
  const objetivosArr   = useFieldArray({ control, name: "objetivos" });
  const estrategiasArr = useFieldArray({ control, name: "estrategias" });
  const recursosArr    = useFieldArray({ control, name: "recursos" });
  const avaliacoesArr  = useFieldArray({ control, name: "avaliacoes" });

  const fieldArrays = {
    objetivos:   objetivosArr,
    estrategias: estrategiasArr,
    recursos:    recursosArr,
    avaliacoes:  avaliacoesArr,
  };

  const alunoSelecionado = watch("alunoId");
  const alunoAtual = alunos.find((a) => a.id === alunoSelecionado);

  // Carrega PEI salvo do backend ao selecionar aluno
  useEffect(() => {
    // Aborta requests anteriores para evitar race condition
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    if (!alunoAtual) { setSugestoes(null); return; }

    carregarPEI(alunoAtual.id, ctrl.signal)
      .then((pei) => {
        if (ctrl.signal.aborted || !pei) return;
        reset({
          alunoId:     alunoAtual.id,
          objetivos:   pei.objetivos.map((v) => ({ value: v })),
          estrategias: pei.estrategias.map((v) => ({ value: v })),
          recursos:    pei.recursos.map((v) => ({ value: v })),
          avaliacoes:  pei.avaliacoes.map((v) => ({ value: v })),
        });
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        try {
          const saved = localStorage.getItem(`avatartea_pei_${alunoAtual.id}`);
          if (saved) reset(JSON.parse(saved));
        } catch { /* ignora */ }
      });

    setCarregandoSugestoes(true);
    setErroSugestoes("");
    setSugestoes(null);
    sugerirPEI(alunoAtual, ctrl.signal)
      .then((s) => { if (!ctrl.signal.aborted) setSugestoes(s); })
      .catch((err: unknown) => {
        if (ctrl.signal.aborted) return;
        setErroSugestoes(
          err instanceof Error && err.name === "AbortError"
            ? "As sugestões estão demorando. Tente novamente."
            : "Não foi possível carregar sugestões. Verifique sua conexão."
        );
      })
      .finally(() => { if (!ctrl.signal.aborted) setCarregandoSugestoes(false); });

    return () => ctrl.abort();
  }, [alunoAtual?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const excluirPEI = async (pei: PEIPayload, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!pei.aluno_id) return;
    const aluno = alunos.find((a) => a.id === pei.aluno_id);
    const nome = aluno?.nome ?? "este aluno";
    if (!window.confirm(`Remover o PEI de ${nome} permanentemente?`)) return;
    try {
      await deletarPEI(pei.aluno_id);
      setPeisExistentes((prev) => prev.filter((p) => p.aluno_id !== pei.aluno_id));
      if (editandoPEI?.aluno_id === pei.aluno_id) {
        reset();
        setEditandoPEI(null);
      }
      mostrarToast("PEI removido.");
    } catch {
      mostrarToast("Erro ao remover PEI.", "erro");
    }
  };

  const abrirPEI = (pei: PEIPayload) => {
    const alunoExiste = alunos.some((a) => a.id === pei.aluno_id);
    reset({
      alunoId:     alunoExiste ? (pei.aluno_id ?? "") : "",
      objetivos:   (pei.objetivos ?? []).map((v) => ({ value: v })),
      estrategias: (pei.estrategias ?? []).map((v) => ({ value: v })),
      recursos:    (pei.recursos ?? []).map((v) => ({ value: v })),
      avaliacoes:  (pei.avaliacoes ?? []).map((v) => ({ value: v })),
    });
    setEditandoPEI(pei);
    if (!alunoExiste) {
      mostrarToast("Aluno não encontrado. Selecione um novo aluno para salvar.", "erro");
    }
    // Rola para o formulário
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 50);
  };

  const adicionarSugestao = (secao: SectionKey, texto: string) => {
    const arr = fieldArrays[secao];
    const campos = arr.fields as { value: string }[];
    if (!campos.some((f) => f.value === texto)) {
      arr.append({ value: texto } as never);
    }
  };

  const mostrarToast = (msg: string, tipo: "ok" | "erro" = "ok") => {
    setToast({ msg, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const onSubmit = async (data: PEIFormData) => {
    try {
      await salvarPEI(data.alunoId, {
        objetivos:   data.objetivos.map((o) => o.value).filter(Boolean),
        estrategias: data.estrategias.map((e) => e.value).filter(Boolean),
        recursos:    data.recursos.map((r) => r.value).filter(Boolean),
        avaliacoes:  data.avaliacoes.map((a) => a.value).filter(Boolean),
      });
      mostrarToast("PEI salvo com sucesso!");
      const lista = await listarPEIs().catch(() => peisExistentes);
      setPeisExistentes(lista);
      setEditandoPEI(lista.find((p) => p.aluno_id === data.alunoId) ?? null);
    } catch {
      // Fallback: salva localmente se o backend falhar
      try {
        localStorage.setItem(
          `avatartea_pei_${data.alunoId}`,
          JSON.stringify({ ...data, savedAt: new Date().toISOString() }),
        );
        mostrarToast("Salvo localmente (backend indisponível).");
      } catch {
        mostrarToast("Erro ao salvar. Tente novamente.", "erro");
      }
    }
  };

  const exportarPDF = () => {
    const data = getValues();
    if (!alunoAtual) return;

    const linhas = (items: { value: string }[]) =>
      items.filter(i => i.value.trim()).map(i => `<li>${i.value}</li>`).join("") || "<li><em>Não preenchido</em></li>";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>PEI — ${escapeHtml(alunoAtual.nome)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a1a1a; }
    h1 { font-size: 22px; border-bottom: 2px solid #6366f1; padding-bottom: 8px; }
    .info { background: #f5f3ff; padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; }
    .info span { font-weight: bold; }
    h2 { font-size: 15px; color: #6366f1; margin-top: 24px; margin-bottom: 6px; text-transform: uppercase; letter-spacing: .05em; }
    ul { margin: 0; padding-left: 20px; }
    li { margin-bottom: 6px; font-size: 14px; line-height: 1.5; }
    .rodape { margin-top: 40px; font-size: 11px; color: #888; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Plano Educacional Individualizado (PEI)</h1>
  <div class="info">
    <span>Aluno:</span> ${escapeHtml(alunoAtual.nome)} &nbsp;|&nbsp;
    <span>Diagnóstico:</span> ${escapeHtml(alunoAtual.diagnostico ?? "")} &nbsp;|&nbsp;
    <span>Série:</span> ${escapeHtml(alunoAtual.serie)} &nbsp;|&nbsp;
    <span>Data:</span> ${new Date().toLocaleDateString("pt-BR")}
  </div>
  <h2>🎯 Objetivos</h2><ul>${linhas(data.objetivos)}</ul>
  <h2>💡 Estratégias</h2><ul>${linhas(data.estrategias)}</ul>
  <h2>📦 Recursos</h2><ul>${linhas(data.recursos)}</ul>
  <h2>✅ Avaliações</h2><ul>${linhas(data.avaliacoes)}</ul>
  <div class="rodape">Gerado pelo sistema AvaTEA — Lorna · ${new Date().toLocaleString("pt-BR")}</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 300);
    }
  };

  // Labels e sugestões da sidebar por seção
  const secoes: { key: SectionKey; label: string; sugs: string[] }[] = [
    { key: "objetivos",   label: "Objetivos",   sugs: sugestoes?.objetivos   ?? DICAS.objetivos   },
    { key: "estrategias", label: "Estratégias", sugs: sugestoes?.estrategias ?? DICAS.estrategias },
    { key: "recursos",    label: "Recursos",    sugs: sugestoes?.recursos    ?? DICAS.recursos    },
    { key: "avaliacoes",  label: "Avaliações",  sugs: sugestoes?.avaliacoes  ?? DICAS.avaliacoes  },
  ];

  return (
    <div className="h-full bg-background flex">

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all
          ${toast.tipo === "ok" ? "bg-green-600" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 lg:p-12">
          <div className="mb-8">
            <h1 className="text-2xl sm:text-4xl font-bold text-foreground mb-2">
              Plano Educacional Individualizado
            </h1>
            <p className="text-muted-foreground">
              Crie um PEI estruturado com auxílio da assistente inteligente
            </p>
          </div>

          {/* ── PEIs salvos ─────────────────────────────────────────────── */}
          {peisExistentes.length > 0 && !alunoAtual && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                PEIs Salvos
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {peisExistentes.map((pei, i) => {
                  const aluno = alunos.find((a) => a.id === pei.aluno_id);
                  const isActive = editandoPEI?.aluno_id === pei.aluno_id;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => abrirPEI(pei)}
                      className={`p-4 bg-card rounded-xl border transition-all text-left group ${
                        isActive
                          ? "border-primary shadow-md"
                          : aluno
                          ? "border-border hover:border-primary hover:shadow-md"
                          : "border-amber-200 hover:border-amber-400"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          aluno ? "bg-gradient-to-br from-primary to-secondary" : "bg-amber-400"
                        }`}>
                          {aluno?.nome.split(" ").map((n) => n[0]).join("").slice(0, 2) ?? "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold truncate transition-colors ${
                            aluno ? "group-hover:text-primary" : "text-amber-700"
                          }`}>
                            {aluno?.nome ?? "Aluno não encontrado"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {aluno?.diagnostico ?? "Clique para recuperar o conteúdo"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => excluirPEI(pei, e)}
                          title="Excluir PEI"
                          className="flex-shrink-0 p-1 rounded hover:bg-destructive/10 hover:text-destructive text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>{pei.objetivos?.length ?? 0} objetivos</span>
                        <span>·</span>
                        <span>{pei.estrategias?.length ?? 0} estratégias</span>
                      </div>
                      {pei.updated_at && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {new Date(pei.updated_at).toLocaleDateString("pt-BR")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  Ou selecione um aluno abaixo para criar um novo PEI:
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* Banner de edição */}
            {editandoPEI && alunoAtual && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-center gap-3 px-4 py-3 bg-primary/10 border border-primary/20 rounded-xl text-sm"
              >
                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-foreground">
                  Editando PEI de <strong>{alunoAtual.nome}</strong>
                  {editandoPEI.updated_at && (
                    <span className="text-muted-foreground">
                      {" "}— última atualização:{" "}
                      {new Date(editandoPEI.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "short", year: "numeric",
                      })}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => { reset(); setEditandoPEI(null); }}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Novo PEI
                </button>
              </motion.div>
            )}

            {/* Aviso: aluno do PEI não encontrado */}
            {editandoPEI && !alunoAtual && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800"
              >
                <FileText className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Aluno não encontrado</p>
                  <p className="text-xs mt-0.5">
                    O conteúdo deste PEI foi carregado. Selecione um aluno abaixo para salvá-lo novamente.
                  </p>
                </div>
              </motion.div>
            )}

            {!alunoSelecionado && (
              <div className="mb-8 p-6 bg-card rounded-xl border border-border">
                <label className="block font-semibold mb-3">
                  <User className="inline w-5 h-5 mr-2" />
                  Selecione o Aluno
                </label>
                <select
                  {...register("alunoId")}
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border"
                >
                  <option value="">Escolha...</option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome} — {aluno.diagnostico}
                    </option>
                  ))}
                </select>
                {errors.alunoId && (
                  <p className="text-sm text-red-500 mt-2">{errors.alunoId.message}</p>
                )}
              </div>
            )}

            {alunoAtual && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 p-6 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl border"
                >
                  <h2 className="text-xl font-bold">{alunoAtual.nome}</h2>
                  <p className="text-sm text-muted-foreground">{alunoAtual.diagnostico} · {alunoAtual.serie}</p>
                </motion.div>

                <div className="space-y-8">
                  <Section title="Objetivos"   icon={Target}        name="objetivos"   control={control} register={register} error={errors.objetivos?.message} />
                  <Section title="Estratégias" icon={Lightbulb}     name="estrategias" control={control} register={register} error={errors.estrategias?.message} />
                  <Section title="Recursos"    icon={Package}       name="recursos"    control={control} register={register} error={errors.recursos?.message} />
                  <Section title="Avaliações"  icon={ClipboardCheck} name="avaliacoes" control={control} register={register} error={errors.avaliacoes?.message} />
                </div>

                <div className="mt-8 sm:mt-12 flex gap-4 pb-8">
                  <button
                    type="submit"
                    className="flex-1 px-4 sm:px-6 py-3 bg-card border rounded-lg flex items-center justify-center gap-2 min-h-[44px] hover:bg-accent transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {editandoPEI ? "Atualizar PEI" : "Salvar"}
                  </button>
                  <button
                    type="button"
                    onClick={exportarPDF}
                    className="flex-1 px-4 sm:px-6 py-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2 min-h-[44px] hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-5 h-5" />
                    Exportar
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>

      {/* ── Sidebar de sugestões ── */}
      {alunoAtual && showSuggestions && (
        <motion.aside
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 bg-card border-l p-6 hidden lg:flex flex-col overflow-y-auto gap-6"
        >
          <div className="flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {sugestoes ? "Sugestões da IA" : "Exemplos de preenchimento"}
            </h3>
            <button onClick={() => setShowSuggestions(false)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>

          {carregandoSugestoes && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando sugestões personalizadas...
            </div>
          )}

          {erroSugestoes && (
            <p className="text-sm text-red-500">{erroSugestoes}</p>
          )}

          {!carregandoSugestoes && secoes.map(({ key, label, sugs }) => (
            <div key={key}>
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2 tracking-wide">
                {label}
              </p>
              <div className="space-y-1.5">
                {sugs.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => adicionarSugestao(key, s)}
                    className="w-full text-left p-2.5 bg-primary/5 rounded-lg text-xs hover:bg-primary/10 transition-colors leading-snug"
                  >
                    <Plus className="inline w-3 h-3 mr-1.5 text-primary flex-shrink-0" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {!sugestoes && !carregandoSugestoes && (
            <p className="text-xs text-muted-foreground italic">
              Clique em qualquer sugestão para adicioná-la ao campo correspondente.
              As sugestões serão personalizadas pela IA ao selecionar um aluno.
            </p>
          )}
        </motion.aside>
      )}
    </div>
  );
}

// ── Componente de seção ────────────────────────────────────────────────────────
function Section({ title, icon: Icon, name, control, register, error }: SectionProps) {
  const fieldArray = useFieldArray({ control, name });

  const adicionarQuebraGelo = (texto: string) => {
    const campos = fieldArray.fields as { value: string }[];
    // Se o único campo estiver vazio, substitui; caso contrário, adiciona novo
    if (campos.length === 1 && !campos[0].value) {
      fieldArray.update(0, { value: texto } as never);
    } else if (!campos.some((f) => f.value === texto)) {
      fieldArray.append({ value: texto } as never);
    }
  };

  const chips = DICAS[name];

  return (
    <div className="p-6 bg-card rounded-xl border">
      <h3 className="font-bold flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h3>

      {/* Quebra-gelos — chips clicáveis */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground mb-2">Clique para adicionar um exemplo:</p>
        <div className="flex flex-wrap gap-2">
          {chips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => adicionarQuebraGelo(chip)}
              className="text-xs px-3 py-1.5 rounded-full border border-primary/30 text-primary bg-primary/5 hover:bg-primary/15 hover:border-primary transition-colors text-left leading-snug"
            >
              <Plus className="inline w-3 h-3 mr-1" />
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Campos preenchidos */}
      <div className="space-y-3">
        {fieldArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`${name}.${index}.value` as const)}
              placeholder={EXEMPLOS[name]}
              className="flex-1 px-4 py-2 border rounded-lg text-sm focus:outline-none focus:border-primary"
            />
            {fieldArray.fields.length > 1 && (
              <button
                type="button"
                onClick={() => fieldArray.remove(index)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => fieldArray.append({ value: "" } as never)}
          className="w-full border-dashed border-2 border-border p-3 rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="inline w-4 h-4 mr-2" />
          Adicionar {title.toLowerCase()}
        </button>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
