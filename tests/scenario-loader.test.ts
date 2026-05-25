import { describe, expect, it } from "vitest";
import { getPublicScenarioExcerpt } from "../src/scenario/loader.ts";

describe("getPublicScenarioExcerpt", () => {
  it("uses full text when no GM memo section (pixiv-style paste)", () => {
    const content = `古書店の囁き

雨の夜。あなたは古書店を訪れる。
店主がカウンターから顔を上げる。`;

    const excerpt = getPublicScenarioExcerpt(content, 6000);
    expect(excerpt).toContain("古書店の囁き");
    expect(excerpt).toContain("雨の夜");
    expect(excerpt).not.toContain("GMメモ");
  });

  it("strips GM memo section when present", () => {
    const content = `シナリオ本文

## 公開情報
店の名前は夜鶴堂

## GMメモ
犯人は佐藤です`;

    const excerpt = getPublicScenarioExcerpt(content);
    expect(excerpt).toContain("夜鶴堂");
    expect(excerpt).not.toContain("犯人は佐藤");
  });
});
