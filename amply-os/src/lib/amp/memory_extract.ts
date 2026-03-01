// src/lib/amp/memory_extract.ts
import { generateHybrid } from "@/lib/llm/router";

export type MemoryCandidate = {
  type: "goal" | "preference" | "fact";
  key: string;
  value: string;
  confidence: number; // 0..1
};

const SYSTEM = `You are AMP's memory extractor.
Extract ONLY durable user information worth remembering long-term.
Rules:
- Be conservative. If unsure, return [].
- Don't store sensitive personal data (health, religion, politics, sexuality, exact address).
- Store: stable preferences, recurring goals, identity the user states, long-term plans.
- Keep values short (max 120 chars).
Return STRICT JSON array of objects:
[{ "type":"goal|preference|fact", "key":"...", "value":"...", "confidence":0.0-1.0 }]
No extra text.`;

export async function extractMemoryCandidates(params: {
  userText: string;
  mode: string;
}): Promise<MemoryCandidate[]> {
  const userText = params.userText.trim();
  if (!userText) return [];

  // Don't waste tokens on tiny messages
  if (userText.length < 8) return [];

  const out = await generateHybrid(
    {
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Mode: ${params.mode}\nUser message: ${userText}`,
        },
      ],
      temperature: 0,
      maxTokens: 220,
    },
    { userTextHint: userText, prefer: "remote" } // extractor should be reliable
  );

  try {
    const parsed = JSON.parse(out.text);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((x) => ({
        type: x?.type,
        key: typeof x?.key === "string" ? x.key.trim() : "",
        value: typeof x?.value === "string" ? x.value.trim() : "",
        confidence: Number(x?.confidence ?? 0),
      }))
      .filter(
        (m) =>
          (m.type === "goal" || m.type === "preference" || m.type === "fact") &&
          m.key &&
          m.value &&
          m.value.length <= 120 &&
          m.confidence >= 0.75
      );
  } catch {
    return [];
  }
}
