// src/app/api/assistant/stream/route.ts
import { NextResponse } from "next/server";
import { runAssistant } from "@/lib/assistant/orchestrator";
import { readAmpMemory, writeAmpMemory } from "@/lib/amp/memory";
import { ASSISTANT_NAME } from "@/lib/assistant/constants";

export const runtime = "nodejs";

type Role = "user" | "assistant";
type HistoryItem = { role: Role; text: string };

type Body = {
  message?: unknown;
  mode?: unknown;
  history?: unknown;
};

type AmpBrief = {
  ok: boolean;
  unreadCount?: number;
  text?: string;
};

function safeString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function normalizeMode(raw: string) {
  const m = raw.trim().toLowerCase();
  return m || "student";
}

function normalizeHistory(raw: unknown): HistoryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((m) => {
      const roleRaw = (m as any)?.role;
      const textRaw = (m as any)?.text;

      const role: Role =
        roleRaw === "assistant" || roleRaw === "user" ? roleRaw : "user";

      const text = safeString(textRaw).trim();
      if (!text) return null;

      return { role, text };
    })
    .filter((x): x is HistoryItem => Boolean(x))
    .slice(-24);
}

function chunkText(text: string, size = 22) {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out;
}

async function getAmpBrief(req: Request) {
  const res = await fetch(new URL("/api/amp/brief", req.url), { cache: "no-store" });
  return (await res.json()) as AmpBrief;
}

function buildAugmentedMessage({
  userMessage,
  briefText,
  memorySnippets,
  history,
  mode,
}: {
  userMessage: string;
  briefText?: string;
  memorySnippets?: string[];
  history?: HistoryItem[];
  mode: string;
}) {
  const blocks: string[] = [];

  blocks.push(
    [
      "### AMP SYSTEM",
      `You are ${ASSISTANT_NAME}, the embedded assistant inside AMPLY OS.`,
      `Mode: ${mode}`,
      "Be concise. Ask at most ONE follow-up question unless needed.",
      "If the user asks what you remember, summarize stored memory in plain English.",
      "### END SYSTEM",
    ].join("\n")
  );

  if (briefText) {
    blocks.push(["### AMP BRIEF", briefText, "### END BRIEF"].join("\n"));
  }

  if (memorySnippets?.length) {
    blocks.push(
      [
        "### AMP MEMORY",
        memorySnippets.map((m) => `- ${m}`).join("\n"),
        "### END MEMORY",
      ].join("\n")
    );
  }

  if (history?.length) {
    const last = history.slice(-16);
    blocks.push(
      [
        "### AMP CHAT HISTORY",
        last.map((m) => `${m.role.toUpperCase()}: ${m.text}`).join("\n"),
        "### END HISTORY",
      ].join("\n")
    );
  }

  blocks.push(["### USER", userMessage].join("\n"));
  return blocks.join("\n\n");
}

export async function POST(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: string) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
      };

      try {
        const body = (await req.json().catch(() => ({}))) as Body;

        const userMessage = safeString(body.message).trim();
        const mode = normalizeMode(safeString(body.mode, "student"));
        const history = normalizeHistory(body.history);

        if (!userMessage) {
          send("done", JSON.stringify({ ok: false, error: "Missing message" }));
          controller.close();
          return;
        }

        // pull brief + memory
        const brief = await getAmpBrief(req).catch(() => null);
        const mem = await readAmpMemory({ mode }).catch(() => ({ snippets: [] as string[] }));

        const augmented = buildAugmentedMessage({
          userMessage,
          briefText: brief?.text,
          memorySnippets: mem.snippets,
          history,
          mode,
        });

        // run brain
        const result = await runAssistant({ message: augmented, mode });

        if (result.memoryWrites?.length) {
          await writeAmpMemory(result.memoryWrites, { mode });
        }

        const text =
          (typeof result?.assistant?.text === "string" && result.assistant.text.trim()) ||
          "AMP: empty response.";

        send("meta", JSON.stringify({ ok: true }));

        for (const c of chunkText(text, 22)) {
          if (req.signal.aborted) break;
          send("chunk", c.replace(/\n/g, "\\n"));
          await new Promise((r) => setTimeout(r, 12));
        }

        if (!req.signal.aborted) {
          send(
            "done",
            JSON.stringify({
              ok: true,
              text,
              raw: result,
            })
          );
        }

        controller.close();
      } catch (err: any) {
        // IMPORTANT: still respond as SSE so UI shows the real error, not “stream failed”
        const msg = String(err?.message || "Unknown error");
        controller.enqueue(encoder.encode(`event: done\ndata: ${JSON.stringify({ ok: false, error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
