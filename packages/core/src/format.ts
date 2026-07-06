/** Formata segundos como duração (ex.: 6692 → "1h51", 1907 → "31:47"). */
export function formatDuration(totalSeconds: number): string {
  const s = Math.round(totalSeconds);
  const hours = Math.floor(s / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  if (hours > 0) {
    return `${hours}h${String(minutes).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Formata pace (segundos por km) como "m:ss/km" (ex.: 270 → "4:30/km"). */
export function formatPace(secPerKm: number): string {
  const s = Math.round(secPerKm);
  const minutes = Math.floor(s / 60);
  const seconds = s % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}/km`;
}

/** Converte distância + tempo em pace (segundos por km). */
export function paceFrom(distanceMeters: number, timeSeconds: number): number {
  if (distanceMeters <= 0) throw new Error("Distância inválida");
  return timeSeconds / (distanceMeters / 1000);
}
