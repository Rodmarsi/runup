export interface PlanSlot {
  week: number;
  date: string;
  weekday: number;
}

function localIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Calcula as datas de treino (semana + data) a partir dos dias da semana
 * disponíveis — determinístico, não depende da IA acertar datas.
 */
export function computeSlots(
  startDate: string,
  durationWeeks: number,
  weekdays: number[],
): PlanSlot[] {
  const [y, m, d] = startDate.split("-").map(Number) as [number, number, number];
  const start = new Date(y, m - 1, d);
  const weekdaySet = new Set(weekdays);
  const slots: PlanSlot[] = [];

  for (let week = 1; week <= durationWeeks; week++) {
    for (let dow = 0; dow < 7; dow++) {
      if (!weekdaySet.has(dow)) continue;
      const offset = (week - 1) * 7 + ((dow - start.getDay() + 7) % 7);
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
      slots.push({ week, date: localIso(date), weekday: dow });
    }
  }
  return slots.sort((a, b) => a.date.localeCompare(b.date));
}
