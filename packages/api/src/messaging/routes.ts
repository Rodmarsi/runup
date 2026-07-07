import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { requireAuth } from "../auth/middleware.js";
import { MessageService } from "./service.js";
import { sendMessageSchema } from "./schemas.js";

export function messagingRoutes(db: PrismaClient) {
  const messages = new MessageService(db);
  const authed = { preHandler: requireAuth };

  return async function (app: FastifyInstance) {
    app.get("/conversations", authed, async (request) => {
      return messages.conversations(request.authUser!.id);
    });

    app.get("/conversations/:linkId/messages", authed, async (request) => {
      const { linkId } = request.params as { linkId: string };
      return messages.list(request.authUser!.id, linkId);
    });

    app.post(
      "/conversations/:linkId/messages",
      authed,
      async (request, reply) => {
        const { linkId } = request.params as { linkId: string };
        const parsed = sendMessageSchema.safeParse(request.body);
        if (!parsed.success) throw errors.validation(parsed.error.flatten());
        const msg = await messages.send(
          request.authUser!.id,
          linkId,
          parsed.data.text,
        );
        reply.status(201).send(msg);
      },
    );
  };
}
