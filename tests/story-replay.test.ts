import { describe, expect, it } from "vitest";
import { formatStoryFromEntries } from "../src/cli/story-replay.ts";
import type { LogEntry } from "../src/utils/logger.ts";

describe("formatStoryFromEntries", () => {
  it("renders turns in player-friendly order without raw logs", () => {
    const entries: LogEntry[] = [
      {
        level: "info",
        category: "session",
        message: "start",
        data: { title: "テスト卓" },
        timestamp: 1,
      },
      {
        level: "info",
        category: "pl",
        message: "PL行動",
        data: {
          turn: 1,
          action: {
            type: "speak",
            target: "店主",
            message: "こんにちは",
            reason: "挨拶",
          },
        },
        timestamp: 2,
      },
      {
        level: "info",
        category: "dice",
        message: "ダイス判定",
        data: {
          turn: 1,
          roll: 30,
          target: 50,
          success: true,
          critical: false,
          fumble: false,
          skill: "spot_hidden",
        },
        timestamp: 3,
      },
      {
        level: "info",
        category: "gm",
        message: "GM描写",
        data: { turn: 1, text: "店主が微笑んだ。「いらっしゃい。」" },
        timestamp: 4,
      },
      {
        level: "info",
        category: "progress",
        message: "シナリオ進行",
        data: {
          turn: 1,
          location: "書店",
          phase: "dialog",
          clues: ["手紙"],
        },
        timestamp: 5,
      },
      {
        level: "info",
        category: "ai-raw",
        message: "should not appear",
        data: { raw: "secret" },
        timestamp: 6,
      },
    ];

    const story = formatStoryFromEntries(entries);
    expect(story).toContain("テスト卓");
    expect(story).toContain("第1幕");
    expect(story).toContain("「こんにちは」");
    expect(story).toContain("出目 30");
    expect(story).toContain("成功");
    expect(story).toContain("店主が微笑んだ");
    expect(story).toContain("手紙");
    expect(story).not.toContain("should not appear");
    expect(story).not.toContain("ai-raw");
  });
});
