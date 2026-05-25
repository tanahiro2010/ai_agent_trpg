import type { PlayerState } from "../../state/player-state.ts";
import type { SkillCheckAction } from "../../types/actions.ts";
import { resolveSkillCheck } from "../dice/dice-engine.ts";
import type { DiceResult } from "../../protocols/result.ts";

export function resolvePlayerSkillCheck(
  player: PlayerState,
  action: SkillCheckAction,
): DiceResult {
  const skillValue = player.skills[action.skill] ?? 25;
  return resolveSkillCheck({
    skillValue,
    skillName: action.skill,
  });
}
