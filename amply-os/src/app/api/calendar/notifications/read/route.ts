import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNotifBus } from "@/lib/notifyBus";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { ok: false, error: "ids[] is required" },
        { status: 400 }
      );
    }

    const now = new Date();

    const updated = await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { readAt: now },
    });

    // Emit SSE event
    const bus = getNotifBus();
    bus.emit("read", { ids });

    return NextResponse.json({ ok: true, updated: updated.count });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
