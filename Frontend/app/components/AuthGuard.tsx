"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [verificado, setVerificado] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("avatartea_token");
    if (!token) {
      router.replace("/login");
    } else {
      setVerificado(true);
    }
  }, [router]);

  if (!verificado) return null;
  return <>{children}</>;
}
