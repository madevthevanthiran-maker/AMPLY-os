// lib/assistant/memory.ts
// Memory layer (v1) for AMPlyAI OS.
//
// This is intentionally conservative:
// - It provides a stable interface now
// - Uses an in-memory store by default (no schema assumptions)
// - Can be swapped to Prisma later without changing callers
//
// Next step (when you’re ready):
// - add Prisma models (MemoryItem, Conversation, Message, etc.)
// - implement PrismaMemoryStore

export type MemoryType = "goal" | "preference" | "fact" | "recent_action";

export type MemoryItem = {
  id: string;
  type: MemoryType;
  key: string;
  value: string;
  confidence?: number; // 0..1
  updatedAt: string; // ISO
};

export type MemoryWrite = {
  type: MemoryType;
  key: string;
  value: string;
  confidence?: number;
};

export type MemoryQuery = {
  types?: MemoryType[];
  keys?: string[]; // exact match keys
  text?: string; // keyword match across key/value
  limit?: number;
};

export interface MemoryStore {
  getRelevant(query: MemoryQuery): Promise<MemoryItem[]>;
  upsert(write: MemoryWrite): Promise<MemoryItem>;
  bulkUpsert(writes: MemoryWrite[]): Promise<MemoryItem[]>;
}

/**
 * In-memory store (safe default).
 * NOTE: This resets on server restart (fine for v1 scaffolding).
 */
class InMemoryMemoryStore implements MemoryStore {
  private items: MemoryItem[] = [];

  private mkId() {
    return `mem_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }

  async getRelevant(query: MemoryQuery): Promise<MemoryItem[]> {
    const limit = query.limit ?? 10;
    const types = query.types;
    const keys = query.keys;
    const text = (query.text ?? "").trim().toLowerCase();

    let res = [...this.items];

    if (types?.length) {
      const set = new Set(types);
      res = res.filter((i) => set.has(i.type));
    }

    if (keys?.length) {
      const set = new Set(keys);
      res = res.filter((i) => set.has(i.key));
    }

    if (text) {
      res = res.filter((i) => {
        const hay = `${i.key} ${i.value}`.toLowerCase();
        return hay.includes(text);
      });
    }

    // Simple scoring: confidence + recency
    res.sort((a, b) => {
      const ca = a.confidence ?? 0.6;
      const cb = b.confidence ?? 0.6;
      if (cb !== ca) return cb - ca;
      return b.updatedAt.localeCompare(a.updatedAt);
    });

    return res.slice(0, limit);
  }

  async upsert(write: MemoryWrite): Promise<MemoryItem> {
    const now = new Date().toISOString();

    const existing = this.items.find(
      (i) => i.type === write.type && i.key === write.key
    );

    if (existing) {
      existing.value = write.value;
      existing.confidence = write.confidence ?? existing.confidence ?? 0.7;
      existing.updatedAt = now;
      return existing;
    }

    const item: MemoryItem = {
      id: this.mkId(),
      type: write.type,
      key: write.key,
      value: write.value,
      confidence: write.confidence ?? 0.7,
      updatedAt: now,
    };

    this.items.unshift(item);
    return item;
  }

  async bulkUpsert(writes: MemoryWrite[]): Promise<MemoryItem[]> {
    const out: MemoryItem[] = [];
    for (const w of writes) out.push(await this.upsert(w));
    return out;
  }
}

// Singleton store instance (v1)
let store: MemoryStore | null = null;

export function getMemoryStore(): MemoryStore {
  if (!store) store = new InMemoryMemoryStore();
  return store;
}
