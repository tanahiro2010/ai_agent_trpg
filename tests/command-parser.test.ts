import { describe, expect, it } from "vitest";
import { parseActionFromText } from "../src/parser/command-parser.ts";

describe("parseActionFromText", () => {
  it("parses skill_check action block", () => {
    const text = `[action]
type: skill_check
skill: spot_hidden
target: bookshelf
reason: 本棚を調べる
[/action]`;

    const action = parseActionFromText(text);
    expect(action).toEqual({
      type: "skill_check",
      skill: "spot_hidden",
      target: "bookshelf",
      reason: "本棚を調べる",
    });
  });

  it("returns null for natural language only", () => {
    expect(parseActionFromText("本棚を調べます")).toBeNull();
  });

  it("parses shorthand inline move action with branchId", () => {
    const text = `[action]
move location=page-3

branchId: page-2-to-page-3
[/action]`;

    const action = parseActionFromText(text);
    expect(action).toEqual({
      type: "move",
      location: "page-3",
      reason: "移動する",
      branchId: "page-2-to-page-3",
    });
  });
});
