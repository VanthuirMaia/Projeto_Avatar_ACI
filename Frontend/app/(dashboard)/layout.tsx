"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Sparkles,
  FileText,
  MessageCircle,
} from "lucide-react";

const menu = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Students", href: "/students", icon: Users },
  { name: "Assistant", href: "/assistant", icon: MessageCircle },
  { name: "Adapt Activity", href: "/activity-adaptation", icon: Sparkles },
  { name: "PEI Editor", href: "/pei-editor", icon: FileText },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">

      <aside className="w-64 bg-card border-r border-border p-4 flex flex-col">
        
        <div className="mb-8">
          <h1 className="text-xl font-bold">Lorna</h1>
          <p className="text-sm text-muted-foreground">
            Educational Assistant
          </p>
        </div>

        <nav className="flex flex-col gap-2">
          {menu.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-accent"
                  }
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto text-xs text-muted-foreground">
          © 2026 Lorna
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}