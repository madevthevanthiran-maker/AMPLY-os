// src/lib/llm/types.ts

export type LlmRole = "system" | "user" | "assistant";

export type LlmMessage = {
  role: LlmRole;
  content: string;
};

export type LlmGenerateParams = {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type LlmGenerateResult = {
  text: string;
  provider: "local" | "remote";
  model?: string;
  usage?: any;
};
