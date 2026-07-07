/** Converte uma data em chave "YYYY-MM-DD" (UTC). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Sequência de dias seguidos com atividade, terminando em hoje ou ontem.
 * Recebe as datas de execução (uma ou mais por dia) e a data de referência.
 * A streak continua válida se o último dia ativo foi hoje ou ontem.
 */
export function computeStreak(activityDates: Date[], today: Date): number {
  const active = new Set(activityDates.map(dayKey));
  if (active.size === 0) return 0;

  const cursor = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );

  // Se não treinou hoje, a streak ainda vale se treinou ontem.
  if (!active.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!active.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (active.has(dayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}
