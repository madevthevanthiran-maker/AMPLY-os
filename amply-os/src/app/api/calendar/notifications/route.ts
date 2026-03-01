// src/app/api/calendar/notifications/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/calendar/notifications?limit=5&unreadOnly=1
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const limitRaw = url.searchParams.get("limit");
    const unreadOnlyRaw = url.searchParams.get("unreadOnly");

    const limitNum = limitRaw ? Number(limitRaw) : 10;
    const limit = Number.isFinite(limitNum) ? Math.max(1, Math.min(50, limitNum)) : 10;

    const unreadOnly =
      unreadOnlyRaw === "1" ||
      unreadOnlyRaw === "true" ||
      unreadOnlyRaw === "yes";

    const notifications = await prisma.notification.findMany({
      where: unreadOnly ? { readAt: null } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        body: true,
        channel: true,
        createdAt: true,
        readAt: true,
        eventId: true,
        reminderId: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { readAt: null },
    });

    return NextResponse.json({ ok: true, unreadCount, notifications });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}

// PATCH /api/calendar/notifications  { ids?: string[] }  -> mark read
export async function PATCH(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body?.ids)
      ? body.ids.filter((x: any) => typeof x === "string")
      : [];

    if (ids.length === 0) {
      await prisma.notification.updateMany({
        where: { readAt: null },
        data: { readAt: new Date() },
      });
    } else {
      await prisma.notification.updateMany({
        where: { id: { in: ids } },
        data: { readAt: new Date() },
      });
    }

    const unreadCount = await prisma.notification.count({
      where: { readAt: null },
    });

    return NextResponse.json({ ok: true, unreadCount });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
