/** Converte uma data em chave "YYYY-MM-DD" (UTC). */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Diferença em dias inteiros entre duas chaves "YYYY-MM-DD". */
function daysBetween(fromKey: string, toKey: string): number {
  const from = new Date(`${fromKey}T00:00:00Z`).getTime();
  const to = new Date(`${toKey}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Folga: descansar até 4 dias seguidos não quebra a sequência (plano típico tem dias de descanso). */
const STREAK_GRACE_DAYS = 5;

/**
 * Sequência de treino: conta os dias distintos com atividade recente, sem
 * quebrar por causa de dias de descanso normais do plano (ex.: treinar
 * seg/qua/sáb). Só reseta quando o aluno fica STREAK_GRACE_DAYS (5) dias ou
 * mais sem nenhum treino registrado.
 */
export function computeStreak(activityDates: Date[], today: Date): number {
  const activeDays = [...new Set(activityDates.map(dayKey))].sort();
  if (activeDays.length === 0) return 0;

  const todayKey = dayKey(today);
  const lastActive = activeDays[activeDays.length - 1]!;
  if (daysBetween(lastActive, todayKey) >= STREAK_GRACE_DAYS) return 0;

  let streak = 1;
  for (let i = activeDays.length - 1; i > 0; i--) {
    const gap = daysBetween(activeDays[i - 1]!, activeDays[i]!);
    if (gap >= STREAK_GRACE_DAYS) break;
    streak += 1;
  }
  return streak;
}
