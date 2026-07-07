"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { color, border, gradient } from "@runup/ui/tokens";
import type {
  CoachStudentDto,
  ImportPreview,
  InterpretedDay,
} from "@runup/api-client";
import { api, hasToken } from "../../lib/api";

async function fileToBase64(file: File): Promise<string> {
  const buf = new Uint8Array(await file.arrayBuffer());
  let bin = "";
  for (const b of buf) bin += String.fromCharCode(b);
  return btoa(bin);
}

function dayTitle(d: InterpretedDay): string {
  const run = d.blocks.flatMap((b) => b.items).find((i) => i.kind === "running");
  if (run && run.kind === "running") {
    if (run.interval) return `Tiros · ${run.interval.reps}× ${run.interval.repDistanceMeters ?? ""}m`;
    if (run.distanceMeters) return `Corrida · ${(run.distanceMeters / 1000).toFixed(1)} km`;
    return "Corrida";
  }
  const free = d.blocks.flatMap((b) => b.items).find((i) => i.kind === "free");
  if (free && free.kind === "free") return free.notes;
  return "Treino";
}

export default function ImportPage() {
  const router = useRouter();
  const [students, setStudents] = useState<CoachStudentDto[]>([]);
  const [studentId, setStudentId] = useState("");
  const [base64, setBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    api
      .coachStudents()
      .then((s) => {
        const active = s.filter((x) => x.status === "active");
        setStudents(active);
        if (active[0]) setStudentId(active[0].student.id);
      })
      .catch(() => router.replace("/login"));
  }, [router]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setBase64(await fileToBase64(file));
    setPreview(null);
  }

  async function interpret() {
    if (!studentId || !base64) {
      setError("Escolha o aluno e a planilha.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      setPreview(await api.importExcel(studentId, base64));
    } catch {
      setError("Falha ao interpretar (a IA precisa de ANTHROPIC_API_KEY).");
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const days = preview.plan.days.map((d) => ({
        week: d.week,
        date: d.date ?? preview.plan.days[0]?.date ?? new Date().toISOString().slice(0, 10),
        blocks: d.blocks,
      }));
      await api.confirmImport({
        studentId,
        title: preview.plan.title,
        durationWeeks: preview.plan.durationWeeks,
        startDate: days[0]!.date,
        days,
      });
      setDone(true);
    } catch {
      setError("Não foi possível criar o plano.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main style={styles.center}>
        <div style={{ textAlign: "center", display: "grid", gap: 16 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Plano criado ✓</div>
          <button onClick={() => router.push("/")} style={styles.primary}>
            Voltar ao painel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <button onClick={() => router.push("/")} style={styles.back}>
        ‹ Voltar
      </button>
      <h1 style={styles.h1}>Importar planilha</h1>

      <div style={styles.controls}>
        <select
          style={styles.input}
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          {students.map((s) => (
            <option key={s.student.id} value={s.student.id}>
              {s.student.name}
            </option>
          ))}
        </select>
        <label style={styles.fileBtn}>
          {fileName ?? "Escolher .xlsx"}
          <input
            type="file"
            accept=".xlsx"
            style={{ display: "none" }}
            onChange={onFile}
          />
        </label>
        <button onClick={interpret} disabled={busy || !base64} style={styles.interpretBtn}>
          {busy && !preview ? "Interpretando…" : "Interpretar"}
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}

      {preview && (
        <>
          <div style={styles.summary}>
            <span>
              A IA interpretou <b>{preview.summary.days} treinos</b> em{" "}
              <b>{preview.summary.weeks} semana(s)</b>
            </span>
            {preview.summary.lowConfidence > 0 && (
              <span style={{ color: color.orange400 }}>
                {" · "}
                {preview.summary.lowConfidence} item(ns) para revisar
              </span>
            )}
          </div>

          <div style={styles.days}>
            {preview.plan.days.map((d, i) => {
              const low = d.confidence === "low";
              return (
                <div
                  key={i}
                  style={{ ...styles.dayCard, ...(low ? styles.dayLow : {}) }}
                >
                  <div style={styles.dayHead}>
                    <span style={styles.dayLabel}>
                      {d.dayLabel ?? `Semana ${d.week}`}
                    </span>
                    {low ? (
                      <span style={styles.lowBadge}>revisar</span>
                    ) : (
                      <span style={styles.okBadge}>OK</span>
                    )}
                  </div>
                  <div style={styles.dayTitle}>{dayTitle(d)}</div>
                  <div style={styles.daySource}>
                    {d.sourceRef}
                    {d.note ? ` · ${d.note}` : ""}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.footer}>
            <span style={styles.guard}>Nada é salvo até você confirmar.</span>
            <button onClick={confirm} disabled={busy} style={styles.confirmBtn}>
              {busy ? "Criando…" : "Confirmar e criar plano"}
            </button>
          </div>
        </>
      )}
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: 24 },
  center: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  back: { background: "none", border: "none", color: color.textSecondary, fontSize: 13, cursor: "pointer" },
  h1: { fontSize: 22, fontWeight: 600, margin: "12px 0 16px" },
  controls: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  input: {
    background: color.surface3,
    border: `1px solid ${border.hairline}`,
    borderRadius: 8,
    color: color.textPrimary,
    fontSize: 13,
    padding: "9px 10px",
    outline: "none",
  },
  fileBtn: {
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 8,
    color: color.textSecondary,
    fontSize: 13,
    padding: "9px 14px",
    cursor: "pointer",
  },
  interpretBtn: {
    border: "none",
    borderRadius: 99,
    background: color.orange500,
    color: color.ink,
    fontWeight: 600,
    fontSize: 12,
    padding: "9px 16px",
    cursor: "pointer",
  },
  error: { color: color.danger, fontSize: 12, marginTop: 12 },
  summary: {
    marginTop: 20,
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    color: color.textSecondary,
  },
  days: { marginTop: 12, display: "grid", gap: 8 },
  dayCard: {
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 12,
    padding: 12,
  },
  dayLow: { background: "rgba(255,85,0,0.06)", borderColor: "rgba(255,85,0,0.35)" },
  dayHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  dayLabel: { fontSize: 11, color: color.textMuted },
  okBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: color.success,
    background: "rgba(74,222,128,0.12)",
    padding: "2px 8px",
    borderRadius: 99,
  },
  lowBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: color.orange400,
    background: color.orangeDim,
    padding: "2px 8px",
    borderRadius: 99,
  },
  dayTitle: { fontSize: 13, fontWeight: 600 },
  daySource: { fontSize: 11, color: color.textFaint, marginTop: 2 },
  footer: {
    marginTop: 20,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  guard: { fontSize: 11, color: color.textMuted },
  confirmBtn: {
    border: "none",
    borderRadius: 99,
    padding: "10px 18px",
    fontSize: 13,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    background: `linear-gradient(135deg, ${gradient.brasa[0]}, ${gradient.brasa[1]}, ${gradient.brasa[2]})`,
  },
  primary: {
    border: "none",
    borderRadius: 99,
    padding: "10px 20px",
    fontWeight: 600,
    color: color.ink,
    background: color.orange500,
    cursor: "pointer",
  },
};
