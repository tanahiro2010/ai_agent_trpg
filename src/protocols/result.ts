import { z } from "zod";

export const diceResultSchema = z.object({
  roll: z.number().int().min(1).max(100),
  target: z.number().int().min(1).max(100),
  success: z.boolean(),
  critical: z.boolean(),
  fumble: z.boolean(),
  skill: z.string().optional(),
});

export type DiceResult = z.infer<typeof diceResultSchema>;

export function formatDiceResult(result: DiceResult): string {
  return [
    "[result]",
    `roll: ${result.roll}`,
    `target: ${result.target}`,
    `success: ${result.success}`,
    `critical: ${result.critical}`,
    `fumble: ${result.fumble}`,
    "[/result]",
  ].join("\n");
}
