import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import type { UserRole } from "@runup/types";
import { errors } from "../errors.js";
import { config } from "../config.js";
import { AuthService } from "./service.js";
import { requireAuth } from "./middleware.js";
import { registerSchema, loginSchema, refreshSchema } from "./schemas.js";
import { GoogleAuthService } from "./google/service.js";
import { HttpGoogleClient } from "./google/http-client.js";
import type { GoogleClient } from "./google/client.js";

export function authRoutes(db: PrismaClient, googleClient?: GoogleClient) {
  const service = new AuthService(db);
  const google = () => new GoogleAuthService(db, googleClient ?? new HttpGoogleClient());

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

    // Login com Google: o app pede a URL (com o papel) e abre no navegador.
    app.get("/auth/google/authorize", async (request) => {
      const { role } = request.query as { role?: string };
      const chosen: UserRole = role === "coach" ? "coach" : "student";
      return { url: google().buildAuthorizeUrl(chosen) };
    });

    // Callback do Google → cria/loga o usuário e devolve os tokens ao web.
    app.get("/auth/google/callback", async (request, reply) => {
      const { code, state, error } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };
      if (error || !code || !state) {
        return reply.redirect(`${config.webUrl}/login?error=google`);
      }
      try {
        const result = await google().handleCallback(code, state);
        const frag = new URLSearchParams({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
        return reply.redirect(`${config.webUrl}/auth/callback#${frag.toString()}`);
      } catch {
        return reply.redirect(`${config.webUrl}/login?error=google`);
      }
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
