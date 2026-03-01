import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const unreadOnly = body?.unreadOnly === true; // optional

    const now = new Date();

    const updated = await prisma.notification.updateMany({
      where: unreadOnly ? { readAt: null } : {},
      data: { readAt: now },
    });

    return NextResponse.json({
      ok: true,
      updated: updated.count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
