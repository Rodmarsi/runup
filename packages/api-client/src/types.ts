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

export interface WorkoutCommentDto {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface WorkoutDayDetailDto extends WorkoutDayDto {
  comments: WorkoutCommentDto[];
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

export interface GoalDto {
  id: string;
  targetRace: RaceDistance;
  raceName: string | null;
  raceDate: string;
  targetTimeSeconds: number | null;
  status: string;
}

export interface PersonalRecordDto {
  id: string;
  distance: RaceDistance;
  timeSeconds: number;
  achievedAt: string;
}

export interface ConversationDto {
  linkId: string;
  with: { id: string; name: string };
  lastMessage: { text: string; sentAt: string } | null;
  unread: number;
}

export interface MessageDto {
  id: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export interface StravaStatus {
  connected: boolean;
  athleteId: string | null;
}

export interface StravaSyncResult {
  imported: number;
  matched: number;
  standalone: number;
  prsUpdated: number;
}

// --- Treinador ---
export interface CoachStudentDto {
  id: string;
  status: "pending" | "active" | "ended";
  createdAt: string;
  student: { id: string; name: string; email: string };
}

export interface SubscriptionView {
  tier: "free" | "pro" | "elite";
  maxStudents: number;
  activeStudents: number;
  canActivateMore: boolean;
}

export interface AdherenceAlert {
  studentId: string;
  studentName: string;
  consecutiveMissed: number;
}

export interface CreatePlanInput {
  studentId: string;
  title: string;
  durationWeeks: number;
  startDate: string;
  days: { week: number; date: string; blocks: Block[] }[];
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
