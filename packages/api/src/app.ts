import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";
import { prisma, type PrismaClient } from "@runup/db";
import { AppError } from "./errors.js";
import { authRoutes } from "./auth/routes.js";
import { coachingRoutes } from "./coaching/routes.js";
import { planRoutes } from "./plans/routes.js";
import { profileRoutes } from "./profile/routes.js";
import { messagingRoutes } from "./messaging/routes.js";

/** Formato padrão de erro da API: { code, message, details }. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface BuildAppOptions {
  db?: PrismaClient;
  logger?: boolean;
}

export function buildApp(options: BuildAppOptions = {}): FastifyInstance {
  const db = options.db ?? prisma;
  const app = Fastify({ logger: options.logger ?? true });

  app.get("/health", async () => {
    return { status: "ok", service: "runup-api", time: new Date().toISOString() };
  });

  app.register(authRoutes(db));
  app.register(coachingRoutes(db));
  app.register(planRoutes(db));
  app.register(profileRoutes(db));
  app.register(messagingRoutes(db));

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
