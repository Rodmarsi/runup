import { AppError } from "../errors.js";
import type { StravaClient, StravaTokens, StravaActivity } from "./client.js";

const TOKEN_URL = "https://www.strava.com/oauth/token";
const ACTIVITIES_URL = "https://www.strava.com/api/v3/athlete/activities";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete?: { id: number };
}

interface ActivityResponse {
  id: number;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  average_heartrate?: number;
  average_cadence?: number;
  total_elevation_gain?: number;
}

/** Implementação real do cliente Strava (OAuth + REST v3). */
export class HttpStravaClient implements StravaClient {
  constructor(
    private readonly clientId = process.env.STRAVA_CLIENT_ID,
    private readonly clientSecret = process.env.STRAVA_CLIENT_SECRET,
  ) {
    if (!clientId || !clientSecret) {
      throw new AppError(
        500,
        "STRAVA_NOT_CONFIGURED",
        "Integração Strava indisponível: defina STRAVA_CLIENT_ID e STRAVA_CLIENT_SECRET",
      );
    }
  }

  async exchangeCode(code: string): Promise<StravaTokens> {
    const data = await this.postToken({
      code,
      grant_type: "authorization_code",
    });
    return this.toTokens(data, String(data.athlete?.id ?? ""));
  }

  async refresh(refreshToken: string): Promise<StravaTokens> {
    const data = await this.postToken({
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });
    // O refresh não retorna o atleta; o chamador preserva o athleteId existente.
    return this.toTokens(data, "");
  }

  async listActivities(
    accessToken: string,
    afterEpoch?: number,
  ): Promise<StravaActivity[]> {
    const url = new URL(ACTIVITIES_URL);
    url.searchParams.set("per_page", "50");
    if (afterEpoch) url.searchParams.set("after", String(afterEpoch));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401) {
      throw new AppError(401, "STRAVA_UNAUTHORIZED", "Token do Strava inválido");
    }
    if (!res.ok) {
      throw new AppError(502, "STRAVA_ERROR", "Falha ao consultar o Strava");
    }
    const activities = (await res.json()) as ActivityResponse[];
    return activities
      .filter((a) => a.type === "Run")
      .map((a) => ({
        id: String(a.id),
        startDate: a.start_date,
        distanceMeters: Math.round(a.distance),
        movingTimeSeconds: a.moving_time,
        averageHeartrate: a.average_heartrate
          ? Math.round(a.average_heartrate)
          : undefined,
        averageCadence: a.average_cadence
          ? Math.round(a.average_cadence)
          : undefined,
        totalElevationGainMeters: a.total_elevation_gain
          ? Math.round(a.total_elevation_gain)
          : undefined,
      }));
  }

  private async postToken(
    params: Record<string, string>,
  ): Promise<TokenResponse> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        ...params,
      }),
    });
    if (!res.ok) {
      throw new AppError(502, "STRAVA_ERROR", "Falha na autenticação com o Strava");
    }
    return (await res.json()) as TokenResponse;
  }

  private toTokens(data: TokenResponse, athleteId: string): StravaTokens {
    return {
      athleteId,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at * 1000),
    };
  }
}
