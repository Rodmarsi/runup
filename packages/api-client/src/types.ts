import type {
  UserRole,
  RaceDistance,
  WorkoutDayStatus,
  Block,
} from "@runup/types";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface WorkoutDayDto {
  id: string;
  planId: string;
  week: number;
  date: string;
  status: WorkoutDayStatus;
  blocks: Block[];
}

export interface Stats {
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  workoutCount: number;
  weeklyDistanceMeters: number;
  monthlyDistanceMeters: number;
  streakDays: number;
  avgPaceSecPerKm: number | null;
}

export interface GoalOverview {
  goal: {
    id: string;
    targetRace: RaceDistance;
    raceName: string | null;
    raceDate: string;
    targetTimeSeconds: number | null;
    daysUntilRace: number;
  };
  weeks: { week: number; totalDays: number; completedDays: number }[];
  estimate: {
    targetDistanceMeters: number | null;
    currentSeconds: number | null;
    byWeek: { week: number; seconds: number }[];
  };
}

export interface LogWorkoutInput {
  status: WorkoutDayStatus;
  source?: "manual" | "strava";
  distanceMeters?: number;
  durationSeconds?: number;
  perceivedEffort?: number;
  pain?: string;
  notes?: string;
}

/** Erro padronizado da API: { code, message, details }. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
