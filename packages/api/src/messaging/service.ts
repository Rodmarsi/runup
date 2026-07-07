import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";

export class MessageService {
  constructor(private readonly db: PrismaClient) {}

  /** Garante que o usuário faz parte do vínculo (treinador ou aluno). */
  private async assertMember(userId: string, linkId: string) {
    const link = await this.db.coachStudent.findUnique({
      where: { id: linkId },
    });
    if (!link || (link.coachId !== userId && link.studentId !== userId)) {
      throw errors.forbidden();
    }
    return link;
  }

  async send(userId: string, linkId: string, text: string) {
    await this.assertMember(userId, linkId);
    return this.db.message.create({
      data: { coachStudentId: linkId, senderId: userId, text },
    });
  }

  /** Lista as mensagens do vínculo e marca como lidas as recebidas. */
  async list(userId: string, linkId: string) {
    await this.assertMember(userId, linkId);
    await this.db.message.updateMany({
      where: {
        coachStudentId: linkId,
        senderId: { not: userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    return this.db.message.findMany({
      where: { coachStudentId: linkId },
      orderBy: { sentAt: "asc" },
    });
  }

  /** Conversas do usuário: vínculos + última mensagem + não lidas. */
  async conversations(userId: string) {
    const links = await this.db.coachStudent.findMany({
      where: { OR: [{ coachId: userId }, { studentId: userId }] },
      include: {
        coach: { select: { id: true, name: true } },
        student: { select: { id: true, name: true } },
      },
    });

    return Promise.all(
      links.map(async (link) => {
        const other = link.coachId === userId ? link.student : link.coach;
        const lastMessage = await this.db.message.findFirst({
          where: { coachStudentId: link.id },
          orderBy: { sentAt: "desc" },
        });
        const unread = await this.db.message.count({
          where: {
            coachStudentId: link.id,
            senderId: { not: userId },
            readAt: null,
          },
        });
        return { linkId: link.id, with: other, lastMessage, unread };
      }),
    );
  }
}
