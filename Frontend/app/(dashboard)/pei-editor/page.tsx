"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Sparkles,
  Save,
  Download,
  User,
  Target,
  Lightbulb,
  Package,
  ClipboardCheck,
  Plus,
  X,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  useForm,
  useFieldArray,
  Control,
  UseFormRegister,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { mockAlunos } from "../../mock/data";
import { sugerirPEI, type SugestoesPEI } from "../../utils/api";
import { peiSchema, PEIFormData } from "../../schemas/pei.schema";

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  name: keyof Pick<PEIFormData, "objetivos" | "estrategias" | "recursos" | "avaliacoes">;
  control: Control<PEIFormData>;
  register: UseFormRegister<PEIFormData>;
  error?: string;
  placeholder: string;
}

export default function PEIEditorPage() {
  const params = useParams<{ id: string }>();
  const alunoId = params?.id;

  const [showSuggestions, setShowSuggestions] = useState(true);
  const [sugestoes, setSugestoes] = useState<SugestoesPEI | null>(null);
  const [carregandoSugestoes, setCarregandoSugestoes] = useState(false);
  const [erroSugestoes, setErroSugestoes] = useState("");

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PEIFormData>({
    resolver: zodResolver(peiSchema),
    defaultValues: {
      alunoId: alunoId || "",
      objetivos: [{ value: "" }],
      estrategias: [{ value: "" }],
      recursos: [{ value: "" }],
      avaliacoes: [{ value: "" }],
    },
  });

  const alunoSelecionado = watch("alunoId");
  const alunoAtual = mockAlunos.find((a) => a.id === alunoSelecionado);

  const objetivosField = useFieldArray({ control, name: "objetivos" });

  useEffect(() => {
    if (!alunoAtual) {
      setSugestoes(null);
      return;
    }

    setCarregandoSugestoes(true);
    setErroSugestoes("");
    setSugestoes(null);

    sugerirPEI(alunoAtual)
      .then(setSugestoes)
      .catch(() =>
        setErroSugestoes("Não foi possível carregar sugestões. Verifique o backend.")
      )
      .finally(() => setCarregandoSugestoes(false));
  }, [alunoAtual?.id]);

  const adicionarSugestao = (sugestao: string) => {
    const atuais = watch("objetivos");
    if (!atuais.some((o) => o.value === sugestao)) {
      objetivosField.append({ value: sugestao });
    }
  };

  const onSubmit = (data: PEIFormData) => {
    console.log(data);
  };

  return (
    <div className="h-full bg-background flex">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 lg:p-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Plano Educacional Individualizado
            </h1>
            <p className="text-muted-foreground">
              Crie um PEI estruturado com auxílio da assistente inteligente
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {!alunoId && (
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
                  {mockAlunos.map((aluno) => (
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
                  <p className="text-sm text-muted-foreground">{alunoAtual.diagnostico}</p>
                </motion.div>

                <div className="space-y-8">
                  <Section
                    title="Objetivos"
                    icon={Target}
                    name="objetivos"
                    control={control}
                    register={register}
                    error={errors.objetivos?.message}
                    placeholder="Digite um objetivo..."
                  />
                  <Section
                    title="Estratégias"
                    icon={Lightbulb}
                    name="estrategias"
                    control={control}
                    register={register}
                    error={errors.estrategias?.message}
                    placeholder="Digite uma estratégia..."
                  />
                  <Section
                    title="Recursos"
                    icon={Package}
                    name="recursos"
                    control={control}
                    register={register}
                    error={errors.recursos?.message}
                    placeholder="Digite um recurso..."
                  />
                  <Section
                    title="Avaliações"
                    icon={ClipboardCheck}
                    name="avaliacoes"
                    control={control}
                    register={register}
                    error={errors.avaliacoes?.message}
                    placeholder="Digite uma forma de avaliação..."
                  />
                </div>

                <div className="mt-12 flex gap-4 pb-8">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-card border rounded-lg flex items-center justify-center gap-2"
                  >
                    <Save className="w-5 h-5" />
                    Salvar
                  </button>
                  <button
                    type="button"
                    className="flex-1 px-6 py-3 bg-primary text-white rounded-lg flex items-center justify-center gap-2"
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

      {alunoAtual && showSuggestions && (
        <motion.aside
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-80 bg-card border-l p-6 hidden lg:block overflow-y-auto"
        >
          <div className="flex justify-between mb-4">
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Sugestões de IA
            </h3>
            <button onClick={() => setShowSuggestions(false)}>
              <X className="w-4 h-4" />
            </button>
          </div>

          {carregandoSugestoes && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
              Gerando sugestões...
            </div>
          )}

          {erroSugestoes && (
            <p className="text-sm text-red-500">{erroSugestoes}</p>
          )}

          {sugestoes && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Objetivos
                </p>
                <div className="space-y-2">
                  {sugestoes.objetivos.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => adicionarSugestao(s)}
                      className="w-full text-left p-3 bg-primary/5 rounded-lg text-sm hover:bg-primary/10 transition-colors"
                    >
                      <Plus className="inline w-4 h-4 mr-2 text-primary" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Estratégias sugeridas
                </p>
                <ul className="space-y-1">
                  {sugestoes.estrategias.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground pl-2 border-l-2 border-primary/30">
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </motion.aside>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, name, control, register, error, placeholder }: SectionProps) {
  const fieldArray = useFieldArray({ control, name });

  return (
    <div className="p-6 bg-card rounded-xl border">
      <h3 className="font-bold flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-primary" />
        {title}
      </h3>
      <div className="space-y-3">
        {fieldArray.fields.map((field, index) => (
          <div key={field.id} className="flex gap-2">
            <input
              {...register(`${name}.${index}.value` as const)}
              placeholder={placeholder}
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button type="button" onClick={() => fieldArray.remove(index)}>
              <X className="w-5 h-5" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fieldArray.append({ value: "" })}
          className="w-full border-dashed border p-3 rounded-lg"
        >
          <Plus className="inline w-4 h-4 mr-2" />
          Adicionar
        </button>
        {error && <p className="text-sm text-red-500 mt-2">{error}</p>}
      </div>
    </div>
  );
}
