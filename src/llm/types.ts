export type AgentRole = "gm" | "pl";

export type LLMMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LLMRequest = {
  messages: LLMMessage[];
  agent: AgentRole;
  temperature?: number;
};

export type LLMResponse = {
  text: string;
  raw: string;
};

export interface LLMProvider {
  readonly name: string;
  complete(request: LLMRequest): Promise<LLMResponse>;
}
