"use client";

import { useState } from "react";
import {
  Sparkles,
  Upload,
  User,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Copy,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockAlunos } from "../../mock/data";
import { adaptarAtividade } from "../../utils/api";

type Step = 1 | 2 | 3;

export default function AdaptarAtividadePage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [textoOriginal, setTextoOriginal] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState("");
  const [textoAdaptado, setTextoAdaptado] = useState("");
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState("");

  const aluno = mockAlunos.find((a) => a.id === alunoSelecionado);

  const handleAdaptar = async () => {
    if (!textoOriginal || !aluno) return;

    setProcessando(true);
    setErro("");
    setCurrentStep(3);

    try {
      const adaptado = await adaptarAtividade(textoOriginal, aluno);
      setTextoAdaptado(adaptado);
    } catch {
      setErro("Não foi possível adaptar a atividade. Verifique se o backend está rodando.");
      setCurrentStep(2);
    } finally {
      setProcessando(false);
    }
  };

  const copiarTexto = async () => {
    if (!textoAdaptado) return;
    await navigator.clipboard.writeText(textoAdaptado);
  };

  const reiniciar = () => {
    setCurrentStep(1);
    setTextoOriginal("");
    setAlunoSelecionado("");
    setTextoAdaptado("");
    setErro("");
  };

  const steps = [
    { number: 1, label: "Texto Original", icon: Upload },
    { number: 2, label: "Selecionar Aluno", icon: User },
    { number: 3, label: "Resultado", icon: Sparkles },
  ];

  return (
    <div className="min-h-full bg-background">
      <div className="max-w-6xl mx-auto p-4 lg:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Adaptar Atividade
          </h1>
          <p className="text-muted-foreground">
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
                      currentStep >= step.number
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.number ? (
                      <CheckCircle2 className="w-6 h-6" />
                    ) : (
                      <step.icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className="text-sm mt-2 font-medium hidden sm:block">
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      currentStep > step.number ? "bg-primary" : "bg-muted"
                    }`}
                  />
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
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl p-8 border border-border shadow-lg"
            >
              <textarea
                value={textoOriginal}
                onChange={(e) => setTextoOriginal(e.target.value)}
                placeholder="Cole o texto da atividade aqui..."
                className="w-full h-64 p-4 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none"
              />
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setCurrentStep(2)}
                  disabled={!textoOriginal.trim()}
                  className="px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  Próximo <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-card rounded-2xl p-8 border border-border shadow-lg"
            >
              <div className="grid sm:grid-cols-2 gap-4">
                {mockAlunos.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAlunoSelecionado(a.id)}
                    className={`p-6 rounded-xl border-2 text-left transition-all ${
                      alunoSelecionado === a.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <h3 className="font-semibold">{a.nome}</h3>
                    <p className="text-sm text-muted-foreground">{a.diagnostico}</p>
                  </button>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-6 py-3 bg-muted rounded-lg flex items-center gap-2"
                >
                  <ArrowLeft className="w-5 h-5" /> Voltar
                </button>
                <button
                  onClick={handleAdaptar}
                  disabled={!alunoSelecionado}
                  className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5" /> Adaptar com IA
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div key="step3">
              {processando ? (
                <div className="text-center p-12">
                  <Sparkles className="w-10 h-10 mx-auto animate-pulse text-primary" />
                  <p className="mt-4 text-muted-foreground">
                    Adaptando para {aluno?.nome}...
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-card p-6 rounded-xl border">
                      <h3 className="font-semibold mb-3">Original</h3>
                      <p className="whitespace-pre-wrap text-sm">{textoOriginal}</p>
                    </div>
                    <div className="bg-primary/5 p-6 rounded-xl border border-primary/20">
                      <h3 className="font-semibold mb-3">
                        Adaptado para {aluno?.nome}
                      </h3>
                      <p className="whitespace-pre-wrap text-sm">{textoAdaptado}</p>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button onClick={reiniciar} className="px-6 py-3 bg-muted rounded-lg">
                      Nova Adaptação
                    </button>
                    <button
                      onClick={copiarTexto}
                      className="px-6 py-3 bg-primary text-white rounded-lg flex items-center gap-2"
                    >
                      <Copy className="w-5 h-5" /> Copiar
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
