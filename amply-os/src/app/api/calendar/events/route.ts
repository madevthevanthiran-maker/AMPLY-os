import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, startTime, endTime } = body ?? {};

    if (!title || !startTime || !endTime) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields: title, startTime, endTime" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
    });

    return NextResponse.json({ ok: true, event });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { startTime: "asc" },
      include: { reminders: true },
    });

    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
