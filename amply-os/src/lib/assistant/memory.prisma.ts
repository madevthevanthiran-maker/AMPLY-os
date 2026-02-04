// src/lib/assistant/memory.prisma.ts
import { prisma } from "@/lib/db/prisma";
import type {
  MemoryItem,
  MemoryQuery,
  MemoryStore,
  MemoryWrite,
  MemoryType,
} from "@/lib/assistant/memory";

function toMemoryItem(row: any): MemoryItem {
  return {
    id: row.id,
    type: row.type as MemoryType,
    key: row.key,
    value: row.value,
    confidence: row.confidence ?? 0.7,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export class PrismaMemoryStore implements MemoryStore {
  constructor(private userId: string) {}

  async getRelevant(query: MemoryQuery): Promise<MemoryItem[]> {
    const limit = query.limit ?? 10;
    const text = (query.text ?? "").trim().toLowerCase();

    const rows = await prisma.userMemoryItem.findMany({
      where: {
        userId: this.userId,
        ...(query.types?.length ? { type: { in: query.types } } : {}),
        ...(query.keys?.length ? { key: { in: query.keys } } : {}),
        ...(text
          ? {
              OR: [
                { key: { contains: text } },
                { value: { contains: text } },
              ],
            }
          : {}),
      },
      orderBy: [{ confidence: "desc" }, { updatedAt: "desc" }],
      take: limit,
    });

    return rows.map(toMemoryItem);
  }

  async upsert(write: MemoryWrite): Promise<MemoryItem> {
    const row = await prisma.userMemoryItem.upsert({
      where: {
        userId_type_key: {
          userId: this.userId,
          type: write.type,
          key: write.key,
        },
      },
      update: {
        value: write.value,
        confidence: write.confidence ?? 0.7,
      },
      create: {
        userId: this.userId,
        type: write.type,
        key: write.key,
        value: write.value,
        confidence: write.confidence ?? 0.7,
      },
    });

    return toMemoryItem(row);
  }

  async bulkUpsert(writes: MemoryWrite[]): Promise<MemoryItem[]> {
    const out: MemoryItem[] = [];
    for (const w of writes) out.push(await this.upsert(w));
    return out;
  }
}
