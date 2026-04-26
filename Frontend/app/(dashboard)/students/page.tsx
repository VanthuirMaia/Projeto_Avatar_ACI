"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Sparkles, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { mockAlunos } from "../../mock/data";

export default function StudentsPage() {
  const [search, setSearch] = useState("");

  const filteredStudents = mockAlunos.filter(
    (student) =>
      student.nome.toLowerCase().includes(search.toLowerCase()) ||
      student.diagnostico.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Meus Alunos
            </h1>
            <p className="text-muted-foreground">
              Gerencie os perfis e acompanhe o progresso de cada estudante
            </p>
          </div>

          <button className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-xl transition-all flex items-center gap-2 shadow-lg">
            <Plus className="w-5 h-5" />
            Adicionar Aluno
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou diagnóstico..."
            className="w-full pl-11 pr-4 py-3 bg-input-background rounded-lg border border-border focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total de Alunos</span>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">
            {mockAlunos.length}
          </div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">PEIs Ativos</span>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">8</div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">
              Adaptações Este Mês
            </span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl font-bold text-foreground">42</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents.map((student, i) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              href={`/students/${student.id}`}
              className="block bg-card rounded-xl border border-border hover:border-primary hover:shadow-xl transition-all overflow-hidden group"
            >
              <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6 pb-16">
                <div className="absolute top-4 right-4">
                  <span className="px-3 py-1 bg-white/90 text-primary text-xs font-semibold rounded-full">
                    {student.serie}
                  </span>
                </div>

                <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                  {student.nome
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
              </div>

              <div className="p-6 -mt-8 relative">
                <div className="bg-card rounded-lg p-4 shadow-md border border-border mb-4">
                  <h3 className="font-bold text-lg text-center">
                    {student.nome}
                  </h3>
                  <p className="text-sm text-center text-muted-foreground">
                    {student.idade} anos
                  </p>
                </div>

                {student.adaptacoesPreferidas?.length && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-secondary"></div>
                      <span className="text-xs font-semibold text-muted-foreground uppercase">
                        Adaptações
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {student.adaptacoesPreferidas
                        .slice(0, 3)
                        .map((adaptation, i) => (
                          <span
                            key={i}
                            className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full"
                          >
                            {adaptation}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 pb-6 flex gap-2">
                <button className="flex-1 px-4 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20">
                  Ver Perfil
                </button>
                <button className="flex-1 px-4 py-2 bg-secondary/10 text-secondary text-sm font-medium rounded-lg hover:bg-secondary/20">
                  Adaptar
                </button>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>

          <h3 className="text-lg font-semibold mb-2">
            Nenhum aluno encontrado
          </h3>

          <p className="text-muted-foreground">
            Tente ajustar os termos de busca
          </p>
        </div>
      )}
    </div>
  );
}