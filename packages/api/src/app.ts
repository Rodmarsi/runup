import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import { prisma, type PrismaClient } from "@runup/db";
import { AppError } from "./errors.js";
import { authRoutes } from "./auth/routes.js";
import { coachingRoutes } from "./coaching/routes.js";
import { planRoutes } from "./plans/routes.js";
import { profileRoutes } from "./profile/routes.js";
import { messagingRoutes } from "./messaging/routes.js";
import { excelImportRoutes } from "./excel-import/routes.js";
import type { SpreadsheetInterpreter } from "./excel-import/interpreter.js";
import { stravaRoutes } from "./strava/routes.js";
import type { StravaClient } from "./strava/client.js";
import type { GoogleClient } from "./auth/google/client.js";
import { equipmentRoutes } from "./equipment/routes.js";

/** Formato padrão de erro da API: { code, message, details }. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface BuildAppOptions {
  db?: PrismaClient;
  logger?: boolean;
  /** Interpretador de planilhas (mock nos testes; produção usa Claude). */
  interpreter?: SpreadsheetInterpreter;
  /** Cliente Strava (mock nos testes; produção usa a API do Strava). */
  stravaClient?: StravaClient;
  /** Cliente Google (mock nos testes; produção usa a API do Google). */
  googleClient?: GoogleClient;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const db = options.db ?? prisma;
  const app = Fastify({ logger: options.logger ?? true });

  // CORS: em produção defina CORS_ORIGIN (lista separada por vírgula);
  // sem ela, reflete qualquer origem (ok em dev — a auth é por Bearer token).
  const corsEnv = process.env.CORS_ORIGIN;
  app.register(cors, {
    origin: corsEnv ? corsEnv.split(",").map((o) => o.trim()) : true,
  });

  app.get("/health", async () => {
    return { status: "ok", service: "runup-api", time: new Date().toISOString() };
  });

  app.register(authRoutes(db, options.googleClient));
  app.register(coachingRoutes(db));
  app.register(planRoutes(db));
  app.register(profileRoutes(db));
  app.register(messagingRoutes(db));
  app.register(excelImportRoutes(db, options.interpreter));
  app.register(stravaRoutes(db, options.stravaClient));
  app.register(equipmentRoutes(db));

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      if (error instanceof AppError) {
        const payload: ApiError = {
          code: error.code,
          message: error.message,
          details: error.details,
        };
        reply.status(error.statusCode).send(payload);
        return;
      }
      const payload: ApiError = {
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message,
      };
      reply.status(error.statusCode ?? 500).send(payload);
    },
  );

  return app;
}
