// src/lib/amp/memory.ts
import prisma from "@/lib/prisma";

export type MemoryWrite = {
  type: "goal" | "preference" | "fact";
  key: string;
  value: string;
};

type ReadParams = { mode: string; limit?: number };
type WriteParams = { mode: string };

const norm = (s: string) => s.trim().toLowerCase();

/** Canonicalize to prevent “same concept, different key” duplicates */
function canonicalize(w: MemoryWrite): MemoryWrite | null {
  const type = w.type;
  const keyRaw = String(w.key || "").trim();
  const valRaw = String(w.value || "").trim();
  if (!keyRaw || !valRaw) return null;

  const k = norm(keyRaw);
  const v = norm(valRaw);

  // Preferences: collapse to answer_length
  if (type === "preference") {
    if (k === "preference" || k.includes("answer") || k.includes("length") || v.includes("short")) {
      return { type, key: "answer_length", value: v.includes("short") ? "short" : valRaw };
    }
  }

  // Goals: collapse to one AmplyOS goal
  if (type === "goal") {
    if (k === "goal" || k.includes("amplyos") || k.includes("global")) {
      return { type, key: "amplyos_goal", value: valRaw };
    }
  }

  return { type, key: keyRaw, value: valRaw };
}

export async function readAmpMemory(params: ReadParams) {
  const mode = params.mode || "student";
  const limit = Math.min(params.limit ?? 20, 100);

  const rows = await prisma.ampMemory.findMany({
    where: { mode },
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  const snippets = rows.map((r) => {
    const label = r.type === "preference" ? "Pref" : r.type === "goal" ? "Goal" : "Fact";
    return `${label} • ${r.key}: ${r.value}`;
  });

  return { ok: true as const, rows, snippets };
}

export async function writeAmpMemory(writes: MemoryWrite[], params: WriteParams) {
  const mode = params.mode || "student";
  if (!Array.isArray(writes) || writes.length === 0) return { ok: true as const, written: 0 };

  let written = 0;

  for (const w of writes) {
    const canon = canonicalize(w);
    if (!canon) continue;

    // ✅ Safe “upsert” without relying on composite-unique input name
    const existing = await prisma.ampMemory.findFirst({
      where: { mode, type: canon.type, key: canon.key },
      select: { id: true, value: true },
    });

    if (existing) {
      if (existing.value !== canon.value) {
        await prisma.ampMemory.update({
          where: { id: existing.id },
          data: { value: canon.value },
        });
      }
    } else {
      await prisma.ampMemory.create({
        data: {
          mode,
          type: canon.type,
          key: canon.key,
          value: canon.value,
        },
      });
    }

    written += 1;
  }

  return { ok: true as const, written };
}
