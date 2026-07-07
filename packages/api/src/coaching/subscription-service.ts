import type { PrismaClient } from "@runup/db";
import type { SubscriptionTier } from "@runup/types";
import { SUBSCRIPTION_TIERS, canActivateStudent } from "@runup/core";

export interface SubscriptionView {
  tier: SubscriptionTier;
  maxStudents: number;
  activeStudents: number;
  canActivateMore: boolean;
}

export class SubscriptionService {
  constructor(private readonly db: PrismaClient) {}

  /** Conta alunos com vínculo ativo do treinador. */
  countActiveStudents(coachId: string): Promise<number> {
    return this.db.coachStudent.count({
      where: { coachId, status: "active" },
    });
  }

  /** Retorna a assinatura do treinador, criando uma free se não existir. */
  private async ensure(coachId: string) {
    const existing = await this.db.subscription.findUnique({
      where: { coachId },
    });
    if (existing) return existing;
    return this.db.subscription.create({
      data: { coachId, tier: "free", status: "active" },
    });
  }

  async view(coachId: string): Promise<SubscriptionView> {
    const sub = await this.ensure(coachId);
    const activeStudents = await this.countActiveStudents(coachId);
    return {
      tier: sub.tier,
      maxStudents: SUBSCRIPTION_TIERS[sub.tier].maxStudents,
      activeStudents,
      canActivateMore: canActivateStudent(sub.tier, activeStudents),
    };
  }

  /**
   * Verifica se o treinador pode ativar mais um aluno segundo o tier atual.
   * Validação sempre no backend — nunca confiar no cliente.
   */
  async canActivate(coachId: string): Promise<boolean> {
    const sub = await this.ensure(coachId);
    const active = await this.countActiveStudents(coachId);
    return canActivateStudent(sub.tier, active);
  }

  /**
   * Atualiza o tier do treinador. STUB: numa integração real, o tier só muda
   * após confirmação do gateway de pagamento (webhook). Aqui aplicamos direto.
   */
  async setTier(coachId: string, tier: SubscriptionTier): Promise<SubscriptionView> {
    await this.ensure(coachId);
    await this.db.subscription.update({
      where: { coachId },
      data: { tier, status: "active" },
    });
    return this.view(coachId);
  }
}
