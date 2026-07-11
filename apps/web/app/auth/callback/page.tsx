"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { color } from "@runup/ui/tokens";
import { api } from "../../../lib/api";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // O callback do Google devolve os tokens no fragmento (#access_token=...).
    const frag = new URLSearchParams(window.location.hash.slice(1));
    const token = frag.get("access_token");
    const refreshToken = frag.get("refresh_token");
    if (token) {
      api.setSession(token, refreshToken ?? undefined).then(() => router.replace("/"));
    } else {
      router.replace("/login?error=google");
    }
  }, [router]);

  return (
    <main style={styles.wrap}>
      <span style={{ color: color.textSecondary }}>Concluindo login…</span>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
};
