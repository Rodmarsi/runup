import {
  ApiError,
  type AuthResult,
  type RegisterInput,
  type AuthUser,
  type UpdateMeInput,
  type WorkoutDayDto,
  type WorkoutDayDetailDto,
  type CurrentPlanDto,
  type Stats,
  type GoalOverview,
  type GoalDto,
  type PersonalRecordDto,
  type ConversationDto,
  type MessageDto,
  type StravaStatus,
  type StravaSyncResult,
  type CoachStudentDto,
  type CoachInviteDto,
  type StudentInviteDto,
  type SubscriptionView,
  type AdherenceAlert,
  type CoachStudentOverview,
  type CreatePlanInput,
  type ImportPreview,
  type LogWorkoutInput,
  type LogStandaloneWorkoutInput,
  type WorkoutLogDto,
  type ListWorkoutLogsQuery,
  type AthleteProfileDto,
  type AthleteProfileInput,
  type BodyMetricDto,
  type BodyMetricInput,
  type ShoeDto,
  type CreateShoeInput,
  type UpdateShoeInput,
  type CreateSelfPlanInput,
  type GeneratePlanInput,
  type AiPlanPreview,
  type RaceDto,
  type CreateRaceInput,
  type UpdateRaceInput,
  type GamificationSnapshot,
  type Insight,
  type UpdateDayInput,
  type ExternalRaceDto,
  type SearchRacesQuery,
  type ImportRaceInput,
} from "./types.js";

export * from "./types.js";

/** Guarda e recupera um token (implementado pelo app: memória, secure-store…). */
export interface TokenStore {
  get(): string | null | Promise<string | null>;
  set(token: string | null): void | Promise<void>;
}

export interface ClientOptions {
  baseUrl: string;
  tokens: TokenStore;
  /**
   * Guarda do refresh token. Opcional só por compatibilidade — sem ele o
   * access token (15min) expira e as chamadas passam a falhar com 401 sem
   * recuperação, então todo app novo deve passar essa opção.
   */
  refreshTokens?: TokenStore;
}

const NO_REFRESH_PATHS = ["/auth/login", "/auth/register", "/auth/refresh"];

