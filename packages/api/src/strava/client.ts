/** Tokens OAuth do Strava. */
export interface StravaTokens {
  athleteId: string;
  accessToken: string;
  refreshToken: string;
  /** Expiração do access token. */
  expiresAt: Date;
}

/** Atividade do Strava (subconjunto que usamos). */
export interface StravaActivity {
  id: string;
  startDate: string;
  distanceMeters: number;
  movingTimeSeconds: number;
  averageHeartrate?: number;
  averageCadence?: number;
  totalElevationGainMeters?: number;
}

/**
 * Cliente do Strava. Isola a API externa para que o resto seja testável com
 * um mock (sem credenciais nem rede).
 */
export interface StravaClient {
  exchangeCode(code: string): Promise<StravaTokens>;
  refresh(refreshToken: string): Promise<StravaTokens>;
  listActivities(accessToken: string, afterEpoch?: number): Promise<StravaActivity[]>;
}
