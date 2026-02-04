import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);
  const unreadOnly = searchParams.get("unreadOnly") === "1";

  const notifications = await prisma.notification.findMany({
    where: unreadOnly ? { readAt: null } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return NextResponse.json({ ok: true, notifications });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, title, body: msgBody, reminderId } = body ?? {};

    if (!eventId || !title) {
      return NextResponse.json(
        { ok: false, error: "eventId and title are required" },
        { status: 400 }
      );
    }

    // Ensure event exists
    const ev = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!ev) {
      return NextResponse.json({ ok: false, error: "Event not found" }, { status: 404 });
    }

    // If reminderId provided, validate it belongs to same event
    if (reminderId) {
      const rem = await prisma.reminder.findUnique({ where: { id: reminderId } });
      if (!rem || rem.eventId !== eventId) {
        return NextResponse.json(
          { ok: false, error: "Invalid reminderId for this event" },
          { status: 400 }
        );
      }
    }

    const notification = await prisma.notification.create({
      data: {
        eventId,
        reminderId: reminderId ?? null,
        title,
        body: msgBody ?? null,
      },
    });

    return NextResponse.json({ ok: true, notification });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
