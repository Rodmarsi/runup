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
  forbidden: () =>
    new AppError(403, "FORBIDDEN", "Você não tem permissão para esta ação"),
  validation: (details: unknown) =>
    new AppError(422, "VALIDATION_ERROR", "Dados inválidos", details),
  studentNotFound: () =>
    new AppError(404, "STUDENT_NOT_FOUND", "Nenhum aluno com este email"),
  alreadyLinked: () =>
    new AppError(409, "ALREADY_LINKED", "Já existe um vínculo com este aluno"),
  inviteNotFound: () =>
    new AppError(404, "INVITE_NOT_FOUND", "Convite não encontrado"),
  coachLimitReached: () =>
    new AppError(
      402,
      "COACH_LIMIT_REACHED",
      "Limite de alunos do plano atingido — faça upgrade para ativar mais alunos",
    ),
  notLinked: () =>
    new AppError(
      403,
      "NOT_LINKED",
      "Você não tem um vínculo ativo com este aluno",
    ),
  planNotFound: () =>
    new AppError(404, "PLAN_NOT_FOUND", "Plano não encontrado"),
  dayNotFound: () =>
    new AppError(404, "DAY_NOT_FOUND", "Treino não encontrado"),
  goalNotFound: () =>
    new AppError(404, "GOAL_NOT_FOUND", "Meta não encontrada"),
  stravaNotConnected: () =>
    new AppError(400, "STRAVA_NOT_CONNECTED", "Conecte sua conta do Strava primeiro"),
} as const;
