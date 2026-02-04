import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, remindAt } = body ?? {};

    if (!eventId || !remindAt) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: eventId, remindAt" },
        { status: 400 }
      );
    }

    // Ensure event exists
    const event = await prisma.calendarEvent.findUnique({
      where: { id: String(eventId) },
      select: { id: true },
    });

    if (!event) {
      return NextResponse.json(
        { ok: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const reminder = await prisma.reminder.create({
      data: {
        eventId: String(eventId),
        remindAt: new Date(remindAt),
      },
      include: { event: true },
    });

    return NextResponse.json({ ok: true, reminder });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const reminders = await prisma.reminder.findMany({
      orderBy: { remindAt: "asc" },
      include: { event: true },
    });

    return NextResponse.json({ ok: true, reminders });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
