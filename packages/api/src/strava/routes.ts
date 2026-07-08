import type { FastifyInstance } from "fastify";
import type { PrismaClient } from "@runup/db";
import { z } from "zod";
import { errors } from "../errors.js";
import { requireRole } from "../auth/middleware.js";
import { StravaService } from "./service.js";
import { HttpStravaClient } from "./http-client.js";
import type { StravaClient } from "./client.js";

const connectSchema = z.object({ code: z.string().min(1) });

/**
 * @param client injeta o cliente Strava (mock nos testes). Em produção,
 * omitido → cria o HttpStravaClient sob demanda (falha limpa sem credenciais).
 */
export function stravaRoutes(db: PrismaClient, client?: StravaClient) {
  const asStudent = { preHandler: requireRole("student") };
  const service = () => new StravaService(db, client ?? new HttpStravaClient());

  return async function (app: FastifyInstance) {
    app.get("/me/strava", asStudent, async (request) => {
      const conn = await db.stravaConnection.findUnique({
        where: { studentId: request.authUser!.id },
      });
      return { connected: Boolean(conn), athleteId: conn?.athleteId ?? null };
    });

    // Aluno pede a URL de autorização (abre no navegador do dispositivo).
    app.get("/me/strava/authorize", asStudent, async (request) => {
      return { url: service().buildAuthorizeUrl(request.authUser!.id) };
    });

    // Strava redireciona aqui após o aluno aprovar. Público (sem token).
    app.get("/strava/callback", async (request, reply) => {
      const { code, state, error } = request.query as {
        code?: string;
        state?: string;
        error?: string;
      };
      if (error || !code || !state) {
        return reply.type("text/html").send(callbackPage(false));
      }
      try {
        await service().completeOAuth(code, state);
        return reply.type("text/html").send(callbackPage(true));
      } catch {
        return reply.type("text/html").send(callbackPage(false));
      }
    });

    app.post("/me/strava/connect", asStudent, async (request, reply) => {
      const parsed = connectSchema.safeParse(request.body);
      if (!parsed.success) throw errors.validation(parsed.error.flatten());
      await service().connect(request.authUser!.id, parsed.data.code);
      reply.status(204).send();
    });

    app.post("/me/strava/sync", asStudent, async (request) => {
      return service().sync(request.authUser!.id);
    });

    app.delete("/me/strava", asStudent, async (request, reply) => {
      await service().disconnect(request.authUser!.id);
      reply.status(204).send();
    });
  };
}

/** Página HTML mostrada ao aluno após o callback do Strava. */
function callbackPage(ok: boolean): string {
  const title = ok ? "Strava conectado ✓" : "Não foi possível conectar";
  const msg = ok
    ? "Pode voltar ao app RunUp e tocar em “Sincronizar”."
    : "Tente novamente pelo app RunUp.";
  const accent = ok ? "#FF5500" : "#F87171";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RunUp · Strava</title></head>
<body style="margin:0;background:#121110;color:#fff;font-family:system-ui,sans-serif;
display:flex;min-height:100vh;align-items:center;justify-content:center;text-align:center">
<div><div style="font-size:22px;font-weight:700;color:${accent}">${title}</div>
<div style="margin-top:8px;color:#A5A6A6;font-size:14px">${msg}</div></div>
</body></html>`;
}
