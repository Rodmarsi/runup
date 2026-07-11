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

/** Duração em s como "1h52" ou "31:47". */
export function duration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}
