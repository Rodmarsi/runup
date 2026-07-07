import { z } from "zod";

export const inviteSchema = z.object({
  studentEmail: z.string().email(),
});

export const upgradeSchema = z.object({
  tier: z.enum(["free", "pro", "elite"]),
});

export type InviteInput = z.infer<typeof inviteSchema>;
export type UpgradeInput = z.infer<typeof upgradeSchema>;
