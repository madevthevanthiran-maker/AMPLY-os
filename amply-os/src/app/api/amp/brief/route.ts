import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || "5"), 50);

    const notifications = await prisma.notification.findMany({
      where: { readAt: null },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { event: true },
    });

    const count = await prisma.notification.count({
      where: { readAt: null },
    });

    // Build a short deterministic brief (no LLM yet)
    const lines = notifications.map((n) => {
      const title = n.title || "Notification";
      const evt = (n as any).event?.title ? ` · ${n.event?.title}` : "";
      return `• ${title}${evt}`;
    });

    const text =
      count === 0
        ? "All clear. No unread alerts."
        : `You have ${count} unread alert${count === 1 ? "" : "s"}.\n\n${lines.join(
            "\n"
          )}`;

    return NextResponse.json({
      ok: true,
      unreadCount: count,
      text,
      notifications,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
