import type { DiceResult } from "../../protocols/result.ts";

export type RollInput = {
  skillValue: number;
  skillName?: string;
};

function rollD100(): number {
  return Math.floor(Math.random() * 100) + 1;
}

export function resolveSkillCheck(input: RollInput): DiceResult {
  const target = Math.min(100, Math.max(1, Math.floor(input.skillValue)));
  const roll = rollD100();
  const criticalThreshold = Math.max(1, Math.floor(target / 5));
  const critical = roll <= criticalThreshold;
  const fumble = roll >= 96;
  const success = critical || (roll <= target && !fumble);

  return {
    roll,
    target,
    success,
    critical,
    fumble,
    skill: input.skillName,
  };
}
