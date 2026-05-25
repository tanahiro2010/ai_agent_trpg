import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { parseScenarioPages, getPage } from "../src/scenario/page-parser.ts";
import { resolveNextPageId } from "../src/scenario/navigator.ts";
import type { RawScenario } from "../src/types/scenario.ts";

async function loadTestScenario(): Promise<RawScenario> {
  const content = await readFile("scenarios/test.txt", "utf8");
  return { title: "test", path: "scenarios/test.txt", content };
}

describe("parseScenarioPages (test.txt)", () => {
  it("parses pages and start at page-2", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    expect(parsed.startPageId).toBe("page-2");
    const p2 = getPage(parsed, "page-2");
    expect(p2?.branches.some((b) => b.targetPageId === "page-3")).toBe(true);
    expect(p2?.branches.some((b) => b.targetPageId === "page-4")).toBe(true);
    expect(p2?.branches.some((b) => b.branchId === "page-2-to-page-3")).toBe(true);
  });

  it("resolves by branchId before reading action text", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    const p3 = getPage(parsed, "page-3");
    expect(p3).toBeDefined();
    const next = resolveNextPageId(p3!, {
      type: "speak",
      branchId: "page-3-to-page-6",
      target: "npc",
      message: "natural text without expected keywords",
      reason: "selected by branch id",
    });
    expect(next).toBe("page-6");
  });

  it("does not fall back to keyword matching when branchId is invalid", async () => {
    const parsed = parseScenarioPages(await loadTestScenario());
    const p3 = getPage(parsed, "page-3");
    expect(p3).toBeDefined();
    const next = resolveNextPageId(p3!, {
      type: "speak",
      branchId: "missing-branch",
      target: "蟆大･ｳ",
      message: "遘√◆縺｡縺ｯ謨ｵ縺倥ｃ縺ｪ縺・りｩｱ繧定◇縺九○縺ｦ",
      reason: "蜿句･ｽ",
    });
    expect(next).toBeNull();
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
