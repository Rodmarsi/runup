import type { PrismaClient } from "@runup/db";

/**
 * Notificações disparadas nos próprios pontos de escrita já existentes
 * (mensagem nova, treino novo, comentário) — sem depender de um job em
 * segundo plano, que a API não tem hoje.
 */
export class NotificationService {
  constructor(private readonly db: PrismaClient) {}

  async registerToken(userId: string, token: string) {
    await this.db.pushToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  /**
   * Grava a notificação (pro sino in-app) e envia via Expo Push API. A
   * gravação nunca lança — notificação não pode derrubar o fluxo principal
   * que a originou (mensagem, comentário, lembrete...).
   */
  async send(userId: string, title: string, body: string) {
    try {
      await this.db.notification.create({ data: { userId, title, body } });
    } catch {
      // idem — melhor esforço.
    }

    const tokens = await this.db.pushToken.findMany({ where: { userId } });
    if (tokens.length === 0) return;

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(
          tokens.map((t) => ({ to: t.token, title, body, sound: "default" })),
        ),
      });
    } catch {
      // Melhor esforço — falha de push não deve quebrar a ação que a originou.
    }
  }

  /** Últimas notificações do usuário, mais recentes primeiro. */
  list(userId: string) {
    return this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  countUnread(userId: string) {
    return this.db.notification.count({ where: { userId, read: false } });
  }

  async markAllRead(userId: string) {
    await this.db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }
}
