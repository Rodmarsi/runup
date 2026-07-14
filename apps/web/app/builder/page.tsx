"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { color, border, gradient } from "@runup/ui/tokens";
import type { Block, BlockRole, BlockItem } from "@runup/types";
import type { CoachStudentDto } from "@runup/api-client";
import { api, hasToken } from "../../lib/api";

type Kind = "running" | "free";

interface DraftBlock {
  role: BlockRole;
  kind: Kind;
  // corrida
  distanceKm: string;
  pace: string; // m:ss
  reps: string;
  repDist: string;
  recovery: string;
  intervals: boolean;
  // livre
  notes: string;
}

function emptyBlock(role: BlockRole, kind: Kind): DraftBlock {
  return {
    role,
    kind,
    distanceKm: "",
    pace: "",
    reps: "",
    repDist: "",
    recovery: "",
    intervals: false,
    notes: "",
  };
}

function parsePace(v: string): number | undefined {
  const m = v.match(/^(\d+):(\d{1,2})$/);
  if (!m) return undefined;
  return parseInt(m[1]!, 10) * 60 + parseInt(m[2]!, 10);
}

function toBlock(d: DraftBlock, order: number): Block {
  if (d.kind === "free") {
    return { kind: "free", role: d.role, order, items: [{ kind: "free", notes: d.notes || "Treino" }] };
  }
  const item: BlockItem = {
    kind: "running",
    runningType: d.intervals ? "intervals" : "easy",
    ...(d.distanceKm && !d.intervals
      ? { distanceMeters: Math.round(parseFloat(d.distanceKm.replace(",", ".")) * 1000) }
      : {}),
    ...(parsePace(d.pace) ? { targetPaceSecPerKm: parsePace(d.pace) } : {}),
    ...(d.intervals
      ? {
          interval: {
            reps: parseInt(d.reps || "0", 10),
            repDistanceMeters: d.repDist ? parseInt(d.repDist, 10) : undefined,
            recoverySeconds: d.recovery ? parseInt(d.recovery, 10) : undefined,
          },
        }
      : {}),
  };
  return { kind: "running", role: d.role, order, items: [item] };
}

