"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { color, border } from "@runup/ui/tokens";
import type { CoachStudentDto } from "@runup/api-client";
import { api, hasToken } from "../../lib/api";

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}

export default function StudentsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<CoachStudentDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    api
      .coachStudents()
      .then(setStudents)
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <div style={styles.loading}>Carregando…</div>;

  return (
    <main style={styles.wrap}>
      <button onClick={() => router.push("/")} style={styles.back}>
        ‹ Painel
      </button>
      <h1 style={styles.h1}>Alunos</h1>
      <div>
        {students.length === 0 && (
          <p style={{ color: color.textMuted }}>Nenhum aluno ainda.</p>
        )}
        {students.map((s) => (
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
