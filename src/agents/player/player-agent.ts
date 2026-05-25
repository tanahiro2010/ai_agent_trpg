import type { LLMProvider } from "../../llm/types.ts";
import {
  buildPlayerSystemPrompt,
  buildPlayerUserPrompt,
  type PlayerPromptContext,
} from "../../prompts/player.ts";
import { parseAndValidateAction } from "../../parser/command-parser.ts";
import type { PlayerAction } from "../../types/actions.ts";
import { log } from "../../utils/logger.ts";
import { withRetry } from "../../utils/retry.ts";

const MAX_PARSE_RETRIES = 3;

export class PlayerAgent {
  constructor(private readonly llm: LLMProvider) {}

  async decideAction(ctx: PlayerPromptContext): Promise<PlayerAction> {
    const system = buildPlayerSystemPrompt();
    let user = buildPlayerUserPrompt(ctx);

    for (let attempt = 1; attempt <= MAX_PARSE_RETRIES; attempt++) {
      const response = await withRetry(
        () =>
          this.llm.complete({
            agent: "pl",
            temperature: 0.35,
            messages: [
              { role: "system", content: system },
              { role: "user", content: user },
            ],
          }),
        { maxAttempts: 2, delayMs: 100 },
      );

      log("ai-raw", `PL response (attempt ${attempt})`, { raw: response.raw });

      const action = parseAndValidateAction(response.text);
      if (action) {
        log("parsed-action", "PL action validated", { action });
        return action;
      }

      log("parser", `parse failed, retry ${attempt}/${MAX_PARSE_RETRIES}`, undefined, "warn");
      user = [
        buildPlayerUserPrompt(ctx),
        "",
        "前回の出力は不正でした。必ず [action]...[/action] 形式で再出力してください。",
      ].join("\n");
    }

    throw new Error("PL agent failed to produce a valid structured action");
  }
}
