import { describe, expect, it } from "vitest";
import { resolveSkillCheck } from "../src/rules/dice/dice-engine.ts";

describe("resolveSkillCheck", () => {
  it("returns valid dice result shape", () => {
    const result = resolveSkillCheck({ skillValue: 50, skillName: "spot_hidden" });
    expect(result.roll).toBeGreaterThanOrEqual(1);
    expect(result.roll).toBeLessThanOrEqual(100);
    expect(result.target).toBe(50);
    expect(typeof result.success).toBe("boolean");
    expect(typeof result.critical).toBe("boolean");
    expect(typeof result.fumble).toBe("boolean");
  });
});
