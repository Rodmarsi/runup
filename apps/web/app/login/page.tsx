"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { color, border, gradient } from "@runup/ui/tokens";
import { ApiError } from "@runup/api-client";
import { api } from "../../lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.login(email.trim(), password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={styles.wrap}>
      <form onSubmit={onSubmit} style={styles.card}>
        <h1 style={styles.logo}>
          Run<span style={{ color: color.orange500 }}>Up</span>
        </h1>
        <p style={styles.subtitle}>Dashboard do treinador</p>

        <input
          style={styles.input}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p style={styles.error}>{error}</p>}

        <button type="submit" disabled={busy} style={styles.cta}>
          {busy ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: 340,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    background: color.surface1,
    border: `1px solid ${border.hairline}`,
    borderRadius: 16,
    padding: 28,
  },
  logo: { fontSize: 30, fontWeight: 700, margin: 0 },
  subtitle: { color: color.textSecondary, margin: "0 0 12px", fontSize: 13 },
  input: {
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 8,
    color: color.textPrimary,
    fontSize: 14,
    padding: "11px 14px",
    outline: "none",
  },
  error: { color: color.danger, fontSize: 12, margin: 0 },
  cta: {
    marginTop: 6,
    border: "none",
    borderRadius: 99,
    padding: "12px 0",
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    background: `linear-gradient(135deg, ${gradient.brasa[0]}, ${gradient.brasa[1]}, ${gradient.brasa[2]})`,
  },
};
