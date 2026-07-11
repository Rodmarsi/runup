import type { Id, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";

export type ShoeId = Id<"Shoe">;

/** Tênis de corrida — km acumulado e alerta de vida útil. */
export interface Shoe {
  id: ShoeId;
  studentId: UserId;
  name: string;
  brand?: string;
  model?: string;
  totalKm: number;
  /** Limite de km a partir do qual o app avisa pra trocar de tênis (ex.: 600/800/1000). */
  alertKm?: number;
  retiredAt?: IsoDateTime;
  createdAt: IsoDateTime;
}