export default function BuilderPage() {
  const router = useRouter();
  const [students, setStudents] = useState<CoachStudentDto[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [blocks, setBlocks] = useState<DraftBlock[]>([
    emptyBlock("warmup", "free"),
    emptyBlock("main", "running"),
  ]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  function update(i: number, patch: Partial<DraftBlock>) {
    setBlocks((bs) => bs.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  }
  function remove(i: number) {
    setBlocks((bs) => bs.filter((_, j) => j !== i));
  }

  async function assign() {
    setError(null);
    if (!studentId || !title.trim()) {
      setError("Escolha o aluno e dê um título.");
      return;
    }
    setBusy(true);
    try {
      await api.createPlan({
        studentId,
        title: title.trim(),
        durationWeeks: 1,
        startDate: date,
        days: [{ week: 1, date, blocks: blocks.map((b, i) => toBlock(b, i)) }],
      });
      setDone(true);
    } catch {
      setError("Não foi possível atribuir o treino.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main style={styles.doneWrap}>
        <div style={styles.doneCard}>
          <div style={styles.doneTitle}>Treino atribuído ✓</div>
          <button onClick={() => router.push("/")} style={styles.primary}>
            Voltar ao painel
          </button>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.wrap}>
      <div style={styles.head}>
        <button onClick={() => router.push("/")} style={styles.back}>
          ‹ Voltar
        </button>
        <button onClick={assign} disabled={busy} style={styles.assign}>
          {busy ? "Atribuindo…" : "Atribuir treino"}
        </button>
      </div>

      <h1 style={styles.h1}>Novo treino</h1>

      <div style={styles.metaRow}>
        <label style={styles.field}>
          <span style={styles.label}>ALUNO</span>
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
        </label>
        <label style={styles.field}>
          <span style={styles.label}>TÍTULO</span>
          <input
            style={styles.input}
            placeholder="Ex.: Tiros 10× 400m"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label style={styles.field}>
          <span style={styles.label}>DATA</span>
          <input
            style={styles.input}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      </div>

      {blocks.map((b, i) => (
        <div key={i} style={{ ...styles.block, ...(b.role === "main" ? styles.blockMain : {}) }}>
          <div style={styles.blockHead}>
            <select
              style={styles.smallSelect}
              value={b.role}
              onChange={(e) => update(i, { role: e.target.value as BlockRole })}
            >
              <option value="warmup">Aquecimento</option>
              <option value="main">Principal</option>
              <option value="cooldown">Desaquecimento</option>
            </select>
            <select
              style={styles.smallSelect}
              value={b.kind}
              onChange={(e) => update(i, { kind: e.target.value as Kind })}
            >
              <option value="running">Corrida</option>
              <option value="free">Livre</option>
            </select>
            <div style={{ flex: 1 }} />
            <button onClick={() => remove(i)} style={styles.remove}>
              remover
            </button>
          </div>

          {b.kind === "free" ? (
            <input
              style={styles.input}
              placeholder="Descrição (ex.: 10 min trote + educativos)"
              value={b.notes}
              onChange={(e) => update(i, { notes: e.target.value })}
            />
          ) : (
            <>
              <label style={styles.checkRow}>
                <input
                  type="checkbox"
                  checked={b.intervals}
                  onChange={(e) => update(i, { intervals: e.target.checked })}
                />
                <span style={styles.checkLabel}>Intervalado</span>
              </label>
              <div style={styles.fieldsRow}>
                {b.intervals ? (
                  <>
                    <MiniField label="REPS" value={b.reps} onChange={(v) => update(i, { reps: v })} ph="10" grow={0.6} />
                    <MiniField label="DIST (m)" value={b.repDist} onChange={(v) => update(i, { repDist: v })} ph="400" grow={1} />
                    <MiniField label="REC (s)" value={b.recovery} onChange={(v) => update(i, { recovery: v })} ph="90" grow={0.8} />
                  </>
                ) : (
                  <MiniField label="DIST (km)" value={b.distanceKm} onChange={(v) => update(i, { distanceKm: v })} ph="6,5" grow={1} />
                )}
                <MiniField label="PACE (m:ss)" value={b.pace} onChange={(v) => update(i, { pace: v })} ph="4:30" accent grow={1} />
              </div>
            </>
          )}
        </div>
      ))}

      <div style={styles.addRow}>
        <span style={styles.addLabel}>+ Adicionar bloco:</span>
        <button style={styles.addBtn} onClick={() => setBlocks((b) => [...b, emptyBlock("main", "running")])}>
          Corrida
        </button>
        <button style={styles.addBtn} onClick={() => setBlocks((b) => [...b, emptyBlock("cooldown", "free")])}>
          Livre
        </button>
      </div>

      {error && <p style={styles.error}>{error}</p>}
    </main>
  );
}

function MiniField({
  label,
  value,
  onChange,
  ph,
  accent,
  grow = 1,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  ph: string;
  accent?: boolean;
  grow?: number;
}) {
  return (
    <label style={{ ...styles.field, flex: grow }}>
      <span style={styles.label}>{label}</span>
      <input
        style={{ ...styles.input, ...(accent ? { color: color.orange400 } : {}) }}
        placeholder={ph}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { maxWidth: 720, margin: "0 auto", padding: 24 },
  head: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  back: { background: "none", border: "none", color: color.textSecondary, fontSize: 13, cursor: "pointer" },
  assign: {
    border: "none",
    borderRadius: 99,
    padding: "8px 16px",
    fontSize: 12,
    fontWeight: 600,
    color: "#fff",
    cursor: "pointer",
    background: `linear-gradient(135deg, ${gradient.brasa[0]}, ${gradient.brasa[1]}, ${gradient.brasa[2]})`,
  },
  h1: { fontSize: 22, fontWeight: 600, margin: "12px 0 16px" },
  metaRow: { display: "flex", gap: 10, marginBottom: 16 },
  field: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  label: { fontSize: 10, letterSpacing: 1, color: color.textMuted, fontWeight: 500 },
  input: {
    background: color.surface3,
    border: `1px solid ${border.hairline}`,
    borderRadius: 8,
    color: color.textPrimary,
    fontSize: 13,
    padding: "8px 10px",
    outline: "none",
  },
  block: {
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  blockMain: { borderColor: "rgba(255,85,0,0.35)" },
  blockHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 10 },
  smallSelect: {
    background: color.surface3,
    border: `1px solid ${border.hairline}`,
    borderRadius: 7,
    color: color.textPrimary,
    fontSize: 11,
    padding: "5px 8px",
  },
  remove: { background: "none", border: "none", color: color.textFaint, fontSize: 11, cursor: "pointer" },
  checkRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 8 },
  checkLabel: { fontSize: 12, color: color.textSecondary },
  fieldsRow: { display: "flex", gap: 8 },
  addRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 6, padding: 10, border: `1px dashed ${border.strong}`, borderRadius: 12 },
  addLabel: { fontSize: 12, color: color.textMuted },
  addBtn: {
    background: color.surface3,
    border: `1px solid ${border.hairline}`,
    borderRadius: 99,
    color: color.orange400,
    fontSize: 11,
    fontWeight: 600,
    padding: "5px 12px",
    cursor: "pointer",
  },
  error: { color: color.danger, fontSize: 12, marginTop: 12 },
  doneWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" },
  doneCard: { textAlign: "center", display: "flex", flexDirection: "column", gap: 16 },
  doneTitle: { fontSize: 20, fontWeight: 600 },
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
