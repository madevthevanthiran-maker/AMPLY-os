// src/app/api/assistant/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type HistoryMsg = { role: "user" | "assistant"; text: string };

type Body = {
  message?: unknown;
  mode?: unknown;
  history?: unknown;
  apiKey?: unknown; // optional override (local only)
};

function safeString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function safeMode(v: unknown) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "student";
  return s || "student";
}

function safeHistory(v: unknown): HistoryMsg[] {
  if (!Array.isArray(v)) return [];
  const out: HistoryMsg[] = [];
  for (const item of v) {
    const role = (item as any)?.role;
    const text = (item as any)?.text;
    if ((role === "user" || role === "assistant") && typeof text === "string") {
      out.push({ role, text });
    }
  }
  return out.slice(-30);
}

function isMemoryQuestion(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes("what do you rmb") ||
    t.includes("what do you remember") ||
    t.includes("what u remember") ||
    t.includes("what do you know about me") ||
    t.includes("what do u know about me")
  );
}

/** ChatGPT-ish memory formatting (no ugly keys) */
function formatMemoriesForPrompt(
  rows: Array<{ type: string; key: string; value: string; pinned: boolean }>
) {
  if (!rows.length) return "No saved memories yet.";

  const grouped: Record<
    string,
    Array<{ key: string; value: string; pinned: boolean }>
  > = {};

  for (const r of rows) {
    (grouped[r.type] ||= []).push({
      key: r.key,
      value: r.value,
      pinned: r.pinned,
    });
  }

  const lines: string[] = [];
  const order = ["goal", "preference", "fact"];

  for (const type of order) {
    const items = grouped[type];
    if (!items?.length) continue;

    const title =
      type === "goal"
        ? "Goals"
        : type === "preference"
        ? "Preferences"
        : "Facts";

    lines.push(`${title}:`);

    // Dedup by value so you don’t repeat the same thing twice
    const seen = new Set<string>();
    for (const it of items) {
      const v = (it.value || "").trim();
      if (!v || seen.has(v)) continue;
      seen.add(v);

      const pin = it.pinned ? "📌 " : "";
      lines.push(`- ${pin}${v}`);
    }

    lines.push("");
  }

  return lines.join("\n").trim();
}

async function getMemories(mode: string) {
  return prisma.ampMemory.findMany({
    where: { mode },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    take: 40,
    select: { type: true, key: true, value: true, pinned: true },
  });
}

function buildSystemPrompt(mode: string, memoryBlock: string) {
  const modeLine =
    mode === "student"
      ? "You are AMP, a helpful assistant for a student."
      : `You are AMP, a helpful assistant in mode: ${mode}.`;

  return [
    modeLine,
    "Be clear, concise, and practical.",
    "If the user asks what you remember, summarize saved memories naturally (no internal keys).",
    memoryBlock ? `\nSaved memory:\n${memoryBlock}\n` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Uses OpenAI Responses API via fetch (no SDK required).
 * Requires OPENAI_API_KEY in env, or body.apiKey override.
 */
async function callModel(opts: {
  apiKey: string;
  model: string;
  system: string;
  history: HistoryMsg[];
  user: string;
}) {
  const { apiKey, model, system, history, user } = opts;

  // Keep it simple: one "input" string containing system + short history + user.
  const transcript = [
    `SYSTEM:\n${system}`,
    ...(history.length
      ? [
          "\nRECENT CHAT:",
          ...history.map((m) => `${m.role.toUpperCase()}: ${m.text}`),
        ]
      : []),
    `\nUSER: ${user}`,
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: transcript,
    }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.message ||
      `Model request failed (${res.status}).`;
    throw new Error(msg);
  }

  // Responses API commonly returns output_text
  const text =
    typeof json?.output_text === "string"
      ? json.output_text
      : typeof json?.output?.[0]?.content?.[0]?.text === "string"
      ? json.output[0].content[0].text
      : "";

  return { text: text || "AMP: empty response.", raw: json };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const message = safeString(body.message).trim();
    const mode = safeMode(body.mode);
    const history = safeHistory(body.history);

    if (!message) {
      return NextResponse.json(
        { ok: false, error: "Missing message" },
        { status: 400 }
      );
    }

    const memories = await getMemories(mode);

    // If user explicitly asks what AMP remembers, answer from DB (no model call needed).
    if (isMemoryQuestion(message)) {
      const text = memories.length
        ? `Here’s what I remember (mode: ${mode}):\n\n${formatMemoriesForPrompt(
            memories
          )}`
        : `I don’t have any saved memories yet (mode: ${mode}).`;

      return NextResponse.json({
        ok: true,
        assistant: { text },
        meta: { mode, memoryCount: memories.length },
      });
    }

    const memoryBlock = memories.length ? formatMemoriesForPrompt(memories) : "";
    const system = buildSystemPrompt(mode, memoryBlock);

    const apiKey =
      safeString(body.apiKey).trim() || process.env.OPENAI_API_KEY || "";
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Missing credentials. Please set OPENAI_API_KEY (or pass apiKey in body).",
        },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const result = await callModel({
      apiKey,
      model,
      system,
      history,
      user: message,
    });

    return NextResponse.json({
      ok: true,
      assistant: { text: result.text },
      meta: { mode, memoryCount: memories.length },
      raw: result.raw, // keep if you want debug; remove later
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
