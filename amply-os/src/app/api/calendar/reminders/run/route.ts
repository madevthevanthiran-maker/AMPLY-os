import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 200);

  const now = new Date();

  const due = await prisma.reminder.findMany({
    where: {
      sentAt: null,
      remindAt: { lte: now },
    },
    orderBy: { remindAt: "asc" },
    take: limit,
  });

  let created = 0;

  for (const r of due) {
    const ev = await prisma.calendarEvent.findUnique({ where: { id: r.eventId } });
    if (!ev) {
      // event deleted, just mark reminder as sent so it doesn't loop forever
      await prisma.reminder.update({
        where: { id: r.id },
        data: { sentAt: now },
      });
      continue;
    }

    await prisma.notification.create({
      data: {
        eventId: ev.id,
        reminderId: r.id,
        title: `Reminder: ${ev.title}`,
        body: ev.description ?? null,
      },
    });

    await prisma.reminder.update({
      where: { id: r.id },
      data: { sentAt: now },
    });

    created++;
  }

  return NextResponse.json({ ok: true, ran: due.length, created });
}
