"use client";

import { useState } from "react";
import { CheckCircle, XCircle, RefreshCw, ShieldCheck } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:5022";

interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
  status: "pendente" | "aprovado" | "bloqueado";
  criado_em: string;
}

function statusBadge(status: string) {
  if (status === "aprovado") return "bg-green-100 text-green-700";
  if (status === "bloqueado") return "bg-red-100 text-red-700";
  return "bg-yellow-100 text-yellow-700";
}

export default function AdminPage() {
  const [adminKey, setAdminKey] = useState("");
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const buscarUsuarios = async () => {
    setErro("");
    setMensagem("");
    setCarregando(true);
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/admin/users`, {
        headers: { "X-Admin-Key": adminKey },
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErro(json.error ?? "Acesso negado.");
        setUsuarios([]);
        return;
      }
      setUsuarios(json.users);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  };

  const atualizarStatus = async (id: string, status: "aprovado" | "bloqueado") => {
    setMensagem("");
    setErro("");
    try {
      const resp = await fetch(`${BACKEND_URL}/auth/admin/users/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ status }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        setErro(json.error ?? "Erro ao atualizar.");
        return;
      }
      setMensagem(json.message ?? "Atualizado.");
      setUsuarios((prev) => prev.map((u) => (u.id === id ? { ...u, status } : u)));
    } catch {
      setErro("Erro de conexão.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-8 pt-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Painel Admin</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de usuários — AvaTEA</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 mb-6">
          <label className="block text-sm font-medium mb-2">Chave de administrador</label>
          <div className="flex gap-3">
            <input
              type="password"
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="ADMIN_KEY"
              className="flex-1 px-4 py-3 border border-border rounded-lg bg-background focus:border-primary focus:outline-none min-h-[44px]"
              onKeyDown={(e) => e.key === "Enter" && buscarUsuarios()}
            />
            <button
              onClick={buscarUsuarios}
              disabled={!adminKey || carregando}
              className="px-5 py-3 bg-primary text-white rounded-lg flex items-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors min-h-[44px]"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? "animate-spin" : ""}`} />
              Carregar
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {erro}
          </div>
        )}
        {mensagem && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {mensagem}
          </div>
        )}

        {usuarios.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border">
              <h2 className="font-bold">
                {usuarios.length} usuário{usuarios.length !== 1 ? "s" : ""}
              </h2>
            </div>
            <div className="divide-y divide-border">
              {usuarios.map((u) => (
                <div key={u.id} className="px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{u.nome}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cadastrado em {new Date(u.criado_em).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(u.status)}`}>
                      {u.status}
                    </span>
                    {u.status !== "aprovado" && (
                      <button
                        onClick={() => atualizarStatus(u.id, "aprovado")}
                        title="Aprovar"
                        className="p-2 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                    {u.status !== "bloqueado" && (
                      <button
                        onClick={() => atualizarStatus(u.id, "bloqueado")}
                        title="Bloquear"
                        className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {usuarios.length === 0 && !erro && adminKey && !carregando && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Nenhum usuário cadastrado ainda.
          </div>
        )}
      </div>
    </div>
  );
}
