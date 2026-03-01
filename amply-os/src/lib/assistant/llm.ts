// src/lib/assistant/llm.ts
export type LLMMessage = { role: "system" | "user" | "assistant"; content: string };

function env(name: string, fallback = "") {
  return process.env[name] || fallback;
}

function hasRemote() {
  const key = env("REMOTE_LLM_API_KEY");
  return key && key !== "YOUR_KEY";
}

export async function chatLLM(messages: LLMMessage[]) {
  // Prefer remote if configured
  if (hasRemote()) {
    const base = env("REMOTE_LLM_BASE_URL", "https://api.openai.com/v1");
    const model = env("REMOTE_LLM_MODEL", "gpt-4o-mini");
    const key = env("REMOTE_LLM_API_KEY");

    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.6,
      }),
    });

    const json = await res.json().catch(() => ({}));
    const text =
      json?.choices?.[0]?.message?.content ??
      json?.error?.message ??
      "No response";
    return { ok: res.ok, text };
  }

  // Fallback: Ollama
  const ollamaBase = env("OLLAMA_BASE_URL", "http://127.0.0.1:11434");
  const model = env("OLLAMA_MODEL", "llama3.1:8b");

  const res = await fetch(`${ollamaBase}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.6 },
    }),
  });

  const json = await res.json().catch(() => ({}));
  const text = json?.message?.content ?? "No response";
  return { ok: res.ok, text };
}
