// src/lib/llm/router.ts

import type { LlmGenerateParams, LlmGenerateResult } from "@/lib/llm/types";
import { generateLocal } from "@/lib/llm/local";
import { generateRemote } from "@/lib/llm/remote";

function looksComplex(userText: string) {
  const t = userText.toLowerCase();
  if (userText.length > 800) return true;
  if (t.includes("write an essay") || t.includes("long form") || t.includes("policy")) return true;
  if (t.includes("code") && userText.length > 400) return true;
  if (t.includes("analyze") || t.includes("compare") || t.includes("debate")) return true;
  return false;
}

export async function generateHybrid(
  params: LlmGenerateParams,
  opts?: { prefer?: "local" | "remote"; userTextHint?: string }
): Promise<LlmGenerateResult> {
  const userText = opts?.userTextHint || params.messages.find(m => m.role === "user")?.content || "";
  const prefer = opts?.prefer;

  const shouldGoRemote = prefer === "remote" || looksComplex(userText);

  if (shouldGoRemote) {
    // remote first, fallback local
    try {
      return await generateRemote(params);
    } catch {
      return await generateLocal(params);
    }
  }

  // local first, fallback remote
  try {
    return await generateLocal(params);
  } catch {
    return await generateRemote(params);
  }
}
