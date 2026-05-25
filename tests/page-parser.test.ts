import { describe, expect, it } from "vitest";
import { parseScenarioPages, getPage } from "../src/scenario/page-parser.ts";
import { resolveNextPageId } from "../src/scenario/navigator.ts";
import type { RawScenario } from "../src/types/scenario.ts";

async function loadTestScenario(): Promise<RawScenario> {
  const content = await Bun.file("scenarios/test.txt").text();
  return { title: "test", path: "scenarios/test.txt", content };
}

describe("parseScenarioPages (test.txt)", () => {
  it("parses pages and start at page-2", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    expect(parsed.startPageId).toBe("page-2");
    const p2 = getPage(parsed, "page-2");
    expect(p2?.branches.some((b) => b.targetPageId === "page-3")).toBe(true);
    expect(p2?.branches.some((b) => b.targetPageId === "page-4")).toBe(true);
  });

  it("resolves friendly speak to page-6 from page-3", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    const p3 = getPage(parsed, "page-3");
    expect(p3).toBeDefined();
    const next = resolveNextPageId(p3!, {
      type: "speak",
      target: "少女",
      message: "私たちは敵じゃない。話を聞かせて",
      reason: "友好",
    });
    expect(next).toBe("page-6");
  });

  it("resolves move into door to page-3 from page-2", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    const p2 = getPage(parsed, "page-2");
    const next = resolveNextPageId(p2!, {
      type: "move",
      location: "扉の中",
      reason: "入る",
    });
    expect(next).toBe("page-3");
  });
});
