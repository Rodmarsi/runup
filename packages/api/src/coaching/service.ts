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
        data: { status: "pending", initiatedBy: "coach" },
      });
    }
    return this.db.coachStudent.create({
      data: { coachId, studentId: student.id, status: "pending", initiatedBy: "coach" },
    });
  }

  /** Aluno convida um treinador (por email) — o treinador é quem aceita/recusa. */
  async inviteCoach(studentId: string, coachEmail: string) {
    const coach = await this.db.user.findUnique({ where: { email: coachEmail } });
    if (!coach || coach.role !== "coach") throw errors.coachNotFound();

    const existing = await this.db.coachStudent.findUnique({
      where: { coachId_studentId: { coachId: coach.id, studentId } },
    });
    if (existing && existing.status !== "ended") throw errors.alreadyLinked();

    if (existing) {
      return this.db.coachStudent.update({
        where: { id: existing.id },
        data: { status: "pending", initiatedBy: "student" },
      });
    }
    return this.db.coachStudent.create({
      data: { coachId: coach.id, studentId, status: "pending", initiatedBy: "student" },
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

  /** Convites que o próprio treinador enviou e aguardam o aluno. */
  pendingForStudent(studentId: string) {
    return this.db.coachStudent.findMany({
      where: { studentId, status: "pending", initiatedBy: "coach" },
      include: { coach: { select: { id: true, name: true, email: true } } },
    });
  }

  /** Convites que um aluno enviou e aguardam o treinador. */
  pendingForCoach(coachId: string) {
    return this.db.coachStudent.findMany({
      where: { coachId, status: "pending", initiatedBy: "student" },
      include: { student: { select: { id: true, name: true, email: true } } },
    });
  }

  /**
   * Aluno aceita um convite do treinador → vínculo vira `active`.
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

  /** Aluno recusa um convite do treinador → vínculo vira `ended`. */
  async decline(studentId: string, linkId: string) {
    const link = await this.getPendingLinkForStudent(studentId, linkId);
    return this.db.coachStudent.update({
      where: { id: link.id },
      data: { status: "ended" },
    });
  }

  /** Treinador aceita um convite enviado por um aluno → vínculo vira `active`. */
  async acceptAsCoach(coachId: string, linkId: string) {
    const link = await this.getPendingLinkForCoach(coachId, linkId);

    const canActivate = await this.subscriptions.canActivate(coachId);
    if (!canActivate) throw errors.coachLimitReached();

    return this.db.coachStudent.update({
      where: { id: link.id },
      data: { status: "active" },
    });
  }

  /** Treinador recusa um convite enviado por um aluno → vínculo vira `ended`. */
  async declineAsCoach(coachId: string, linkId: string) {
    const link = await this.getPendingLinkForCoach(coachId, linkId);
    return this.db.coachStudent.update({
      where: { id: link.id },
      data: { status: "ended" },
    });
  }

  private async getPendingLinkForStudent(studentId: string, linkId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { id: linkId },
    });
    // Só o próprio aluno do convite pode agir sobre ele, e só se foi o treinador quem convidou.
    if (
      !link ||
      link.studentId !== studentId ||
      link.status !== "pending" ||
      link.initiatedBy !== "coach"
    ) {
      throw errors.inviteNotFound();
    }
    return link;
  }

  private async getPendingLinkForCoach(coachId: string, linkId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { id: linkId },
    });
    // Só o próprio treinador do convite pode agir sobre ele, e só se foi o aluno quem convidou.
    if (
      !link ||
      link.coachId !== coachId ||
      link.status !== "pending" ||
      link.initiatedBy !== "student"
    ) {
      throw errors.inviteNotFound();
    }
    return link;
  }
}
