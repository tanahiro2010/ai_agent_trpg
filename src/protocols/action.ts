import { z } from "zod";

export const skillCheckActionSchema = z.object({
  type: z.literal("skill_check"),
  skill: z.string().min(1),
  target: z.string().min(1),
  reason: z.string().min(1),
});

export const speakActionSchema = z.object({
  type: z.literal("speak"),
  target: z.string().min(1),
  message: z.string().min(1),
  reason: z.string().min(1),
});

export const moveActionSchema = z.object({
  type: z.literal("move"),
  location: z.string().min(1),
  reason: z.string().min(1),
});

export const waitActionSchema = z.object({
  type: z.literal("wait"),
  reason: z.string().min(1),
});

export const playerActionSchema = z.discriminatedUnion("type", [
  skillCheckActionSchema,
  speakActionSchema,
  moveActionSchema,
  waitActionSchema,
]);

export type PlayerActionInput = z.infer<typeof playerActionSchema>;
