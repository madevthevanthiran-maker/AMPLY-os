import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

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

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { ok: false, error: "startTime/endTime must be valid ISO dates" },
        { status: 400 }
      );
    }

    if (end.getTime() <= start.getTime()) {
      return NextResponse.json(
        { ok: false, error: "endTime must be after startTime" },
        { status: 400 }
      );
    }

    const event = await prisma.calendarEvent.create({
      data: {
        title: String(title),
        description: description ? String(description) : null,
        startTime: start,
        endTime: end,
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

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "50"), 200);
    const upcomingOnly = url.searchParams.get("upcomingOnly") === "1";

    const now = new Date();

    const events = await prisma.calendarEvent.findMany({
      where: upcomingOnly ? { endTime: { gte: now } } : undefined,
      orderBy: { startTime: "asc" },
      take: limit,
      include: {
        reminders: {
          orderBy: { remindAt: "asc" },
          select: { id: true, remindAt: true, sentAt: true },
        },
      },
    });

    return NextResponse.json({ ok: true, events });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
