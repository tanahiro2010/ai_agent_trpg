import { describe, expect, it } from "vitest";
import { extractTextFromCohereResponse } from "../src/llm/cohere-provider.ts";

describe("extractTextFromCohereResponse", () => {
  it("extracts text from v2 chat response", () => {
    const body = {
      message: {
        content: [{ type: "text", text: "雨の夜、古書店の扉がきしむ。" }],
      },
    };
    expect(extractTextFromCohereResponse(body)).toBe("雨の夜、古書店の扉がきしむ。");
  });

  it("joins multiple text parts", () => {
    const body = {
      message: {
        content: [
          { type: "text", text: "「ようこそ。」" },
          { type: "text", text: "店主が微笑んだ。" },
        ],
      },
    };
    expect(extractTextFromCohereResponse(body)).toBe("「ようこそ。」店主が微笑んだ。");
  });
});
