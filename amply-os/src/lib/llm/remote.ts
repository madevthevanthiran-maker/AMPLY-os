// src/lib/llm/remote.ts

import type { LlmGenerateParams, LlmGenerateResult } from "@/lib/llm/types";

const BASE_URL = process.env.REMOTE_LLM_BASE_URL || "https://api.openai.com/v1";
const API_KEY = process.env.REMOTE_LLM_API_KEY || "";
const MODEL = process.env.REMOTE_LLM_MODEL || "gpt-4o-mini";

export async function generateRemote(
  params: LlmGenerateParams
): Promise<LlmGenerateResult> {
  if (!API_KEY) {
    throw new Error("REMOTE_LLM_API_KEY is missing");
  }

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 500,
    }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Remote LLM failed: ${res.status} ${t}`.trim());
  }

  const json = (await res.json()) as any;
  const text =
    json?.choices?.[0]?.message?.content &&
    typeof json.choices[0].message.content === "string"
      ? json.choices[0].message.content
      : "";

  return {
    text: text.trim(),
    provider: "remote",
    model: MODEL,
    usage: json?.usage,
  };
}
