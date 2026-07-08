"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { color, border, gradient } from "@runup/ui/tokens";
import type {
  AuthUser,
  CoachStudentDto,
  SubscriptionView,
  AdherenceAlert,
} from "@runup/api-client";
import { api, hasToken } from "../lib/api";

const TIER_LABEL: Record<string, string> = {
  free: "Grátis · 1–2",
  pro: "Pro · 3–6",
  elite: "Elite · 7+",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [students, setStudents] = useState<CoachStudentDto[]>([]);
  const [sub, setSub] = useState<SubscriptionView | null>(null);
  const [alerts, setAlerts] = useState<AdherenceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasToken()) {
      router.replace("/login");
      return;
    }
    Promise.all([
      api.me(),
      api.coachStudents(),
      api.subscription(),
      api.alerts(),
    ])
      .then(([u, s, sb, a]) => {
        setUser(u);
        setStudents(s);
        setSub(sb);
        setAlerts(a);
      })
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function invite() {
    const email = window.prompt("Email do aluno para convidar:");
    if (!email) return;
    try {
      await api.inviteStudent(email.trim());
      setStudents(await api.coachStudents());
    } catch {
      window.alert("Não foi possível convidar (aluno precisa ter conta).");
    }
  }

  if (loading) {
    return <div style={styles.loading}>Carregando…</div>;
  }

  const active = students.filter((s) => s.status === "active");
  const overLimit = sub ? sub.activeStudents > sub.maxStudents : false;

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          Run<span style={{ color: color.orange500 }}>Up</span>
        </div>
        <NavItem label="Painel" active />
        <NavItem
          label="Alunos"
          badge={active.length}
          onClick={() => router.push("/students")}
        />
        <NavItem label="Treinos" onClick={() => router.push("/builder")} />
        <NavItem label="Importar" onClick={() => router.push("/import")} />
        <NavItem label="Chat" onClick={() => router.push("/students")} />
        <div style={{ flex: 1 }} />
        {sub && (
          <div style={styles.subCard}>
            <div style={styles.subTier}>Plano {TIER_LABEL[sub.tier]}</div>
            <div style={styles.subInfo}>
              {sub.activeStudents} aluno(s) ativo(s)
              {overLimit ? " — acima do limite" : ""}
            </div>
            {(overLimit || !sub.canActivateMore) && (
              <button style={styles.upgrade}>Fazer upgrade</button>
            )}
          </div>
        )}
      </aside>

      {/* Conteúdo */}
      <main style={styles.content}>
        <header style={styles.top}>
          <div>
            <div style={styles.greeting}>Bom dia, {user?.name}</div>
            <div style={styles.greetingSub}>
              {active.length} aluno(s) · {alerts.length} alerta(s)
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={invite} style={styles.newBtnGhost}>
              + Novo aluno
            </button>
            <button onClick={() => router.push("/builder")} style={styles.newBtn}>
              + Novo treino
            </button>
          </div>
        </header>

        {/* Resumo */}
        <div style={styles.summaryRow}>
          <div style={styles.hero}>
            <div style={styles.heroLabel}>ALUNOS ATIVOS</div>
            <div style={styles.heroValue}>{active.length}</div>
            <div style={styles.heroSub}>Plano {sub ? TIER_LABEL[sub.tier] : "—"}</div>
          </div>
          <SummaryCard label="Alertas" value={alerts.length} accent={alerts.length > 0} />
          <SummaryCard
            label="Limite do plano"
            value={`${sub?.activeStudents ?? 0}/${sub?.maxStudents ?? 0}`}
          />
        </div>

        {/* Precisam de atenção */}
        {alerts.length > 0 && (
          <>
            <div style={styles.section}>PRECISAM DE ATENÇÃO</div>
            <div style={styles.attentionRow}>
              {alerts.map((a) => (
                <div
                  key={a.studentId}
                  onClick={() => router.push(`/students/${a.studentId}`)}
                  style={{ ...styles.attentionCard, cursor: "pointer" }}
                >
                  <div style={styles.avatar}>{initials(a.studentName)}</div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.attnName}>{a.studentName}</div>
                    <div style={styles.attnWarn}>
                      {a.consecutiveMissed} treinos pulados seguidos
                    </div>
                  </div>
                  <span style={styles.attnAction}>Ver aluno</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Alunos */}
        <div style={styles.section}>ALUNOS</div>
        <div style={styles.list}>
          {students.length === 0 && (
            <div style={styles.empty}>
              Nenhum aluno ainda. Use “+ Novo aluno” para convidar.
            </div>
          )}
          {students.map((s) => (
            <div
              key={s.id}
              onClick={() => router.push(`/students/${s.student.id}`)}
              style={{ ...styles.studentRow, cursor: "pointer" }}
            >
              <div style={styles.avatar}>{initials(s.student.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={styles.studentName}>{s.student.name}</div>
                <div style={styles.studentEmail}>{s.student.email}</div>
              </div>
              <StatusChip status={s.status} />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function NavItem({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        ...styles.nav,
        ...(active ? styles.navActive : {}),
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <span style={{ color: active ? "#fff" : color.textSecondary }}>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span style={styles.navBadge}>{badge}</span>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div style={styles.summaryCard}>
      <div style={styles.cardLabel}>{label}</div>
      <div style={{ ...styles.cardValue, color: accent ? color.orange400 : color.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: CoachStudentDto["status"] }) {
  const map = {
    active: { label: "Em dia", bg: "rgba(74,222,128,0.12)", fg: color.success },
    pending: { label: "Pendente", bg: color.surface3, fg: color.textSecondary },
    ended: { label: "Encerrado", bg: color.surface3, fg: color.textMuted },
  } as const;
  const s = map[status];
  return (
    <span style={{ ...styles.chip, background: s.bg, color: s.fg }}>{s.label}</span>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

const styles: Record<string, React.CSSProperties> = {
  loading: { padding: 40, color: color.textSecondary },
  shell: { display: "flex", minHeight: "100vh", background: color.surface0 },
  sidebar: {
    width: 200,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 4,
    borderRight: `1px solid ${border.hairline}`,
  },
  brand: { fontSize: 18, fontWeight: 700, margin: "4px 8px 16px" },
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "9px 12px",
    borderRadius: 8,
    fontSize: 13,
  },
  navActive: { background: color.surface2, border: `1px solid ${border.hairline}` },
  navBadge: {
    fontSize: 10,
    fontWeight: 600,
    padding: "1px 7px",
    borderRadius: 99,
    background: color.orangeDim,
    color: color.orange400,
  },
  subCard: {
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 10,
    padding: 12,
  },
  subTier: { fontSize: 11, fontWeight: 600, marginBottom: 2 },
  subInfo: { fontSize: 10, color: color.textMuted, marginBottom: 8 },
  upgrade: {
    border: "none",
    borderRadius: 99,
    background: color.orange500,
    color: color.ink,
    fontWeight: 600,
    fontSize: 11,
    padding: "6px 12px",
    cursor: "pointer",
  },
  content: { flex: 1, padding: 24, minWidth: 0 },
  top: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  greeting: { fontSize: 18, fontWeight: 600 },
  greetingSub: { fontSize: 12, color: color.textMuted },
  newBtn: {
    border: "none",
    borderRadius: 99,
    background: color.orange500,
    color: color.ink,
    fontWeight: 600,
    fontSize: 12,
    padding: "8px 16px",
    cursor: "pointer",
  },
  newBtnGhost: {
    border: `1px solid ${border.strong}`,
    borderRadius: 99,
    background: "transparent",
    color: color.textSecondary,
    fontWeight: 500,
    fontSize: 12,
    padding: "8px 16px",
    cursor: "pointer",
  },
  summaryRow: { display: "flex", gap: 12, marginBottom: 20 },
  hero: {
    flex: 1.3,
    borderRadius: 14,
    padding: 18,
    background: `radial-gradient(130% 140% at 18% 0%, ${gradient.brasaRadiante[0]}, ${gradient.brasaRadiante[1]} 48%, ${gradient.brasaRadiante[2]})`,
  },
  heroLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: 600,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
  },
  heroValue: { fontSize: 30, fontWeight: 700, color: "#fff" },
  heroSub: { fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 6 },
  summaryCard: {
    flex: 1,
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 12,
    padding: 16,
  },
  cardLabel: { fontSize: 11, color: color.textMuted, marginBottom: 8 },
  cardValue: { fontSize: 24, fontWeight: 700 },
  section: {
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 500,
    color: color.textMuted,
    margin: "6px 0 10px",
  },
  attentionRow: { display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" },
  attentionCard: {
    flex: "1 1 260px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: color.surface2,
    border: `1px solid ${border.hairline}`,
    borderRadius: 12,
    padding: 12,
  },
  attnName: { fontSize: 12, fontWeight: 600 },
  attnWarn: { fontSize: 10, color: color.danger },
  attnAction: { fontSize: 11, fontWeight: 600, color: color.orange400 },
  list: { display: "flex", flexDirection: "column", gap: 0 },
  empty: { color: color.textMuted, fontSize: 13, padding: "12px 0" },
  studentRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 0",
    borderBottom: `1px solid ${border.hairline}`,
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
  studentName: { fontSize: 13, fontWeight: 600 },
  studentEmail: { fontSize: 11, color: color.textMuted },
  chip: { fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 99 },
};
