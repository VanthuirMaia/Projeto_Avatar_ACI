"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  MessageCircle,
  Menu,
  X,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { AlunosProvider } from "../context/AlunosContext";
import { ChatHistoryProvider } from "../context/ChatHistoryContext";
import { AdaptacoesHistoryProvider } from "../context/AdaptacoesHistoryContext";
import AuthGuard from "../components/AuthGuard";

const menu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Alunos", href: "/students", icon: Users },
  { name: "Assistente", href: "/assistant", icon: MessageCircle },
  { name: "Adaptar Atividade", href: "/activity-adaptation", icon: Sparkles },
  { name: "Editor de PEI", href: "/pei-editor", icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState("");
  const [roleUsuario, setRoleUsuario] = useState("");

  useEffect(() => {
    setNomeUsuario(localStorage.getItem("avatartea_user") ?? "");
    setRoleUsuario(localStorage.getItem("avatartea_role") ?? "professor");
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("avatartea_token");
    localStorage.removeItem("avatartea_user");
    localStorage.removeItem("avatartea_role");
    router.replace("/login");
  };

  return (
    <AuthGuard>
    <AlunosProvider>
    <ChatHistoryProvider>
    <AdaptacoesHistoryProvider>
    <div className="flex h-screen overflow-hidden bg-background">

      {/* Overlay mobile */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 bg-card border-r border-border p-4 flex flex-col
          transform transition-transform duration-200
          ${menuAberto ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        `}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Lorna</h1>
            <p className="text-sm text-muted-foreground">Educational Assistant</p>
          </div>
          <button
            onClick={() => setMenuAberto(false)}
            className="lg:hidden p-1 rounded hover:bg-accent text-muted-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex flex-col gap-1">
          {menu.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuAberto(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-all
                  ${isActive
                    ? "bg-primary text-white"
                    : "text-muted-foreground hover:bg-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto space-y-3 pt-4 border-t border-border">
          {nomeUsuario && (
            <div className="px-2">
              <p className="text-sm font-medium text-foreground truncate">{nomeUsuario}</p>
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                roleUsuario === "coordenador"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-primary/10 text-primary"
              }`}>
                <ShieldCheck className="w-3 h-3" />
                {roleUsuario === "coordenador" ? "Coordenador(a)" : "Professor(a)"}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
          <p className="text-xs text-muted-foreground px-2">© 2026 Lorna</p>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Barra superior mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-card border-b border-border flex-shrink-0">
          <button
            onClick={() => setMenuAberto(true)}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground"
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Lorna</h1>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {children}
        </main>
      </div>

    </div>
    </AdaptacoesHistoryProvider>
    </ChatHistoryProvider>
    </AlunosProvider>
    </AuthGuard>
  );
}