"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Sparkles, Heart, Users, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="hidden lg:block space-y-8"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-foreground">Lorna</h1>
                <p className="text-muted-foreground">
                  Agente Educacional Inteligente
                </p>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-foreground leading-tight">
              Transformando a educação inclusiva com{" "}
              <span className="text-primary">
                inteligência artificial
              </span>
            </h2>

            <p className="text-lg text-muted-foreground">
              Sua parceira pedagógica para personalizar o ensino e apoiar cada aluno em sua jornada única de aprendizagem.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Sparkles,
                title: "Adaptação Inteligente",
                desc: "IA que adapta atividades em segundos",
              },
              {
                icon: Users,
                title: "Perfis Personalizados",
                desc: "Acompanhamento individual de cada aluno",
              },
              {
                icon: BookOpen,
                title: "PEIs Estruturados",
                desc: "Geração assistida de planos educacionais",
              },
              {
                icon: Heart,
                title: "Suporte Contínuo",
                desc: "Assistente sempre disponível para dúvidas",
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-xl border border-border/50"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Right side */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full"
        >
          <div className="bg-card rounded-2xl shadow-2xl p-8 lg:p-12 border border-border">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg mx-auto mb-4">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Lorna</h1>
              <p className="text-muted-foreground">Educação Inclusiva</p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Bem-vinda de volta!
              </h2>
              <p className="text-muted-foreground">
                Acesse sua conta para continuar apoiando seus alunos
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@escola.edu.br"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Senha
                </label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary rounded" />
                  <span className="text-sm text-muted-foreground">
                    Lembrar de mim
                  </span>
                </label>
                <a href="#" className="text-sm text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
              >
                Entrar
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-border text-center">
              <p className="text-sm text-muted-foreground">
                Primeira vez aqui?{" "}
                <a href="#" className="text-primary font-medium hover:underline">
                  Criar conta
                </a>
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Ao entrar, você concorda com nossos Termos de Uso e Política de Privacidade
          </p>
        </motion.div>
      </div>
    </div>
  );
}