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
  avatarUrl?: string | null;
}

export interface UpdateMeInput {
  name?: string;
  avatarUrl?: string;
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
  mandatoryRecovery: boolean;
}

export interface CurrentPlanDto {
  title: string;
  durationWeeks: number;
  createdAt: string;
  madeByCoach: boolean;
  coachName: string | null;
}

export interface WorkoutCommentDto {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
}

export interface SplitDto {
  km: number;
  paceSecPerKm: number;
}

export type WorkoutLogKind = "running" | "strength" | "mobility" | "bike" | "walk" | "other";

export interface WorkoutLogDto {
  id: string;
  workoutDayId: string | null;
  source: "manual" | "strava";
  kind: WorkoutLogKind;
  completedAt: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  avgPaceSecPerKm: number | null;
  avgHeartRate: number | null;
  cadence: number | null;
  elevationGainM: number | null;
  splits: SplitDto[] | null;
  perceivedEffort: number | null;
  pain: string | null;
  notes: string | null;
}

export interface WorkoutDayDetailDto extends WorkoutDayDto {
  comments: WorkoutCommentDto[];
  /** Resultado(s) real(is) registrado(s) pelo aluno para este dia (check-in). */
  logs: WorkoutLogDto[];
}

export interface Stats {
  totalDistanceMeters: number;
  totalTimeSeconds: number;
  workoutCount: number;
  weeklyDistanceMeters: number;
  monthlyDistanceMeters: number;
  streakDays: number;
  avgPaceSecPerKm: number | null;
  /** Data/hora (ISO) do treino registrado mais recente, se houver. */
  lastWorkoutDate: string | null;
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

/** Treino avulso, sem estar ligado a um dia de um plano. */
export interface LogStandaloneWorkoutInput {
  kind?: WorkoutLogKind;
  distanceMeters?: number;
  durationSeconds?: number;
  perceivedEffort?: number;
  pain?: string;
  notes?: string;
}

export interface ListWorkoutLogsQuery {
  kind?: WorkoutLogKind;
  since?: string;
}

export type Sex = "male" | "female" | "other";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface AthleteProfileDto {
  studentId: string;
  heightCm?: number;
  birthDate?: string;
  sex?: Sex;
  hrMaxBpm?: number;
  vo2max?: number;
  experience?: ExperienceLevel;
  weeklyAvailabilityDays?: number;
}

export interface AthleteProfileInput {
  heightCm?: number;
  birthDate?: string;
  sex?: Sex;
  hrMaxBpm?: number;
  vo2max?: number;
  experience?: ExperienceLevel;
  weeklyAvailabilityDays?: number;
}

export interface BodyMetricDto {
  id: string;
  studentId: string;
  date: string;
  weightKg: number | null;
  bodyFatPct: number | null;
}

export interface BodyMetricInput {
  date: string;
  weightKg?: number;
  bodyFatPct?: number;
}

export interface ShoeDto {
  id: string;
  studentId: string;
  name: string;
  brand: string | null;
  model: string | null;
  totalKm: number;
  alertKm: number | null;
  retiredAt: string | null;
  createdAt: string;
}

export interface CreateShoeInput {
  name: string;
  brand?: string;
  model?: string;
  alertKm?: number;
}

export interface UpdateShoeInput {
  name?: string;
  brand?: string;
  model?: string;
  totalKm?: number;
  alertKm?: number;
  retired?: boolean;
}

export interface GoalDto {
  id: string;
  targetRace: RaceDistance;
  raceName: string | null;
  raceDate: string;
  targetTimeSeconds: number | null;
  status: string;
}

export interface RacePredictionDto {
  distance: string;
  targetDistanceMeters: number;
  predictedSeconds: number | null;
}

export interface PersonalRecordDto {
  id: string;
  distance: string;
  timeSeconds: number;
  achievedAt: string;
}

export interface PersonalRecordInput {
  distance: string;
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

/** Convite pendente enviado por um aluno, aguardando o treinador aceitar. */
export interface CoachInviteDto {
  id: string;
  status: "pending";
  createdAt: string;
  student: { id: string; name: string; email: string };
}

/** Convite pendente enviado por um treinador, aguardando o aluno aceitar. */
export interface StudentInviteDto {
  id: string;
  status: "pending";
  createdAt: string;
  coach: { id: string; name: string; email: string };
}

// --- Treinador ---
export interface CoachStudentDto {
  id: string;
  status: "pending" | "active" | "ended";
  initiatedBy: "coach" | "student";
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

export interface CoachStudentOverview {
  student: { id: string; name: string; email: string; avatarUrl: string | null };
  stats: Stats;
  goals: GoalDto[];
  days: WorkoutDayDto[];
}

export interface CreatePlanInput {
  studentId: string;
  title: string;
  durationWeeks: number;
  startDate: string;
  days: { week: number; date: string; blocks: Block[] }[];
}

export interface InterpretedDay {
  week: number;
  date?: string;
  dayLabel?: string;
  blocks: Block[];
  sourceRef?: string;
  confidence: "high" | "low";
  note?: string;
}

export interface InterpretedPlan {
  title: string;
  durationWeeks: number;
  days: InterpretedDay[];
}

export interface ImportPreview {
  plan: InterpretedPlan;
  summary: { weeks: number; days: number; lowConfidence: number };
}

/** Plano que o próprio aluno cria (manual ou confirmando o preview da IA). */
export interface CreateSelfPlanInput {
  title: string;
  durationWeeks: number;
  days: { week: number; date: string; blocks: Block[] }[];
}

/** Respostas do questionário do "Criar com IA". */
export interface GeneratePlanInput {
  objective: string;
  targetRace?: RaceDistance;
  raceDate?: string;
  /** Dias da semana disponíveis (0=domingo … 6=sábado). */
  availableWeekdays: number[];
  durationWeeks: number;
  startDate: string;
  experience: ExperienceLevel;
  bestPaceSecPerKm?: number;
  longestDistanceMeters?: number;
  injuries?: string;
}

export interface AiPlanPreview {
  plan: InterpretedPlan;
  summary: { weeks: number; days: number };
}

export type RaceStatus = "interested" | "registered" | "completed";

export interface RaceDto {
  id: string;
  studentId: string;
  name: string;
  city: string | null;
  state: string | null;
  raceDate: string;
  startTime: string | null;
  distanceMeters: number | null;
  targetTimeSeconds: number | null;
  courseUrl: string | null;
  registrationUrl: string | null;
  status: RaceStatus;
  isTarget: boolean;
  createdAt: string;
}

/** Prova encontrada na busca (corridasbr.com.br) — ainda não é do calendário do aluno. */
export interface ExternalRaceDto {
  externalId: string;
  name: string;
  city: string;
  state: string;
  raceDate: string;
  distancesLabel: string;
  longestDistanceMeters: number | null;
}

export interface SearchRacesQuery {
  state: string;
  city?: string;
  minDistanceMeters?: number;
}

export interface ImportRaceInput {
  state: string;
  externalId: string;
  isTarget?: boolean;
}

export interface CreateRaceInput {
  name: string;
  city?: string;
  state?: string;
  raceDate: string;
  startTime?: string;
  distanceMeters?: number;
  targetTimeSeconds?: number;
  courseUrl?: string;
  registrationUrl?: string;
  isTarget?: boolean;
}

/** Treinador move a data ou muda o status (cancelar → "skipped") de um dia. */
export interface UpdateDayInput {
  date?: string;
  status?: WorkoutDayStatus;
}

export interface MissionDto {
  code: string;
  period: "daily" | "weekly";
  progress: number;
  target: number;
  completedAt: string | null;
}

export interface GamificationSnapshot {
  xp: number;
  level: number;
  achievements: string[];
  missions: MissionDto[];
}

export type InsightSeverity = "info" | "warning" | "success";

export interface Insight {
  id: string;
  message: string;
  severity: InsightSeverity;
}

export interface UpdateRaceInput {
  name?: string;
  city?: string;
  state?: string;
  raceDate?: string;
  startTime?: string;
  distanceMeters?: number;
  targetTimeSeconds?: number;
  courseUrl?: string;
  registrationUrl?: string;
  status?: RaceStatus;
  isTarget?: boolean;
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
