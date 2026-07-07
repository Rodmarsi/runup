/** Erro de domínio com código estável e status HTTP. */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const errors = {
  emailInUse: () =>
    new AppError(409, "EMAIL_IN_USE", "Este email já está cadastrado"),
  invalidCredentials: () =>
    new AppError(401, "INVALID_CREDENTIALS", "Email ou senha incorretos"),
  invalidRefreshToken: () =>
    new AppError(
      401,
      "INVALID_REFRESH_TOKEN",
      "Refresh token inválido ou expirado",
    ),
  unauthorized: () =>
    new AppError(401, "UNAUTHORIZED", "Autenticação necessária"),
  validation: (details: unknown) =>
    new AppError(422, "VALIDATION_ERROR", "Dados inválidos", details),
} as const;