// Plano free do Render "dorme" o servidor após 15min sem uso: a 1ª conexão
// depois disso pode falhar de vez (connection refused) enquanto ele acorda
// (~30-50s), antes de voltar a responder normalmente. Sem isso, o usuário via
// um "fetch failed" cru na tela em vez do app simplesmente esperar acordar.
const COLD_START_RETRY_DELAYS_MS = [3000, 8000, 15000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Cliente HTTP tipado do RunUp, reusável por mobile e web. */
export class RunUpClient {
  private refreshInFlight: Promise<string | null> | null = null;

  constructor(private readonly options: ClientOptions) {}

  // --- Auth ---
  async register(input: RegisterInput): Promise<AuthResult> {
    const result = await this.request<AuthResult>("POST", "/auth/register", input);
    await this.storeTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>("POST", "/auth/login", {
      email,
      password,
    });
    await this.storeTokens(result.accessToken, result.refreshToken);
    return result;
  }

  async logout(): Promise<void> {
    const refreshToken = await this.options.refreshTokens?.get();
    if (refreshToken) {
      // Revoga no servidor — melhor esforço, não bloqueia o logout local.
      await this.request("POST", "/auth/logout", { refreshToken }).catch(() => {});
    }
    await this.storeTokens(null, null);
  }

  /** Grava tokens obtidos por fora (ex.: callback OAuth do Google). */
  async setSession(accessToken: string, refreshToken?: string): Promise<void> {
    await this.storeTokens(accessToken, refreshToken ?? null);
  }

  private async storeTokens(accessToken: string | null, refreshToken: string | null) {
    await this.options.tokens.set(accessToken);
    await this.options.refreshTokens?.set(refreshToken);
  }

  /**
   * Troca o refresh token guardado por um novo par. Deduplica chamadas
   * concorrentes (várias telas podem levar 401 ao mesmo tempo).
   */
  private async tryRefresh(): Promise<string | null> {
    if (!this.options.refreshTokens) return null;
    if (this.refreshInFlight) return this.refreshInFlight;

    this.refreshInFlight = (async () => {
      const refreshToken = await this.options.refreshTokens!.get();
      if (!refreshToken) return null;
      try {
        const res = await fetch(`${this.options.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) throw new Error("refresh falhou");
        const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
        await this.storeTokens(tokens.accessToken, tokens.refreshToken);
        return tokens.accessToken;
      } catch {
        await this.storeTokens(null, null);
        return null;
      }
    })();

    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  googleAuthorizeUrl(
    role: "student" | "coach",
    platform: "web" | "mobile" = "web",
  ): Promise<{ url: string }> {
    return this.request<{ url: string }>(
      "GET",
      `/auth/google/authorize?role=${role}&platform=${platform}`,
    );
  }

  me(): Promise<AuthUser> {
    return this.request<AuthUser>("GET", "/auth/me");
  }

  updateMe(input: UpdateMeInput): Promise<AuthUser> {
    return this.request<AuthUser>("PATCH", "/auth/me", input);
  }

  // --- Aluno ---
  calendar(): Promise<WorkoutDayDto[]> {
    return this.request<WorkoutDayDto[]>("GET", "/me/calendar");
  }

  currentPlan(): Promise<CurrentPlanDto | null> {
    return this.request<CurrentPlanDto | null>("GET", "/me/current-plan");
  }

  workoutDay(id: string): Promise<WorkoutDayDetailDto> {
    return this.request<WorkoutDayDetailDto>("GET", `/workout-days/${id}`);
  }

  logWorkout(dayId: string, input: LogWorkoutInput) {
    return this.request("POST", `/workout-days/${dayId}/log`, input);
  }

  logStandaloneWorkout(input: LogStandaloneWorkoutInput) {
    return this.request("POST", "/me/workout-logs", input);
  }

  workoutLogs(query: ListWorkoutLogsQuery = {}): Promise<WorkoutLogDto[]> {
    const params = new URLSearchParams();
    if (query.kind) params.set("kind", query.kind);
    if (query.since) params.set("since", query.since);
    const qs = params.toString();
    return this.request<WorkoutLogDto[]>("GET", `/me/workout-logs${qs ? `?${qs}` : ""}`);
  }

  stats(): Promise<Stats> {
    return this.request<Stats>("GET", "/me/stats");
  }

  goals(): Promise<GoalDto[]> {
    return this.request<GoalDto[]>("GET", "/me/goals");
  }

  goalOverview(goalId: string): Promise<GoalOverview> {
    return this.request<GoalOverview>("GET", `/goals/${goalId}/overview`);
  }

  personalRecords(): Promise<PersonalRecordDto[]> {
    return this.request<PersonalRecordDto[]>("GET", "/me/personal-records");
  }

  athleteProfile(): Promise<AthleteProfileDto> {
    return this.request<AthleteProfileDto>("GET", "/me/athlete-profile");
  }

  updateAthleteProfile(input: AthleteProfileInput): Promise<AthleteProfileDto> {
    return this.request<AthleteProfileDto>("PUT", "/me/athlete-profile", input);
  }

  bodyMetrics(): Promise<BodyMetricDto[]> {
    return this.request<BodyMetricDto[]>("GET", "/me/body-metrics");
  }

  addBodyMetric(input: BodyMetricInput): Promise<BodyMetricDto> {
    return this.request<BodyMetricDto>("POST", "/me/body-metrics", input);
  }

  // --- Equipamentos ---
  shoes(): Promise<ShoeDto[]> {
    return this.request<ShoeDto[]>("GET", "/me/shoes");
  }

  createShoe(input: CreateShoeInput): Promise<ShoeDto> {
    return this.request<ShoeDto>("POST", "/me/shoes", input);
  }

  updateShoe(id: string, input: UpdateShoeInput): Promise<ShoeDto> {
    return this.request<ShoeDto>("PATCH", `/me/shoes/${id}`, input);
  }

  deleteShoe(id: string) {
    return this.request("DELETE", `/me/shoes/${id}`);
  }

  // --- Mensagens ---
  conversations(): Promise<ConversationDto[]> {
    return this.request<ConversationDto[]>("GET", "/conversations");
  }

  messages(linkId: string): Promise<MessageDto[]> {
    return this.request<MessageDto[]>("GET", `/conversations/${linkId}/messages`);
  }

  sendMessage(linkId: string, text: string) {
    return this.request("POST", `/conversations/${linkId}/messages`, { text });
  }

  // --- Strava ---
  stravaStatus(): Promise<StravaStatus> {
    return this.request<StravaStatus>("GET", "/me/strava");
  }

  stravaSync(): Promise<StravaSyncResult> {
    return this.request<StravaSyncResult>("POST", "/me/strava/sync");
  }

  stravaAuthorizeUrl(): Promise<{ url: string }> {
    return this.request<{ url: string }>("GET", "/me/strava/authorize");
  }

  // --- Treinador ---
  coachStudents(): Promise<CoachStudentDto[]> {
    return this.request<CoachStudentDto[]>("GET", "/coach/students");
  }

  subscription(): Promise<SubscriptionView> {
    return this.request<SubscriptionView>("GET", "/coach/subscription");
  }

  alerts(): Promise<AdherenceAlert[]> {
    return this.request<AdherenceAlert[]>("GET", "/coach/alerts");
  }

  inviteStudent(studentEmail: string) {
    return this.request("POST", "/coach/students/invite", { studentEmail });
  }

  /** Convites que alunos enviaram e aguardam este treinador aceitar. */
  coachInvites(): Promise<CoachInviteDto[]> {
    return this.request<CoachInviteDto[]>("GET", "/coach/invites");
  }

  acceptCoachInvite(linkId: string) {
    return this.request("POST", `/coach/invites/${linkId}/accept`);
  }

  declineCoachInvite(linkId: string) {
    return this.request("POST", `/coach/invites/${linkId}/decline`);
  }

  // --- Aluno: vínculo com treinador ---
  /** Aluno convida um treinador (por email) — o treinador é quem aceita. */
  inviteCoach(coachEmail: string) {
    return this.request("POST", "/student/invite-coach", { coachEmail });
  }

  /** Convites que treinadores enviaram e aguardam este aluno aceitar. */
  studentInvites(): Promise<StudentInviteDto[]> {
    return this.request<StudentInviteDto[]>("GET", "/student/invites");
  }

  acceptStudentInvite(linkId: string) {
    return this.request("POST", `/student/invites/${linkId}/accept`);
  }

  declineStudentInvite(linkId: string) {
    return this.request("POST", `/student/invites/${linkId}/decline`);
  }

  coachStudentOverview(studentId: string): Promise<CoachStudentOverview> {
    return this.request<CoachStudentOverview>(
      "GET",
      `/coach/students/${studentId}/overview`,
    );
  }

  createPlan(input: CreatePlanInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/plans", input);
  }

  updateWorkoutDay(dayId: string, input: UpdateDayInput): Promise<WorkoutDayDto> {
    return this.request<WorkoutDayDto>("PATCH", `/workout-days/${dayId}`, input);
  }

  duplicateWorkoutDay(dayId: string, date: string): Promise<WorkoutDayDto> {
    return this.request<WorkoutDayDto>("POST", `/workout-days/${dayId}/duplicate`, { date });
  }

  importExcel(studentId: string, contentBase64: string): Promise<ImportPreview> {
    return this.request<ImportPreview>("POST", "/coach/import/excel", {
      studentId,
      contentBase64,
    });
  }

  confirmImport(input: CreatePlanInput): Promise<{ id: string }> {
    return this.request<{ id: string }>(
      "POST",
      "/coach/import/excel/confirm",
      input,
    );
  }

  // --- Aluno cria seu próprio plano (manual ou via IA) ---
  createSelfPlan(input: CreateSelfPlanInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/me/plans", input);
  }

  generateAiPlan(input: GeneratePlanInput): Promise<AiPlanPreview> {
    return this.request<AiPlanPreview>("POST", "/me/plans/ai-generate", input);
  }

  // --- Provas ---
  races(): Promise<RaceDto[]> {
    return this.request<RaceDto[]>("GET", "/me/races");
  }

  createRace(input: CreateRaceInput): Promise<RaceDto> {
    return this.request<RaceDto>("POST", "/me/races", input);
  }

  updateRace(id: string, input: UpdateRaceInput): Promise<RaceDto> {
    return this.request<RaceDto>("PATCH", `/me/races/${id}`, input);
  }

  deleteRace(id: string) {
    return this.request("DELETE", `/me/races/${id}`);
  }

  /** Busca de provas por estado (corridasbr.com.br), com filtro opcional de cidade/distância. */
  searchRaces(query: SearchRacesQuery): Promise<ExternalRaceDto[]> {
    const params = new URLSearchParams({ state: query.state });
    if (query.city) params.set("city", query.city);
    if (query.minDistanceMeters) params.set("minDistanceMeters", String(query.minDistanceMeters));
    return this.request<ExternalRaceDto[]>("GET", `/races/search?${params.toString()}`);
  }

  /** "Adicionar ao meu calendário" — importa uma prova encontrada na busca. */
  importRace(input: ImportRaceInput): Promise<RaceDto> {
    return this.request<RaceDto>("POST", "/me/races/import", input);
  }

  // --- Gamificação & insights ---
  gamification(): Promise<GamificationSnapshot> {
    return this.request<GamificationSnapshot>("GET", "/me/gamification");
  }

  insights(): Promise<Insight[]> {
    return this.request<Insight[]>("GET", "/me/insights");
  }

  registerPushToken(token: string) {
    return this.request("POST", "/me/push-token", { token });
  }

  /** Tudo que o aluno tem cadastrado, pra Configurações > Exportar dados. */
  exportMyData(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>("GET", "/me/export");
  }

  private async fetchWithColdStartRetry(path: string, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetch(`${this.options.baseUrl}${path}`, init);
      } catch (e) {
        if (attempt >= COLD_START_RETRY_DELAYS_MS.length) throw e;
        await sleep(COLD_START_RETRY_DELAYS_MS[attempt]!);
      }
    }
  }

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
  ): Promise<T> {
    const token = await this.options.tokens.get();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // Só declara JSON quando há corpo — evita o 400 de "empty JSON body".
    if (body !== undefined) headers["Content-Type"] = "application/json";

    let res: Response;
    try {
      res = await this.fetchWithColdStartRetry(path, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (e) {
      throw new ApiError(
        0,
        "NETWORK_ERROR",
        "Não foi possível conectar ao servidor — verifique sua internet e tente de novo",
      );
    }

    if (res.status === 204) return undefined as T;

    // Access token expirado: tenta renovar (uma vez) e refaz a chamada
    // original antes de desistir. Sem isso, a sessão "quebra" sozinha 15min
    // depois do login, com telas silenciosamente parando de carregar dados.
    if (
      res.status === 401 &&
      !isRetry &&
      !NO_REFRESH_PATHS.some((p) => path.startsWith(p))
    ) {
      const newToken = await this.tryRefresh();
      if (newToken) return this.request<T>(method, path, body, true);
    }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = data as { code?: string; message?: string; details?: unknown };
      throw new ApiError(
        res.status,
        err.code ?? "UNKNOWN",
        err.message ?? "Erro inesperado",
        err.details,
      );
    }
    return data as T;
  }
}
