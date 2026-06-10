"use client";

import { useState, type KeyboardEvent } from "react";
import { X, Plus } from "lucide-react";
import type { Aluno } from "../mock/data";

const SERIES: string[] = [
  "1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano",
  "6º Ano", "7º Ano", "8º Ano", "9º Ano",
  "1º Ano EM", "2º Ano EM", "3º Ano EM",
];

const ADAPTACOES_SUGERIDAS: string[] = [
  "Linguagem simplificada",
  "Recursos visuais",
  "Tempo estendido",
  "Atividades curtas",
  "Elementos interativos",
  "Checklist visual",
  "Fonte adaptada",
  "Espaçamento aumentado",
  "Áudio disponível",
  "Instruções explícitas",
  "Exemplos concretos",
  "Estrutura previsível",
  "Pausas regulares",
  "Reforço positivo imediato",
  "Apoio visual constante",
];

interface StudentFormModalProps {
  aluno?: Aluno;
  onSave: (dados: Omit<Aluno, "id">) => void;
  onClose: () => void;
  erroExterno?: string | null;
}

export default function StudentFormModal({ aluno, onSave, onClose, erroExterno }: StudentFormModalProps) {
  const isEdit = Boolean(aluno);

  const [nome, setNome] = useState(aluno?.nome ?? "");
  const [serie, setSerie] = useState(aluno?.serie ?? "");
  const [idade, setIdade] = useState(aluno?.idade?.toString() ?? "");
  const [processosCognitivos, setProcessosCognitivos] = useState(aluno?.processosCognitivos ?? "");
  const [adaptacoes, setAdaptacoes] = useState<string[]>(aluno?.adaptacoesSugeridas ?? []);
  const [tagInput, setTagInput] = useState("");

  const isValid =
    nome.trim().length >= 2 &&
    serie.length > 0 &&
    Number(idade) >= 4;

  const addTag = (value: string) => {
    const v = value.trim();
    if (v && !adaptacoes.includes(v)) setAdaptacoes((p) => [...p, v]);
    setTagInput("");
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === "Backspace" && !tagInput && adaptacoes.length > 0) {
      setAdaptacoes((p) => p.slice(0, -1));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onSave({
      nome: nome.trim(),
      serie,
      idade: parseInt(idade),
      processosCognitivos: processosCognitivos.trim() || undefined,
      adaptacoesSugeridas: adaptacoes.length > 0 ? adaptacoes : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-bold">{isEdit ? "Editar aluno" : "Novo aluno"}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Nome <span className="text-destructive">*</span>
            </label>
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Nome completo do aluno"
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />
          </div>

          {/* Série + Idade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Série <span className="text-destructive">*</span>
              </label>
              <select
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              >
                <option value="">Selecione...</option>
                {SERIES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">
                Idade <span className="text-destructive">*</span>
              </label>
              <input
                type="number"
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                placeholder="ex: 10"
                min={4}
                max={25}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
              />
            </div>
          </div>

          {/* Processos cognitivos */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Processos cognitivos{" "}
              <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </label>
            <textarea
              value={processosCognitivos}
              onChange={(e) => setProcessosCognitivos(e.target.value)}
              placeholder="Descreva como o aluno processa informações: atenção, memória, linguagem, raciocínio..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none bg-background"
            />
          </div>

          {/* Adaptações Sugeridas */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Adaptações Sugeridas{" "}
              <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
            </label>

            {/* Tags ativas */}
            {adaptacoes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {adaptacoes.map((a, i) => (
                  <span
                    key={i}
                    className="flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary text-xs rounded-full"
                  >
                    {a}
                    <button
                      type="button"
                      onClick={() => setAdaptacoes((p) => p.filter((_, j) => j !== i))}
                      className="hover:opacity-70"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Input nova tag */}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="Digite e pressione Enter para adicionar..."
              className="w-full px-3 py-2 text-sm border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 bg-background"
            />

            {/* Sugestões */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {ADAPTACOES_SUGERIDAS.filter((s) => !adaptacoes.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addTag(s)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-muted text-muted-foreground text-xs rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    {s}
                  </button>
                ))}
            </div>
          </div>

          {/* Erro externo (ex: backend offline) */}
          {erroExterno && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {erroExterno}
            </div>
          )}

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-border hover:bg-accent text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
            >
              {isEdit ? "Salvar alterações" : "Adicionar aluno"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
