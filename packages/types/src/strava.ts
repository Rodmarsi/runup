import type { Id, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type StravaConnectionId = Id<"StravaConnection">;

/** Vínculo OAuth de um aluno com o Strava. */
export interface StravaConnection {
  id: StravaConnectionId;
  studentId: UserId;
  athleteId: string;
  connectedAt: IsoDateTime;
  /** Presença de token indica conexão ativa; valores nunca expostos ao cliente. */
  hasValidToken: boolean;
}
