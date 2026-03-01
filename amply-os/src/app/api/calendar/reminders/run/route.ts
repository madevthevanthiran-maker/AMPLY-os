import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNotifBus } from "@/lib/notifyBus";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // --- CRON AUTH (query param) ---
    const secret = url.searchParams.get("secret");
    const envSecret = process.env.CRON_SECRET;

    if (envSecret && secret !== envSecret) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const limit = Math.min(Number(url.searchParams.get("limit") || "20"), 200);
    const now = new Date();

    const due = await prisma.reminder.findMany({
      where: {
        sentAt: null,
        remindAt: { lte: now },
      },
      include: { event: true },
      orderBy: { remindAt: "asc" },
      take: limit,
    });

    if (due.length === 0) {
      return NextResponse.json({ ok: true, ran: 0, created: 0 });
    }

    const bus = getNotifBus();

    const result = await prisma.$transaction(async (tx) => {
      let created = 0;

      for (const r of due) {
        if (!r.event) {
          // event missing: mark reminder sent to avoid infinite loop
          await tx.reminder.update({ where: { id: r.id }, data: { sentAt: now } });
          continue;
        }

        // Prevent duplicates WITHOUT schema changes:
        // if a notif already exists for this reminder, mark sent + skip create.
        const existing = await tx.notification.findFirst({
          where: { reminderId: r.id },
          select: { id: true },
        });

        if (existing) {
          await tx.reminder.update({ where: { id: r.id }, data: { sentAt: now } });
          continue;
        }

        const notif = await tx.notification.create({
          data: {
            eventId: r.eventId,
            reminderId: r.id,
            title: "Reminder",
            body: `${r.event.title} is coming up (${new Date(r.event.startTime).toLocaleString()})`,
            channel: "in_app",
          },
        });

        await tx.reminder.update({
          where: { id: r.id },
          data: { sentAt: now },
        });

        created++;

        // Emit SSE event (post-create)
        bus.emit("new", {
          notificationId: notif.id,
          eventId: notif.eventId,
          reminderId: notif.reminderId,
        });
      }

      return { ran: due.length, created };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
