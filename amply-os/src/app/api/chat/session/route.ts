// src/app/api/chat/session/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

function safeMode(v: unknown) {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "student";
  return s || "student";
}

type Body = {
  mode?: unknown;
  sessionId?: unknown;
};

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mode = safeMode(url.searchParams.get("mode") || "student");

    let session = await prisma.chatSession.findFirst({
      where: { mode },
      orderBy: { updatedAt: "desc" },
      select: { id: true, mode: true, title: true, createdAt: true, updatedAt: true },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: { mode },
        select: { id: true, mode: true, title: true, createdAt: true, updatedAt: true },
      });
    }

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const mode = safeMode(body.mode);

    const session = await prisma.chatSession.create({
      data: { mode },
      select: { id: true, mode: true, title: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, session });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
