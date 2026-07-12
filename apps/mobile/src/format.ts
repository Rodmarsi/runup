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

/** Duração em s como "1h52" ou "31:47". */
export function duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
