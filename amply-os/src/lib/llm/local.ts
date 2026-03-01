// src/lib/llm/local.ts

import type { LlmGenerateParams, LlmGenerateResult } from "@/lib/llm/types";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.1:8b";

function toPrompt(messages: { role: string; content: string }[]) {
  // Simple chat prompt; local models vary, but this works decently.
  return messages
    .map((m) => {
      if (m.role === "system") return `SYSTEM:\n${m.content}`;
      if (m.role === "user") return `USER:\n${m.content}`;
      return `ASSISTANT:\n${m.content}`;
    })
    .join("\n\n");
}

export async function generateLocal(
  params: LlmGenerateParams
): Promise<LlmGenerateResult> {
  const prompt = toPrompt(params.messages);

  const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: params.temperature ?? 0.4,
        num_predict: params.maxTokens ?? 400,
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Local LLM failed: ${res.status} ${t}`.trim());
  }

  const json = (await res.json()) as any;
  const text = typeof json?.response === "string" ? json.response : "";

  return {
    text: text.trim(),
    provider: "local",
    model: OLLAMA_MODEL,
    usage: json?.eval_count ? { eval_count: json.eval_count } : undefined,
  };
}
