"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { color, border } from "@runup/ui/tokens";
import type { CoachStudentOverview } from "@runup/api-client";
import { api, hasToken } from "../../../lib/api";

const RACE_LABEL: Record<string, string> = {
  "5k": "5 km", "10k": "10 km", "21k": "21 km", "42k": "42 km", other: "Prova",
};

function km(m: number) {
  return (m / 1000).toFixed(1).replace(".", ",");
}
/** Duração em s como "1h20" ou "31:47" — mesmo formato usado no app do aluno. */
function duration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
function daysLabel(n: number) {
  return `${n} ${n <= 1 ? "dia" : "dias"}`;
}
function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p.charAt(0).toUpperCase()).join("");
}
function dayTitle(d: CoachStudentOverview["days"][number]): string {
  const run = d.blocks.flatMap((b) => b.items).find((i) => i.kind === "running");
  if (run && run.kind === "running") {
    if (run.interval) return `Tiros · ${run.interval.reps}× ${run.interval.repDistanceMeters ?? ""}m`;
    if (run.distanceMeters) return `Corrida · ${km(run.distanceMeters)} km`;
    return "Corrida";
  }
  return "Treino";
}
const STATUS_COLOR: Record<string, string> = {
  done: color.success, partial: color.orange400, skipped: color.danger, pending: color.textFaint,
};

