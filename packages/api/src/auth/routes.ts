import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import type { UserRole } from "@runup/types";
import { errors } from "../errors.js";
import { config } from "../config.js";
import { AuthService } from "./service.js";
import { requireAuth } from "./middleware.js";
import { registerSchema, loginSchema, refreshSchema, updateMeSchema } from "./schemas.js";
import { GoogleAuthService } from "./google/service.js";
import { HttpGoogleClient } from "./google/http-client.js";
import type { GoogleClient } from "./google/client.js";
import { verifyGoogleState } from "./tokens.js";

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

    // Login com Google: o app (web ou mobile) pede a URL (com o papel) e abre
    // no navegador. `platform` decide para onde o callback redireciona.
    app.get("/auth/google/authorize", async (request) => {
      const { role, platform } = request.query as { role?: string; platform?: string };
      const chosen: UserRole = role === "coach" ? "coach" : "student";
      const chosenPlatform = platform === "mobile" ? "mobile" : "web";
      return { url: google().buildAuthorizeUrl(chosen, chosenPlatform) };
    });

    // Callback do Google → cria/loga o usuário e devolve os tokens ao
    // originador (web, via redirect normal; mobile, via deep link do app).
    app.get("/auth/google/callback", async (request, reply) => {
      const { code, state, error } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };
      // Sem `state` válido não dá pra saber a plataforma — manda pra web por padrão.
      const platformFromState = (): "web" | "mobile" => {
        try {
          return state ? verifyGoogleState(state).platform : "web";
        } catch {
          return "web";
        }
      };
      // `mobileScheme` já termina em "://" (ex.: "runup://"), `webUrl` não
      // termina em "/" — cada um precisa de uma junção diferente.
      const redirectUrl = (platform: "web" | "mobile", path: string) =>
        platform === "mobile" ? `${config.mobileScheme}${path}` : `${config.webUrl}/${path}`;

      if (error || !code || !state) {
        return reply.redirect(redirectUrl(platformFromState(), "login?error=google"));
      }
      try {
        const result = await google().handleCallback(code, state);
        const frag = new URLSearchParams({
          access_token: result.accessToken,
          refresh_token: result.refreshToken,
        });
        return reply.redirect(
          redirectUrl(result.platform, `auth/callback#${frag.toString()}`),
        );
      } catch {
        return reply.redirect(redirectUrl(platformFromState(), "login?error=google"));
      }
    });

    app.get("/auth/me", { preHandler: requireAuth }, async (request) => {
      const authUser = request.authUser!;
      const user = await db.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      });
      if (!user) throw errors.unauthorized();
      return user;
    });

    app.patch("/auth/me", { preHandler: requireAuth }, async (request) => {
      const parsed = updateMeSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      return db.user.update({
        where: { id: request.authUser!.id },
        data: { name: parsed.data.name, avatarUrl: parsed.data.avatarUrl },
        select: { id: true, name: true, email: true, role: true, avatarUrl: true },
      });
    });
  };
}
