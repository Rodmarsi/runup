import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { errors } from "../errors.js";
import { AuthService } from "./service.js";
import { requireAuth } from "./middleware.js";
import { registerSchema, loginSchema, refreshSchema } from "./schemas.js";

export function authRoutes(db: PrismaClient) {
  const service = new AuthService(db);

  return async function (app: FastifyInstance) {
    app.post("/auth/register", async (request, reply) => {
      const parsed = registerSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      const result = await service.register(parsed.data);
      reply.status(201).send(result);
    });

    app.post("/auth/login", async (request) => {
      const parsed = loginSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return service.login(parsed.data);
    });

    app.post("/auth/refresh", async (request) => {
      const parsed = refreshSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return service.refresh(parsed.data.refreshToken);
    });

    app.post("/auth/logout", async (request, reply) => {
      const parsed = refreshSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      await service.logout(parsed.data.refreshToken);
      reply.status(204).send();
    });

    app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
      const authUser = request.authUser!;
      const user = await db.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, name: true, email: true, role: true },
      });
      if (!user) throw errors.unauthorized();
      return user;
    });
  };
}
