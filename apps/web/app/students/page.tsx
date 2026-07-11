"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { color, border } from "@runup/ui/tokens";
import type { CoachStudentDto, CoachInviteDto } from "@runup/api-client";
import { api, hasToken } from "../../lib/api";

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<CoachStudentDto[]>([]);
  const [invites, setInvites] = useState<CoachInviteDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  function load() {
    return Promise.all([api.coachStudents(), api.coachInvites()]).then(([s, i]) => {
      setStudents(s);
      setInvites(i);
    });
  }

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    load()
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function respond(id: string, accept: boolean) {
    setBusy(true);
    try {
      await (accept ? api.acceptCoachInvite(id) : api.declineCoachInvite(id));
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={styles.loading}>Carregando…</div>;

  // Convites que o próprio aluno enviou já aparecem na seção dedicada acima —
  // evita duplicar a linha (e o clique nela quebraria: o vínculo ainda não é ativo).
  const visibleStudents = students.filter(
    (s) => !(s.status === "pending" && s.initiatedBy === "student"),
  );

  return (
    <main style={styles.wrap}>
      <button onClick={() => router.push("/")} style={styles.back}>
        ‹ Painel
      </button>
      <h1 style={styles.h1}>Alunos</h1>

      {invites.length > 0 && (
        <div style={styles.inviteSection}>
          <div style={styles.inviteLabel}>CONVITES DE ALUNOS</div>
          {invites.map((inv) => (
            <div key={inv.id} style={styles.inviteRow}>
              <div style={styles.avatar}>{initials(inv.student.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.name}>{inv.student.name}</div>
                <div style={styles.email}>{inv.student.email}</div>
              </div>
              <button onClick={() => respond(inv.id, true)} disabled={busy} style={styles.acceptBtn}>
                Aceitar
              </button>
              <button onClick={() => respond(inv.id, false)} disabled={busy} style={styles.declineBtn}>
                Recusar
              </button>
            </div>
          ))}
        </div>
      )}

      <div>
        {visibleStudents.length === 0 && (
          <p style={{ color: color.textMuted }}>Nenhum aluno ainda.</p>
        )}
        {visibleStudents.map((s) => (
          <div
            key={s.id}
            onClick={() => router.push(`/students/${s.student.id}`)}
            style={styles.row}
          >
            <div style={styles.avatar}>{initials(s.student.name)}</div>
            <div style={{ flex: 1 }}>
              <div style={styles.name}>{s.student.name}</div>
              <div style={styles.email}>{s.student.email}</div>
            </div>
            <StatusChip status={s.status} />
            <span style={styles.chevron}>›</span>
          </div>
        ))}
      </div>
    </main>
  );
}

function StatusChip({ status }: { status: CoachStudentDto["status"] }) {
  const map = {
    active: { label: "Em dia", bg: "rgba(74,222,128,0.12)", fg: color.success },
    pending: { label: "Pendente", bg: color.surface3, fg: color.textSecondary },
    ended: { label: "Encerrado", bg: color.surface3, fg: color.textMuted },
  } as const;
  const s = map[status];
  return <span style={{ ...styles.chip, background: s.bg, color: s.fg }}>{s.label}</span>;
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, color: color.textSecondary },
  wrap: { maxWidth: 720, margin: "0 auto", padding: 24 },
  back: { background: "none", border: "none", color: color.textSecondary, fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 22, fontWeight: 600, margin: "12px 0 16px" },
  inviteSection: {
    background: color.surface2, border: `1px solid ${border.hairline}`,
    borderRadius: 12, padding: 14, marginBottom: 20,
  },
  inviteLabel: { fontSize: 10, letterSpacing: 1.2, fontWeight: 500, color: color.textMuted, marginBottom: 10 },
  inviteRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  acceptBtn: {
    border: "none", borderRadius: 99, background: color.orange500, color: color.ink,
    fontWeight: 600, fontSize: 12, padding: "7px 14px", cursor: "pointer",
  },
  declineBtn: {
    border: `1px solid ${border.strong}`, borderRadius: 99, background: "none", color: color.textSecondary,
    fontWeight: 500, fontSize: 12, padding: "7px 14px", cursor: "pointer",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: `1px solid ${border.hairline}`,
    cursor: "pointer",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 99,
    background: color.surface3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 600,
    color: color.textSecondary,
  },
  name: { fontSize: 13, fontWeight: 600 },
  email: { fontSize: 11, color: color.textMuted },
  chip: { fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 },
  chevron: { color: color.textFaint, fontSize: 18 },
};
