import type { SubscriptionTier } from "@runup/types";

/** Faixas de assinatura do treinador, por nº de alunos ativos. */
export const SUBSCRIPTION_TIERS = {
  free: { maxStudents: 2, priceBRL: 0 },
  pro: { maxStudents: 6, priceBRL: 69.9 },
  elite: { maxStudents: Infinity, priceBRL: 149.9 },
} as const satisfies Record<
  SubscriptionTier,
  { maxStudents: number; priceBRL: number }
>;

/** Retorna a faixa mínima que comporta o nº de alunos ativos. */
export function tierForStudentCount(activeStudents: number): SubscriptionTier {
  if (activeStudents <= SUBSCRIPTION_TIERS.free.maxStudents) return "free";
  if (activeStudents <= SUBSCRIPTION_TIERS.pro.maxStudents) return "pro";
  return "elite";
}

/**
 * Verifica se um treinador pode ativar mais um aluno sem exceder o tier atual.
 * Validação sempre no backend — nunca confiar no cliente.
 */
export function canActivateStudent(
  currentTier: SubscriptionTier,
  currentActiveStudents: number,
): boolean {
  return currentActiveStudents < SUBSCRIPTION_TIERS[currentTier].maxStudents;
}
