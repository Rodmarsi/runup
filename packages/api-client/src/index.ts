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

  private async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.options.tokens.get();
    const res = await fetch(`${this.options.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
