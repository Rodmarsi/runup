import Fastify, {
  type FastifyInstance,
  type FastifyError,
  type FastifyReply,
  type FastifyRequest,
} from "fastify";

/** Formato padrão de erro da API: { code, message, details }. */
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok", service: "runup-api", time: new Date().toISOString() };
  });

  app.setErrorHandler(
    (error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
      const payload: ApiError = {
        code: error.code ?? "INTERNAL_ERROR",
        message: error.message,
      };
      reply.status(error.statusCode ?? 500).send(payload);
    },
  );

  return app;
}
