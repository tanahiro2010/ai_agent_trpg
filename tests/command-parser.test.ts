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
});
