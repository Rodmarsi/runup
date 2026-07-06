import type { Id, IsoDateTime } from "./common.js";
import type { UserId } from "./user.js";
import type { CoachStudentId } from "./coaching.js";
import type { WorkoutDayId } from "./workout.js";

export type MessageId = Id<"Message">;
export type WorkoutCommentId = Id<"WorkoutComment">;

/** Chat 1:1 dentro do vínculo treinador↔aluno. */
export interface Message {
  id: MessageId;
  coachStudentId: CoachStudentId;
  senderId: UserId;
  text: string;
  sentAt: IsoDateTime;
  readAt?: IsoDateTime;
}

/** Comentário contextualizado em um treino específico. */
export interface WorkoutComment {
  id: WorkoutCommentId;
  workoutDayId: WorkoutDayId;
  authorId: UserId;
  text: string;
  createdAt: IsoDateTime;
}
