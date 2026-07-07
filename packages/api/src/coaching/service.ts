import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { SubscriptionService } from "./subscription-service.js";

export class CoachingService {
  private readonly subscriptions: SubscriptionService;

  constructor(private readonly db: PrismaClient) {
    this.subscriptions = new SubscriptionService(db);
  }

  /** Treinador convida um aluno (por email). Cria um vínculo `pending`. */
  async invite(coachId: string, studentEmail: string) {
    const student = await this.db.user.findUnique({
      where: { email: studentEmail },
    });
    if (!student || student.role !== "student") throw errors.studentNotFound();

    const existing = await this.db.coachStudent.findUnique({
      where: {
        coachId_studentId: { coachId, studentId: student.id },
      },
    });
    if (existing && existing.status !== "ended") throw errors.alreadyLinked();

    if (existing) {
      return this.db.coachStudent.update({
        where: { id: existing.id },
        data: { status: "pending" },
      });
    }
    return this.db.coachStudent.create({
      data: { coachId, studentId: student.id, status: "pending" },
    });
  }

  /** Lista os vínculos do treinador. */
  listForCoach(coachId: string) {
    return this.db.coachStudent.findMany({
      where: { coachId },
      include: { student: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** Lista convites pendentes do aluno. */
  pendingForStudent(studentId: string) {
    return this.db.coachStudent.findMany({
      where: { studentId, status: "pending" },
      include: { coach: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Aluno aceita um convite → vínculo vira `active`.
   * Enforce da faixa: se o treinador estourou o limite do tier, bloqueia.
   */
  async accept(studentId: string, linkId: string) {
    const link = await this.getPendingLinkForStudent(studentId, linkId);

    const canActivate = await this.subscriptions.canActivate(link.coachId);
    if (!canActivate) throw errors.coachLimitReached();

    return this.db.coachStudent.update({
      where: { id: link.id },
      data: { status: "active" },
    });
  }

  /** Aluno recusa um convite → vínculo vira `ended`. */
  async decline(studentId: string, linkId: string) {
    const link = await this.getPendingLinkForStudent(studentId, linkId);
    return this.db.coachStudent.update({
      where: { id: link.id },
      data: { status: "ended" },
    });
  }

  private async getPendingLinkForStudent(studentId: string, linkId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { id: linkId },
    });
    // Só o próprio aluno do convite pode agir sobre ele.
    if (!link || link.studentId !== studentId || link.status !== "pending") {
      throw errors.inviteNotFound();
    }
    return link;
  }
}
