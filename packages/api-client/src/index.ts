import {
  ApiError,
  type AuthResult,
  type RegisterInput,
  type AuthUser,
  type WorkoutDayDto,
  type WorkoutDayDetailDto,
  type Stats,
  type GoalOverview,
  type GoalDto,
  type PersonalRecordDto,
  type ConversationDto,
  type MessageDto,
  type StravaStatus,
  type StravaSyncResult,
  type CoachStudentDto,
  type SubscriptionView,
  type AdherenceAlert,
  type CreatePlanInput,
  type ImportPreview,
  type LogWorkoutInput,
} from "./types.js";

export * from "./types.js";

/** Guarda e recupera o access token (implementado pelo app: memória, secure-store…). */
export interface TokenStore {
  get(): string | null | Promise<string | null>;
  set(token: string | null): void | Promise<void>;
}

export interface ClientOptions {
  baseUrl: string;
  tokens: TokenStore;
}

/** Cliente HTTP tipado do RunUp, reusável por mobile e web. */
export class RunUpClient {
  constructor(private readonly options: ClientOptions) {}

  // --- Auth ---
  async register(input: RegisterInput): Promise<AuthResult> {
    const result = await this.request<AuthResult>("POST", "/auth/register", input);
    await this.options.tokens.set(result.accessToken);
    return result;
  }

  async login(email: string, password: string): Promise<AuthResult> {
    const result = await this.request<AuthResult>("POST", "/auth/login", {
      email,
      password,
    });
    await this.options.tokens.set(result.accessToken);
    return result;
  }

  async logout(): Promise<void> {
    await this.options.tokens.set(null);
  }

  me(): Promise<AuthUser> {
    return this.request<AuthUser>("GET", "/auth/me");
  }

  // --- Aluno ---
  calendar(): Promise<WorkoutDayDto[]> {
    return this.request<WorkoutDayDto[]>("GET", "/me/calendar");
  }

  workoutDay(id: string): Promise<WorkoutDayDetailDto> {
    return this.request<WorkoutDayDetailDto>("GET", `/workout-days/${id}`);
  }

  logWorkout(dayId: string, input: LogWorkoutInput) {
    return this.request("POST", `/workout-days/${dayId}/log`, input);
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

  createPlan(input: CreatePlanInput): Promise<{ id: string }> {
    return this.request<{ id: string }>("POST", "/plans", input);
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

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.options.tokens.get();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    // Só declara JSON quando há corpo — evita o 400 de "empty JSON body".
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (res.status === 204) return undefined as T;

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
