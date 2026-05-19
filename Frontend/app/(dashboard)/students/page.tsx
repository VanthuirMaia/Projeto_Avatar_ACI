"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, FileText, Sparkles, TrendingUp, Pencil, Trash2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAlunos } from "../../context/AlunosContext";
import StudentFormModal from "../../components/StudentFormModal";
import type { Aluno } from "../../mock/data";

function diagBadge(d: string) {
  const l = d.toLowerCase();
  if (l.includes("tea") || l.includes("autis")) return "bg-blue-100 text-blue-700";
  if (l.includes("tdah")) return "bg-orange-100 text-orange-700";
  if (l.includes("dislexia")) return "bg-green-100 text-green-700";
  if (l.includes("asperger")) return "bg-purple-100 text-purple-700";
  if (l.includes("altas")) return "bg-yellow-100 text-yellow-700";
  return "bg-muted text-muted-foreground";
}

export default function StudentsPage() {
  const router = useRouter();
  const { alunos, criar, editar, remover, setAlunoAtivo } = useAlunos();

  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<Aluno | null>(null);

  const filtered = alunos.filter(
    (a) =>
      a.nome.toLowerCase().includes(search.toLowerCase()) ||
      a.diagnostico.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (dados: Omit<Aluno, "id">) => {
    if (editando) {
      editar(editando.id, dados);
    } else {
      criar(dados);
    }
    setModalOpen(false);
    setEditando(null);
  };

  const handleDelete = (aluno: Aluno) => {
    if (window.confirm(`Remover ${aluno.nome} permanentemente?`)) {
      remover(aluno.id);
    }
  };

  const handleChat = (aluno: Aluno) => {
    setAlunoAtivo(aluno);
    router.push("/assistant");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Meus Alunos</h1>
            <p className="text-muted-foreground">
              Gerencie os perfis e inicie conversas personalizadas
            </p>
          </div>
          <button
            onClick={() => { setEditando(null); setModalOpen(true); }}
            className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-semibold rounded-lg hover:shadow-xl transition-all flex items-center gap-2 shadow-lg"
          >
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Total de Alunos</span>
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <div className="text-3xl font-bold">{alunos.length}</div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">PEIs Ativos</span>
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <div className="text-3xl font-bold">8</div>
        </div>

        <div className="bg-card rounded-xl p-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted-foreground">Adaptações Este Mês</span>
            <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-secondary" />
            </div>
          </div>
          <div className="text-3xl font-bold">42</div>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((aluno, i) => (
          <motion.div
            key={aluno.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card rounded-xl border border-border hover:border-primary hover:shadow-xl transition-all overflow-hidden flex flex-col"
          >
            {/* Avatar area */}
            <div className="relative bg-gradient-to-br from-primary/10 to-secondary/10 p-6 pb-14">
              <div className="absolute top-4 right-4">
                <span className="px-3 py-1 bg-white/90 text-primary text-xs font-semibold rounded-full">
                  {aluno.serie}
                </span>
              </div>
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {aluno.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
            </div>

            {/* Info */}
            <div className="px-6 -mt-8 relative flex-1 flex flex-col">
              <div className="bg-card rounded-lg p-4 shadow-md border border-border mb-4">
                <h3 className="font-bold text-lg text-center">{aluno.nome}</h3>
                <p className="text-sm text-center text-muted-foreground">{aluno.idade} anos</p>
                <div className="flex justify-center mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${diagBadge(aluno.diagnostico)}`}>
                    {aluno.diagnostico}
                  </span>
                </div>
              </div>

              {aluno.adaptacoesPreferidas?.length ? (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                    Adaptações
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {aluno.adaptacoesPreferidas.slice(0, 3).map((a, j) => (
                      <span key={j} className="text-xs px-2 py-1 bg-secondary/10 text-secondary rounded-full">
                        {a}
                      </span>
                    ))}
                    {aluno.adaptacoesPreferidas.length > 3 && (
                      <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">
                        +{aluno.adaptacoesPreferidas.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mb-4" />
              )}

              {/* Actions */}
              <div className="mt-auto pb-5 space-y-2">
                <div className="flex gap-2">
                  <Link
                    href={`/students/${aluno.id}`}
                    className="flex-1 px-3 py-2 bg-primary/10 text-primary text-sm font-medium rounded-lg hover:bg-primary/20 text-center transition-colors"
                  >
                    Ver Perfil
                  </Link>
                  <button
                    onClick={() => handleChat(aluno)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Iniciar Chat
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditando(aluno); setModalOpen(true); }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(aluno)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Search className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Nenhum aluno encontrado</h3>
          <p className="text-muted-foreground mb-4">
            {search ? "Tente ajustar os termos de busca" : "Adicione o primeiro aluno para começar"}
          </p>
          {!search && (
            <button
              onClick={() => { setEditando(null); setModalOpen(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Aluno
            </button>
          )}
        </div>
      )}

      {/* Modal criar/editar */}
      {modalOpen && (
        <StudentFormModal
          aluno={editando ?? undefined}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditando(null); }}
        />
      )}
    </div>
  );
}
