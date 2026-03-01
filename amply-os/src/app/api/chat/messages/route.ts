// src/app/api/chat/messages/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

type Body = {
  sessionId?: unknown;
  mode?: unknown;
  role?: unknown;
  text?: unknown;
  limit?: unknown;
};

type Role = "user" | "assistant";

type ApiMsg = {
  id: string;
  sessionId: string;
  role: Role;
  text: string;
  ts: number; // epoch ms
};

function safeString(v: unknown, fallback = "") {
  return typeof v === "string" ? v : fallback;
}

function safeMode(v: unknown) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "student";
  return s || "student";
}

function safeRole(v: unknown): Role {
  const r = typeof v === "string" ? v.trim().toLowerCase() : "user";
  return r === "assistant" ? "assistant" : "user";
}

function safeLimit(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return 50;
  return Math.max(1, Math.min(200, n));
}

async function getOrCreateSession(mode: string) {
  let session = await prisma.chatSession.findFirst({
    where: { mode },
    orderBy: { updatedAt: "desc" },
  });

  if (!session) {
    session = await prisma.chatSession.create({ data: { mode } });
  }

  return session;
}

function toApiMsg(m: {
  id: string;
  sessionId: string;
  role: string;
  text: string;
  ts: number;
}): ApiMsg {
  return {
    id: m.id,
    sessionId: m.sessionId,
    role: m.role === "assistant" ? "assistant" : "user",
    text: m.text,
    ts: Number(m.ts) || 0,
  };
}

// GET: list messages for a session or mode
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionIdQ = url.searchParams.get("sessionId");
    const mode = safeMode(url.searchParams.get("mode") || "student");
    const limit = safeLimit(url.searchParams.get("limit"));

    const session = sessionIdQ
      ? await prisma.chatSession.findUnique({ where: { id: sessionIdQ } })
      : await getOrCreateSession(mode);

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const dbMessages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { ts: "asc" }, // ts is Int epoch
      take: limit,
      select: { id: true, sessionId: true, role: true, text: true, ts: true },
    });

    const messages = dbMessages.map(toApiMsg);

    return NextResponse.json({ ok: true, sessionId: session.id, messages });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// POST: add a message
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;

    const mode = safeMode(body.mode);
    const role = safeRole(body.role);
    const text = safeString(body.text).trim();
    let sessionId = safeString(body.sessionId).trim();

    if (!text) {
      return NextResponse.json(
        { ok: false, error: "Missing text" },
        { status: 400 }
      );
    }

    let session = sessionId
      ? await prisma.chatSession.findUnique({ where: { id: sessionId } })
      : null;

    if (!session) {
      session = await getOrCreateSession(mode);
      sessionId = session.id;
    }

    const now = Date.now();

    const created = await prisma.chatMessage.create({
      data: {
        sessionId,
        role,     // stored as string in DB
        text,
        ts: now,  // ✅ Int epoch ms
      },
      select: { id: true, sessionId: true, role: true, text: true, ts: true },
    });

    // bump updatedAt (no-op update is fine; Prisma will set @updatedAt)
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, sessionId, message: toApiMsg(created) });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