export default function StudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [data, setData] = useState<CoachStudentOverview | null>(null);
  const [linkId, setLinkId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionRow, setActionRow] = useState<{ dayId: string; mode: "move" | "duplicate" } | null>(null);
  const [actionDate, setActionDate] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    return api.coachStudentOverview(studentId).then(setData);
  }

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([load(), api.conversations()])
      .then(([, convs]) => {
        setLinkId(convs.find((c) => c.with.id === studentId)?.linkId ?? null);
      })
      .catch(() => router.replace("/"))
      .finally(() => setLoading(false));
  }, [router, studentId]);

  function openAction(dayId: string, mode: "move" | "duplicate") {
    setActionRow({ dayId, mode });
    setActionDate("");
  }

  async function confirmAction() {
    if (!actionRow || !actionDate) return;
    setBusy(true);
    try {
      if (actionRow.mode === "move") {
        await api.updateWorkoutDay(actionRow.dayId, { date: actionDate });
      } else {
        await api.duplicateWorkoutDay(actionRow.dayId, actionDate);
      }
      await load();
      setActionRow(null);
    } catch {
      alert("Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  }

  async function cancelDay(dayId: string) {
    if (!confirm("Cancelar este treino?")) return;
    setBusy(true);
    try {
      await api.updateWorkoutDay(dayId, { status: "skipped" });
      await load();
    } catch {
      alert("Não foi possível cancelar o treino.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={styles.loading}>Carregando…</div>;
  if (!data) return null;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...data.days]
    .filter((d) => d.date.slice(0, 10) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  return (
    <main style={styles.wrap}>
      <button onClick={() => router.push("/students")} style={styles.back}>
        ‹ Alunos
      </button>

      <div style={styles.header}>
        <div style={styles.avatar}>{initials(data.student.name)}</div>
        <div style={{ flex: 1 }}>
          <div style={styles.name}>{data.student.name}</div>
          <div style={styles.email}>{data.student.email}</div>
        </div>
        {linkId && (
          <button onClick={() => router.push(`/chat/${linkId}`)} style={styles.chatBtn}>
            Conversar
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={styles.statGrid}>
        <Stat label="Distância total" value={`${km(data.stats.totalDistanceMeters)} km`} />
        <Stat label="Tempo total" value={duration(data.stats.totalTimeSeconds)} />
        <Stat label="Treinos" value={String(data.stats.workoutCount)} />
        <Stat label="Streak" value={daysLabel(data.stats.streakDays)} />
      </div>

      {/* Metas */}
      {data.goals.length > 0 && (
        <>
          <div style={styles.section}>METAS</div>
          {data.goals.map((g) => (
            <div key={g.id} style={styles.card}>
              <div style={styles.cardTitle}>{g.raceName ?? RACE_LABEL[g.targetRace]}</div>
              <div style={styles.muted}>
                {RACE_LABEL[g.targetRace]} · {g.raceDate.slice(0, 10)}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Próximos treinos */}
      <div style={styles.section}>PRÓXIMOS TREINOS</div>
      {upcoming.length === 0 ? (
        <p style={styles.muted}>Nenhum treino futuro atribuído.</p>
      ) : (
        upcoming.map((d) => (
          <div key={d.id} style={styles.dayRowWrap}>
            <div style={styles.dayRow}>
              <span style={{ ...styles.dot, background: STATUS_COLOR[d.status] }} />
              <div style={{ flex: 1 }}>
                <div style={styles.dayTitle}>{dayTitle(d)}</div>
                <div style={styles.muted}>Semana {d.week} · {d.date.slice(0, 10)}</div>
              </div>
              <div style={styles.dayActions}>
                <button
                  onClick={() => openAction(d.id, "duplicate")}
                  disabled={busy}
                  style={styles.actionBtn}
                >
                  Duplicar
                </button>
                <button
                  onClick={() => openAction(d.id, "move")}
                  disabled={busy}
                  style={styles.actionBtn}
                >
                  Mover
                </button>
                <button
                  onClick={() => cancelDay(d.id)}
                  disabled={busy}
                  style={{ ...styles.actionBtn, color: color.danger }}
                >
                  Cancelar
                </button>
              </div>
            </div>
            {actionRow?.dayId === d.id && (
              <div style={styles.actionForm}>
                <span style={styles.muted}>
                  {actionRow.mode === "move" ? "Nova data:" : "Duplicar para:"}
                </span>
                <input
                  type="date"
                  value={actionDate}
                  onChange={(e) => setActionDate(e.target.value)}
                  style={styles.dateInput}
                />
                <button onClick={confirmAction} disabled={busy || !actionDate} style={styles.confirmBtn}>
                  Confirmar
                </button>
                <button onClick={() => setActionRow(null)} style={styles.cancelLink}>
                  cancelar
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.muted}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, color: color.textSecondary },
  wrap: { maxWidth: 720, margin: "0 auto", padding: 24 },
  back: { background: "none", border: "none", color: color.textSecondary, fontSize: 13, cursor: "pointer" },
  header: { display: "flex", alignItems: "center", gap: 12, margin: "14px 0 18px" },
  avatar: {
    width: 44, height: 44, borderRadius: 99, background: color.surface3,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 15, fontWeight: 600, color: color.textSecondary,
  },
  name: { fontSize: 18, fontWeight: 600 },
  email: { fontSize: 12, color: color.textMuted },
  chatBtn: {
    border: "none", borderRadius: 99, background: color.orange500, color: color.ink,
    fontWeight: 600, fontSize: 12, padding: "8px 16px", cursor: "pointer",
  },
  statGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  statCard: {
    width: "calc(25% - 6px)", minWidth: 120, background: color.surface2,
    border: `1px solid ${border.hairline}`, borderRadius: 12, padding: 12,
  },
  statValue: { fontSize: 18, fontWeight: 700, marginTop: 6 },
  section: { fontSize: 10, letterSpacing: 1.2, fontWeight: 500, color: color.textMuted, margin: "20px 0 10px" },
  card: {
    background: color.surface2, border: `1px solid ${border.hairline}`,
    borderRadius: 12, padding: 12, marginBottom: 8,
  },
  cardTitle: { fontSize: 13, fontWeight: 600 },
  muted: { fontSize: 11, color: color.textMuted },
  dayRowWrap: { borderBottom: `1px solid ${border.hairline}` },
  dayRow: {
    display: "flex", alignItems: "center", gap: 12, padding: "10px 0",
  },
  dot: { width: 8, height: 8, borderRadius: 99 },
  dayTitle: { fontSize: 13, fontWeight: 600 },
  dayActions: { display: "flex", gap: 4 },
  actionBtn: {
    background: "none", border: "none", color: color.textMuted, fontSize: 11,
    cursor: "pointer", padding: "4px 6px",
  },
  actionForm: {
    display: "flex", alignItems: "center", gap: 8, paddingBottom: 12,
  },
  dateInput: {
    background: color.surface2, border: `1px solid ${border.hairline}`, borderRadius: 8,
    color: color.textPrimary, fontSize: 12, padding: "6px 8px",
  },
  confirmBtn: {
    border: "none", borderRadius: 99, background: color.orange500, color: color.ink,
    fontWeight: 600, fontSize: 11, padding: "6px 12px", cursor: "pointer",
  },
  cancelLink: {
    background: "none", border: "none", color: color.textFaint, fontSize: 11, cursor: "pointer",
  },
};
