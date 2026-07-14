import type { Block } from "@runup/types";

interface ShoeWear {
  totalKm: number;
  alertKm: number | null;
}

/** % de desgaste até o km de alerta — null quando o tênis não tem alerta configurado. */
export function shoeProgressPct(shoe: ShoeWear): number | null {
  if (!shoe.alertKm) return null;
  return Math.min(100, Math.round((shoe.totalKm / shoe.alertKm) * 100));
}

/**
 * Data (YYYY-MM-DD) no fuso horário LOCAL do aparelho — nunca use
 * `Date#toISOString()` para "hoje": ele converte para UTC, então perto da
 * meia-noite (ex.: 21h-23h59 no Brasil, UTC-3) mostra o dia seguinte.
 */
export function localIsoDate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** "2026-07-12" → "12/07/2026", pro padrão que o aluno brasileiro espera. */
export function isoToBr(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS_LONG = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
const MONTHS_SHORT = [
  "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-07" → "Julho de 2026" (cabeçalho de grupo mensal). */
export function monthYearLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const name = MONTHS_LONG[(m ?? 1) - 1] ?? "";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} de ${y}`;
}

/** ISO datetime → "12 de jul de 2026 · 10:14". */
export function longDateTime(iso: string): string {
  const d = new Date(iso);
  const month = MONTHS_SHORT[d.getMonth()];
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} de ${month} de ${d.getFullYear()} · ${hh}:${mm}`;
}

/** Date local (sem UTC) → "2026-07-12", pro valor que sai do date picker. */
export function dateToIso(d: Date): string {
  return localIsoDate(d);
}

/** Saudação de acordo com o horário local do aparelho. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

/** Formata metros como km com uma casa (ex.: 6480 → "6,5"). */
export function km(meters: number): string {
  return (meters / 1000).toFixed(1).replace(".", ",");
}

/** Semanas (arredondado pra cima, mínimo 1) entre duas datas ISO — usado pra prova alvo. */
export function weeksUntil(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toIso.split("-").map(Number) as [number, number, number];
  const from = new Date(fy, fm - 1, fd).getTime();
  const to = new Date(ty, tm - 1, td).getTime();
  return Math.max(1, Math.ceil((to - from) / (7 * 86_400_000)));
}

/** "5:30" → 330 segundos. */
export function parsePace(text: string): number | undefined {
  const m = text.match(/^(\d+):(\d{2})$/);
  if (!m) return undefined;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Máscara de tempo pra digitação só de números: insere ":" antes dos dois
 * últimos dígitos, iterativamente — "550" → "5:50", "11020" → "1:10:20".
 * Uso: `onChangeText={(t) => setText(maskTimeDigits(t))}`.
 */
export function maskTimeDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return `${digits.slice(0, -2)}:${digits.slice(-2)}`;
  }
  return `${digits.slice(0, -4)}:${digits.slice(-4, -2)}:${digits.slice(-2)}`;
}

/** "5:30" ou "1:05:30" → segundos (aceita mm:ss ou h:mm:ss). */
export function parseTimeInput(input: string): number | undefined {
  const parts = input.trim().split(":").map(Number);
  if (parts.length < 2 || parts.length > 3 || parts.some((n) => Number.isNaN(n))) return undefined;
  if (parts.length === 3) return parts[0]! * 3600 + parts[1]! * 60 + parts[2]!;
  return parts[0]! * 60 + parts[1]!;
}

/** Pace (s/km) como "m:ss" (ex.: 270 → "4:30"). */
export function pace(secPerKm: number | null): string {
  if (secPerKm === null) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = secPerKm % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Unidade de distância preferida (tela Configurações). Usada só nos números
 * de desempenho real do aluno (estatísticas, resultado do treino) — planos
 * prescritos pelo treinador continuam em km, como foram escritos.
 */
export type Units = "km" | "mi";
const KM_PER_MI = 1.609344;

/** Distância (em metros) formatada na unidade escolhida, sem sufixo. */
export function distance(meters: number, units: Units): string {
  const valueKm = meters / 1000;
  const value = units === "mi" ? valueKm / KM_PER_MI : valueKm;
  return value.toFixed(1).replace(".", ",");
}

/** Pace (s/km) convertido pra unidade escolhida e formatado como "m:ss". */
export function paceForUnits(secPerKm: number | null, units: Units): string {
  if (secPerKm === null) return "—";
  return pace(units === "mi" ? secPerKm * KM_PER_MI : secPerKm);
}

export function unitLabel(units: Units): string {
  return units === "mi" ? "mi" : "km";
}

export function paceUnitLabel(units: Units): string {
  return units === "mi" ? "/mi" : "/km";
}

/** Largura da barra do split (30%-100%): mais lento = barra mais cheia. */
export function splitBarWidth(
  paceSecPerKm: number,
  splits: { paceSecPerKm: number }[],
): number {
  const paces = splits.map((s) => s.paceSecPerKm);
  const min = Math.min(...paces);
  const max = Math.max(...paces);
  if (max === min) return 100;
  return 30 + (70 * (paceSecPerKm - min)) / (max - min);
}

/** Frequência (pico semanal) e distribuição por tipo — pra tela "Visão geral do plano". */
export function summarizePlanDays(
  days: { week: number; blocks: Block[] }[],
): { workoutsPerWeek: number; kindBreakdown: { kind: string; count: number }[] } {
  const perWeek = new Map<number, number>();
  const kindCounts = new Map<string, number>();

  for (const day of days) {
    perWeek.set(day.week, (perWeek.get(day.week) ?? 0) + 1);
    const main = day.blocks.find((b) => b.role === "main") ?? day.blocks[0];
    if (main) kindCounts.set(main.kind, (kindCounts.get(main.kind) ?? 0) + 1);
  }

  return {
    workoutsPerWeek: perWeek.size > 0 ? Math.max(...perWeek.values()) : 0,
    kindBreakdown: [...kindCounts.entries()].map(([kind, count]) => ({ kind, count })),
  };
}

/** Duração em s como "1h52" ou "31:47". */
export function duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "N dia(s)" com plural correto (1 ou menos → singular). */
export function daysLabel(n: number): string {
  return `${n} ${n <= 1 ? "dia" : "dias"}`;
}
