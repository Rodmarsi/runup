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

  /** Envia via Expo Push API. Nunca lança — notificação não pode derrubar o fluxo principal. */
  async send(userId: string, title: string, body: string) {
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
}
