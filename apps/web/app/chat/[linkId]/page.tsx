"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { color, border } from "@runup/ui/tokens";
import type { MessageDto } from "@runup/api-client";
import { api, hasToken } from "../../../lib/api";

export default function ChatPage() {
  const router = useRouter();
  const params = useParams<{ linkId: string }>();
  const linkId = params.linkId;
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [withName, setWithName] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    setMessages(await api.messages(linkId));
  }

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([api.me(), api.messages(linkId), api.conversations()])
      .then(([me, msgs, convs]) => {
        setMeId(me.id);
        setMessages(msgs);
        setWithName(convs.find((c) => c.linkId === linkId)?.with.name ?? null);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router, linkId]);

  useEffect(() => {
    endRef.current?.scrollIntoView();
  }, [messages]);

  async function send() {
    const t = draft.trim();
    if (!t) return;
    setDraft("");
    await api.sendMessage(linkId, t);
    await load();
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.header}>
        <button onClick={() => router.back()} style={styles.back}>
          ‹ Voltar
        </button>
        <span style={styles.title}>{withName ?? "Conversa"}</span>
        <span style={{ width: 48 }} />
      </div>

      <div style={styles.thread}>
        {loading && <p style={styles.muted}>Carregando…</p>}
        {!loading && messages.length === 0 && (
          <p style={styles.muted}>Nenhuma mensagem ainda.</p>
        )}
        {messages.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div
              key={m.id}
              style={{ ...styles.bubble, ...(mine ? styles.mine : styles.theirs) }}
            >
              {m.text}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={styles.inputRow}>
        <input
          style={styles.input}
          placeholder="Mensagem…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} style={styles.sendBtn}>
          Enviar
        </button>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    maxWidth: 640, margin: "0 auto", height: "100vh",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderBottom: `1px solid ${border.hairline}`,
  },
  back: { background: "none", border: "none", color: color.textSecondary, fontSize: 13, cursor: "pointer" },
  title: { fontSize: 15, fontWeight: 600 },
  thread: { flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 8 },
  muted: { color: color.textMuted, fontSize: 13, textAlign: "center" },
  bubble: { maxWidth: "75%", borderRadius: 12, padding: "8px 12px", fontSize: 13 },
  mine: { alignSelf: "flex-end", background: color.orange500, color: color.ink },
  theirs: { alignSelf: "flex-start", background: color.surface3, color: color.textPrimary },
  inputRow: { display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${border.hairline}` },
  input: {
    flex: 1, background: color.surface2, border: `1px solid ${border.hairline}`,
    borderRadius: 99, color: color.textPrimary, fontSize: 14, padding: "10px 14px", outline: "none",
  },
  sendBtn: {
    border: "none", borderRadius: 99, background: color.orange500, color: color.ink,
    fontWeight: 600, fontSize: 13, padding: "0 18px", cursor: "pointer",
  },
};
