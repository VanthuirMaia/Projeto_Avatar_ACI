"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function tokenValido(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("avatartea_token");
    if (!token || !tokenValido(token)) {
      localStorage.removeItem("avatartea_token");
      localStorage.removeItem("avatartea_user");
      router.replace("/login");
    } else {
      setVerificado(true);
    }
  }, [router]);

  if (!verificado) return (
    <div className="h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  return <>{children}</>;
}
