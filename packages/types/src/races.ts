import type { Id, IsoDate, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type RaceId = Id<"Race">;

export type RaceStatus = "interested" | "registered" | "completed";

/** Prova cadastrada pelo aluno — usada pro ícone de medalha no calendário e contagem regressiva. */
export interface Race {
  id: RaceId;
  studentId: UserId;
  name: string;
  city?: string;
  state?: string;
  raceDate: IsoDate;
  startTime?: string;
  distanceMeters?: number;
  targetTimeSeconds?: number;
  courseUrl?: string;
  registrationUrl?: string;
  status: RaceStatus;
  createdAt: IsoDateTime;
}
