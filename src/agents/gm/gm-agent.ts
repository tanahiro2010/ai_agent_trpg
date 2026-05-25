import type { LLMProvider } from "../../llm/types.ts";
import { buildGMSystemPrompt, buildGMUserPrompt, type GMPromptContext } from "../../prompts/gm.ts";
import { log } from "../../utils/logger.ts";
import { withRetry } from "../../utils/retry.ts";

export class GMAgent {
  constructor(private readonly llm: LLMProvider) {}

  async narrate(ctx: GMPromptContext): Promise<string> {
    const system = buildGMSystemPrompt();
    const user = buildGMUserPrompt(ctx);

    const messages: Array<{ role: "system" | "user"; content: string }> = [
      { role: "system", content: system },
      { role: "user", content: user },
    ];

    const response = await withRetry(
      () =>
        this.llm.complete({
          agent: "gm",
          temperature: 0.8,
          messages,
        }),
      { maxAttempts: 3, delayMs: 200 },
    );

    log("ai-raw", "GM response", { raw: response.raw });
    return response.text;
  }
}
