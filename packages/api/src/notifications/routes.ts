import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { z } from "zod";
import { errors } from "../errors.js";
import { requireAuth } from "../auth/middleware.js";
import { NotificationService } from "./service.js";

const registerTokenSchema = z.object({ token: z.string().min(1) });

export function notificationRoutes(db: PrismaClient) {
  const notifications = new NotificationService(db);
  const authed = { preHandler: requireAuth };

  return async function (app: FastifyInstance) {
    app.post("/me/push-token", authed, async (request, reply) => {
      const parsed = registerTokenSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      await notifications.registerToken(request.authUser!.id, parsed.data.token);
      reply.status(204).send();
    });

    app.get("/me/notifications", authed, async (request) => {
      return notifications.list(request.authUser!.id);
    });

    app.get("/me/notifications/unread-count", authed, async (request) => {
      return { count: await notifications.countUnread(request.authUser!.id) };
    });

    app.post("/me/notifications/read", authed, async (request, reply) => {
      await notifications.markAllRead(request.authUser!.id);
      reply.status(204).send();
    });
  };
}
