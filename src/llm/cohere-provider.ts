import { getOptionalEnv, getRequiredEnv } from "../config/env.ts";
import { log } from "../utils/logger.ts";
import type { LLMMessage, LLMProvider, LLMRequest, LLMResponse } from "./types.ts";

const COHERE_CHAT_URL = "https://api.cohere.com/v2/chat";
const DEFAULT_MODEL = "command-r-plus-08-2024";

export type CohereConfig = {
  apiKey: string;
  model?: string;
  maxTokens?: number;
};

type CohereContentPart = {
  type?: string;
  text?: string;
};

type CohereChatResponse = {
  message?: {
    content?: CohereContentPart[];
  };
  finish_reason?: string;
};

export function extractTextFromCohereResponse(body: CohereChatResponse): string {
  const parts = body.message?.content ?? [];
  const texts = parts
    .filter((p) => p.type === "text" || p.text !== undefined)
    .map((p) => p.text ?? "")
    .filter((t) => t.length > 0);
  return texts.join("").trim();
}

export class CohereLLMProvider implements LLMProvider {
  readonly name = "cohere";

  constructor(private readonly config: CohereConfig) {}

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new Error(
        "Cohere API key is not configured. Set COHERE_API_KEY in .env or use --mock.",
      );
    }

    const model = this.config.model ?? DEFAULT_MODEL;
    const temperature = request.temperature ?? (request.agent === "pl" ? 0.4 : 0.75);

    const body = {
      model,
      messages: request.messages.map((m) => toCohereMessage(m)),
      temperature,
      max_tokens: this.config.maxTokens ?? 2048,
      stream: false,
    };

    log("cohere", "request", {
      agent: request.agent,
      model,
      messageCount: request.messages.length,
    });

    const response = await fetch(COHERE_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();

    if (!response.ok) {
      log("cohere", "API error", { status: response.status, raw }, "error");
      throw new Error(
        `Cohere API error (${response.status}): ${raw.slice(0, 500)}`,
      );
    }

    let parsed: CohereChatResponse;
    try {
      parsed = JSON.parse(raw) as CohereChatResponse;
    } catch {
      throw new Error(`Cohere returned invalid JSON: ${raw.slice(0, 200)}`);
    }

    const text = extractTextFromCohereResponse(parsed);
    if (!text) {
      throw new Error("Cohere returned empty text content");
    }

    return { text, raw };
  }
}

function toCohereMessage(message: LLMMessage): { role: string; content: string } {
  return { role: message.role, content: message.content };
}

export function createCohereProviderFromEnv(): CohereLLMProvider {
  const apiKey = process.env.COHERE_API_KEY?.trim() ?? "";
  const model = getOptionalEnv("COHERE_MODEL", DEFAULT_MODEL);
  const maxTokens = Number.parseInt(
    getOptionalEnv("COHERE_MAX_TOKENS", "2048"),
    10,
  );

  return new CohereLLMProvider({
    apiKey,
    model,
    maxTokens: Number.isFinite(maxTokens) ? maxTokens : 2048,
  });
}

/** .env 必須キーを検証してプロバイダを生成 */
export function createCohereProviderFromEnvStrict(): CohereLLMProvider {
  const apiKey = getRequiredEnv("COHERE_API_KEY");
  const model = getOptionalEnv("COHERE_MODEL", DEFAULT_MODEL);
  return new CohereLLMProvider({ apiKey, model });
}
